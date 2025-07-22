# API Documentation

This document provides comprehensive API documentation for the Celestia Deployment Framework services and components.

## Table of Contents

- [Node Lifecycle Service](#node-lifecycle-service)
- [SSH Service](#ssh-service)
- [Wallet Service](#wallet-service)
- [Logger Utility](#logger-utility)
- [Environment Configuration](#environment-configuration)

## Node Lifecycle Service

The `NodeLifecycleService` is the main orchestrator for Celestia node management operations.

### Methods

#### `start(celestiaNetwork?: string): Promise<boolean>`

Starts a Celestia light node on the specified network.

**Parameters:**
- `celestiaNetwork` (optional): Network to connect to. Defaults to `CELESTIA_NETWORK` environment variable or `'mocha-4'`.

**Returns:**
- `Promise<boolean>`: `true` if the node started successfully, `false` otherwise.

**Example:**
```typescript
import { NodeLifecycleService } from './services/celestia/lifecycle/NodeLifecycleService';

// Start on default network
const started = await NodeLifecycleService.start();

// Start on specific network
const startedCustom = await NodeLifecycleService.start('arabica-11');
```

#### `stop(): Promise<boolean>`

Stops the running Celestia light node.

**Returns:**
- `Promise<boolean>`: `true` if the node stopped successfully, `false` otherwise.

**Example:**
```typescript
const stopped = await NodeLifecycleService.stop();
```

#### `status(): Promise<NodeStatus>`

Gets the current status of the node.

**Returns:**
- `Promise<NodeStatus>`: Current node status information.

#### `isCelestiaProcessesRunning(): Promise<boolean>`

Checks if any Celestia processes are currently running.

**Returns:**
- `Promise<boolean>`: `true` if Celestia processes are running, `false` otherwise.

#### `getStatus(): Promise<DetailedStatus>`

Gets detailed status information about running Celestia processes.

**Returns:**
- `Promise<DetailedStatus>`: Object containing:
  - `isRunning: boolean`: Whether the node is running
  - `processIds: string[]`: Array of running process IDs
  - `processDetails: string`: Detailed process information

**Example:**
```typescript
const status = await NodeLifecycleService.getStatus();
console.log(`Node running: ${status.isRunning}`);
console.log(`Process IDs: ${status.processIds.join(', ')}`);
```

## SSH Service

The `SshService` provides secure shell connectivity and command execution capabilities with connection pooling and error handling.

### Interfaces

#### `SshConnection`

```typescript
interface SshConnection {
  sshKey: string;      // Path to SSH private key
  remoteUser: string;  // Remote username
  remoteHost: string;  // Remote host address
}
```

#### `SshCommandResult`

```typescript
interface SshCommandResult {
  stdout: string;  // Command output
  stderr: string;  // Command error output
}
```

#### `CommandOptions`

```typescript
interface CommandOptions {
  timeout?: number;       // Command timeout in milliseconds
  requiresSudo?: boolean; // Whether command requires sudo
  retries?: number;       // Number of retry attempts
}
```

### Methods

#### `executeCommand(connection: SshConnection, command: string, options?: CommandOptions): Promise<SshCommandResult>`

Executes a command on the remote server via SSH.

**Parameters:**
- `connection`: SSH connection configuration
- `command`: Command to execute
- `options` (optional): Execution options

**Returns:**
- `Promise<SshCommandResult>`: Command execution result

**Example:**
```typescript
import { SshService } from './services/ssh/SshService';

const connection = {
  sshKey: '/path/to/key.pem',
  remoteUser: 'ubuntu',
  remoteHost: '192.168.1.100'
};

const result = await SshService.executeCommand(
  connection,
  'ls -la',
  { timeout: 30000, retries: 3 }
);

console.log('Output:', result.stdout);
```

#### `createConnectionFromEnv(): SshConnection`

Creates an SSH connection configuration from environment variables.

**Environment Variables Used:**
- `REMOTE_HOST`: Remote server IP address
- `REMOTE_USER`: Remote server username
- `SSH_KEY_PATH`: Path to SSH private key

**Returns:**
- `SshConnection`: Connection configuration

#### `cleanup(): Promise<void>`

Cleans up all pooled SSH connections.

**Example:**
```typescript
// Clean up connections before shutdown
await SshService.cleanup();
```

## Wallet Service

The `WalletService` manages Celestia wallet operations including balance checking and transaction handling.

### Methods

#### `getBalance(address: string): Promise<WalletBalance>`

Gets the balance for a specific wallet address.

**Parameters:**
- `address`: Wallet address to check

**Returns:**
- `Promise<WalletBalance>`: Balance information

**Example:**
```typescript
import { WalletService } from './services/celestia/wallet/WalletService';

const balance = await WalletService.getBalance('celestia1...');
console.log(`Balance: ${balance.amount} ${balance.denom}`);
```

## Logger Utility

The `Logger` utility provides structured logging throughout the application.

### Methods

#### `Logger.for(component: string): Logger`

Creates a logger instance for a specific component.

**Parameters:**
- `component`: Component name for log identification

**Returns:**
- `Logger`: Logger instance

#### `info(message: string, ...args: any[]): void`

Logs an informational message.

#### `error(message: string, ...args: any[]): void`

Logs an error message.

#### `warn(message: string, ...args: any[]): void`

Logs a warning message.

#### `debug(message: string, ...args: any[]): void`

Logs a debug message.

**Example:**
```typescript
import { Logger } from './utils/Logger';

const logger = Logger.for('MyComponent');

logger.info('Component initialized successfully');
logger.error('Failed to connect to service', error);
logger.debug('Processing request', { requestId: '123' });
```

## Environment Configuration

The framework uses environment variables for configuration. Create a `.env` file in the project root:

### Required Variables

```bash
# Remote Server Configuration
REMOTE_HOST=your-server-ip        # Target server IP address
REMOTE_USER=ubuntu                # SSH username
SSH_KEY_PATH=./keys/id_rsa.pem   # Path to SSH private key

# Celestia Node Configuration
CELESTIA_USER=celestia            # User to run Celestia node
CELESTIA_NETWORK=mocha-4          # Celestia network name
CELESTIA_VERSION=v0.23.3-mocha    # Celestia node version
NODE_TYPE=light                   # Node type (light/full)
```

### Optional Variables

```bash
# Network Ports
RPC_PORT=26658                    # RPC server port
GATEWAY_PORT=26659                # Gateway server port

# Deployment Settings
LOG_LEVEL=info                    # Logging level
CREATE_BACKUP=true                # Create backups before operations
ENABLE_DEBUG=false                # Enable debug mode
POOL_NAME=your-pool              # Connection pool name
```

## Error Handling

All services implement comprehensive error handling:

### Common Error Types

- **Connection Errors**: SSH connection failures, timeout issues
- **Command Errors**: Failed command execution, permission issues
- **Node Errors**: Celestia node startup/shutdown failures
- **Configuration Errors**: Invalid or missing configuration

### Error Response Format

```typescript
interface ApiError {
  message: string;
  code: string;
  details?: any;
  stack?: string;
}
```

### Example Error Handling

```typescript
try {
  const result = await NodeLifecycleService.start();
  if (!result) {
    throw new Error('Failed to start Celestia node');
  }
} catch (error) {
  logger.error('Node startup failed:', error);
  // Handle error appropriately
}
```

## Best Practices

### Connection Management

1. **Reuse Connections**: The SSH service automatically pools connections
2. **Handle Timeouts**: Always specify appropriate timeouts for long-running commands
3. **Clean Up**: Call cleanup methods before application shutdown

### Logging

1. **Use Component Loggers**: Create separate loggers for each component
2. **Log Levels**: Use appropriate log levels (debug, info, warn, error)
3. **Structured Logging**: Include relevant context in log messages

### Error Handling

1. **Catch All Errors**: Always wrap async operations in try-catch blocks
2. **Retry Logic**: Use built-in retry mechanisms for transient failures
3. **Graceful Degradation**: Handle failures gracefully without crashing

### Testing

1. **Mock Services**: Use mocks for external dependencies in unit tests
2. **Integration Tests**: Test full workflows in integration tests
3. **Error Scenarios**: Test error conditions and edge cases
