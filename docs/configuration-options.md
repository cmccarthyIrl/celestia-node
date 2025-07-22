# Configuration Options

This document provides a comprehensive guide to all configuration options available in the Celestia Deployment Framework.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Configuration Files](#configuration-files)
- [Azure DevOps Variables](#azure-devops-variables)
- [Runtime Configuration](#runtime-configuration)
- [Network Configuration](#network-configuration)
- [Security Configuration](#security-configuration)

## Environment Variables

All configuration is managed through environment variables. Create a `.env` file in your project root or set these variables in your deployment environment.

### Remote Server Configuration

#### `REMOTE_HOST` (Required)
- **Description**: IP address or hostname of the target server
- **Type**: String
- **Example**: `192.168.1.100` or `my-server.example.com`
- **Default**: None

#### `REMOTE_USER` (Required)
- **Description**: Username for SSH connection to remote server
- **Type**: String
- **Example**: `ubuntu`, `centos`, `root`
- **Default**: None

#### `SSH_KEY_PATH` (Required)
- **Description**: Path to SSH private key file for authentication
- **Type**: String (file path)
- **Example**: `./keys/id_rsa.pem`, `/home/user/.ssh/id_rsa`
- **Default**: None
- **Notes**: File must have restricted permissions (600)

### Celestia Node Configuration

#### `CELESTIA_USER`
- **Description**: System user to run the Celestia node process
- **Type**: String
- **Example**: `celestia`, `node-runner`
- **Default**: `celestia`

#### `CELESTIA_NETWORK`
- **Description**: Celestia network to connect to
- **Type**: String
- **Options**:
  - `mocha-4` (Testnet)
  - `arabica-11` (Devnet)
  - `private` (Private network)
- **Example**: `mocha-4`
- **Default**: `mocha-4`

#### `CELESTIA_VERSION`
- **Description**: Version of Celestia node binary to install
- **Type**: String (semantic version)
- **Example**: `v0.23.3-mocha`, `v0.24.0`
- **Default**: `v0.23.3-mocha`
- **Notes**: Must match available releases from Celestia GitHub

#### `NODE_TYPE`
- **Description**: Type of Celestia node to deploy
- **Type**: String
- **Options**:
  - `light` (Light node - recommended)
  - `full` (Full node)
  - `bridge` (Bridge node)
- **Example**: `light`
- **Default**: `light`

#### `CELESTIA_HOME`
- **Description**: Home directory for Celestia node data and configuration
- **Type**: String (directory path)
- **Example**: `/home/celestia/.celestia-light`
- **Default**: `/home/${CELESTIA_USER}/.celestia-light`

### Network and Port Configuration

#### `RPC_PORT`
- **Description**: Port for Celestia node RPC server
- **Type**: Number
- **Range**: 1024-65535
- **Example**: `26658`
- **Default**: `26658`

#### `GATEWAY_PORT`
- **Description**: Port for Celestia node gateway server
- **Type**: Number
- **Range**: 1024-65535
- **Example**: `26659`
- **Default**: `26659`

#### `P2P_PORT`
- **Description**: Port for peer-to-peer communications
- **Type**: Number
- **Range**: 1024-65535
- **Example**: `2121`
- **Default**: `2121`

#### `PROMETHEUS_PORT`
- **Description**: Port for Prometheus metrics endpoint
- **Type**: Number
- **Range**: 1024-65535
- **Example**: `9090`
- **Default**: `9090`

### Logging and Debug Configuration

#### `LOG_LEVEL`
- **Description**: Logging verbosity level
- **Type**: String
- **Options**:
  - `error` (Errors only)
  - `warn` (Warnings and errors)
  - `info` (General information)
  - `debug` (Detailed debugging)
  - `trace` (Most verbose)
- **Example**: `info`
- **Default**: `info`

#### `ENABLE_DEBUG`
- **Description**: Enable debug mode for additional logging and diagnostics
- **Type**: Boolean
- **Values**: `true`, `false`
- **Example**: `false`
- **Default**: `false`

#### `LOG_FILE_PATH`
- **Description**: Path to log file for Celestia node output
- **Type**: String (file path)
- **Example**: `/home/celestia/celestia-light.log`
- **Default**: `/home/${CELESTIA_USER}/celestia-light.log`

### Deployment and Operation Settings

#### `CREATE_BACKUP`
- **Description**: Create backups before major operations
- **Type**: Boolean
- **Values**: `true`, `false`
- **Example**: `true`
- **Default**: `true`

#### `BACKUP_DIR`
- **Description**: Directory to store backup files
- **Type**: String (directory path)
- **Example**: `/backup/celestia`
- **Default**: `/tmp/celestia-backup`

#### `DEPLOYMENT_TIMEOUT`
- **Description**: Timeout for deployment operations (in milliseconds)
- **Type**: Number
- **Example**: `600000` (10 minutes)
- **Default**: `300000` (5 minutes)

#### `RETRY_ATTEMPTS`
- **Description**: Number of retry attempts for failed operations
- **Type**: Number
- **Range**: 0-10
- **Example**: `3`
- **Default**: `3`

#### `RETRY_DELAY`
- **Description**: Delay between retry attempts (in milliseconds)
- **Type**: Number
- **Example**: `5000` (5 seconds)
- **Default**: `2000` (2 seconds)

### Connection Pool Configuration

#### `POOL_NAME`
- **Description**: Name identifier for SSH connection pool
- **Type**: String
- **Example**: `celestia-deployment`
- **Default**: `default`

#### `MAX_POOL_SIZE`
- **Description**: Maximum number of concurrent SSH connections
- **Type**: Number
- **Range**: 1-20
- **Example**: `5`
- **Default**: `3`

#### `POOL_IDLE_TIMEOUT`
- **Description**: Time to keep idle connections alive (in milliseconds)
- **Type**: Number
- **Example**: `300000` (5 minutes)
- **Default**: `60000` (1 minute)

## Configuration Files

### Environment-Specific Configuration

Create separate `.env` files for different environments:

#### Development Configuration (`.env.development`)
```bash
# Development environment settings
CELESTIA_NETWORK=private
LOG_LEVEL=debug
ENABLE_DEBUG=true
CREATE_BACKUP=false
RETRY_ATTEMPTS=1
DEPLOYMENT_TIMEOUT=120000
```

#### Staging Configuration (`.env.staging`)
```bash
# Staging environment settings
CELESTIA_NETWORK=arabica-11
LOG_LEVEL=info
ENABLE_DEBUG=false
CREATE_BACKUP=true
RETRY_ATTEMPTS=2
DEPLOYMENT_TIMEOUT=300000
```

#### Production Configuration (`.env.production`)
```bash
# Production environment settings
CELESTIA_NETWORK=mocha-4
LOG_LEVEL=warn
ENABLE_DEBUG=false
CREATE_BACKUP=true
RETRY_ATTEMPTS=3
DEPLOYMENT_TIMEOUT=600000
MAX_POOL_SIZE=5
```

### TypeScript Configuration (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test-results"]
}
```

### Playwright Configuration (playwright.config.ts)

Key configuration options for testing:

```typescript
export default defineConfig({
  testDir: './src/tests',
  timeout: 600000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  projects: [
    {
      name: 'pipeline',
      testMatch: '**/*.spec.ts',
      timeout: 600000,
    },
  ],
});
```

## Azure DevOps Variables

Configure these variables in your Azure DevOps variable group named `celestial-lightning-variable-group`:

### Required Variables

| Variable | Description | Type | Example |
|----------|-------------|------|---------|
| `VM_IP_ADDRESS` | Target server IP address | String | `192.168.1.100` |
| `VM_USER` | SSH username | String | `ubuntu` |
| `SSH_KEY_FILE` | SSH key filename | String | `id_rsa.pem` |

### Optional Variables

| Variable | Description | Type | Default |
|----------|-------------|------|---------|
| `CELESTIA_NETWORK` | Celestia network | String | `mocha-4` |
| `LOG_LEVEL` | Logging level | String | `info` |
| `DEPLOYMENT_TIMEOUT` | Deployment timeout (ms) | Number | `300000` |
| `ENABLE_CLEANUP` | Enable post-deployment cleanup | Boolean | `true` |

### Secure Variables

Mark these as secure in Azure DevOps:

| Variable | Description |
|----------|-------------|
| `SSH_PRIVATE_KEY` | SSH private key content |
| `WALLET_MNEMONIC` | Wallet recovery phrase (if needed) |

## Runtime Configuration

### Command Line Arguments

The framework supports command-line configuration overrides:

```typescript
import { Command } from 'commander';

const program = new Command();

program
  .option('-h, --host <host>', 'Remote host address')
  .option('-u, --user <user>', 'Remote username')
  .option('-k, --key <path>', 'SSH key path')
  .option('-n, --network <network>', 'Celestia network')
  .option('--debug', 'Enable debug mode')
  .parse();
```

### Configuration Validation

The framework validates configuration on startup:

```typescript
import Joi from 'joi';

const configSchema = Joi.object({
  REMOTE_HOST: Joi.string().ip().required(),
  REMOTE_USER: Joi.string().alphanum().min(1).required(),
  SSH_KEY_PATH: Joi.string().required(),
  CELESTIA_NETWORK: Joi.string().valid('mocha-4', 'arabica-11', 'private'),
  RPC_PORT: Joi.number().port().default(26658),
  GATEWAY_PORT: Joi.number().port().default(26659),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug', 'trace'),
});
```

## Network Configuration

### Firewall Rules

Required firewall configuration for the remote server:

```bash
# SSH access
sudo ufw allow ssh

# Celestia node ports
sudo ufw allow ${RPC_PORT}/tcp      # RPC server
sudo ufw allow ${GATEWAY_PORT}/tcp  # Gateway server
sudo ufw allow ${P2P_PORT}/tcp      # P2P communications

# Monitoring (optional)
sudo ufw allow ${PROMETHEUS_PORT}/tcp  # Metrics
```

### Network Interface Binding

Configure which interfaces the node listens on:

```bash
# Environment variables for network binding
LISTEN_ADDRESS=0.0.0.0              # Listen on all interfaces
RPC_BIND_ADDRESS=127.0.0.1          # RPC only on localhost
GATEWAY_BIND_ADDRESS=0.0.0.0        # Gateway on all interfaces
```

### Proxy Configuration

If deploying behind a proxy:

```bash
# Proxy settings
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1,*.local
```

## Security Configuration

### SSH Configuration

Recommended SSH client configuration in `~/.ssh/config`:

```
Host celestia-node
    HostName your-server-ip
    User ubuntu
    IdentityFile ~/.ssh/id_rsa.pem
    StrictHostKeyChecking yes
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

### File Permissions

Critical file permissions:

```bash
# SSH private key
chmod 600 keys/id_rsa.pem

# Environment files
chmod 600 .env*

# Configuration directories
chmod 755 config/
chmod 644 config/*.env
```

### Service User Configuration

Configure the Celestia service user:

```bash
# Create dedicated user
sudo useradd -r -s /bin/false celestia-node

# Set up directories
sudo mkdir -p /home/celestia-node/.celestia-light
sudo chown -R celestia-node:celestia-node /home/celestia-node/

# Restrict permissions
sudo chmod 750 /home/celestia-node/
sudo chmod 700 /home/celestia-node/.celestia-light
```

## Configuration Examples

### Complete Production Configuration

```bash
# .env.production

# Server Configuration
REMOTE_HOST=production-server.example.com
REMOTE_USER=ubuntu
SSH_KEY_PATH=/secure/keys/production.pem

# Node Configuration
CELESTIA_USER=celestia
CELESTIA_NETWORK=mocha-4
CELESTIA_VERSION=v0.23.3-mocha
NODE_TYPE=light

# Network Configuration
RPC_PORT=26658
GATEWAY_PORT=26659
P2P_PORT=2121
PROMETHEUS_PORT=9090

# Security
ENABLE_DEBUG=false
LOG_LEVEL=warn
CREATE_BACKUP=true

# Performance
MAX_POOL_SIZE=5
DEPLOYMENT_TIMEOUT=600000
RETRY_ATTEMPTS=3
RETRY_DELAY=5000

# Monitoring
LOG_FILE_PATH=/var/log/celestia/node.log
BACKUP_DIR=/backup/celestia
```

### CI/CD Pipeline Configuration

```yaml
# pipeline/variables/production.yml
variables:
  CELESTIA_NETWORK: 'mocha-4'
  LOG_LEVEL: 'info'
  ENABLE_DEBUG: 'false'
  CREATE_BACKUP: 'true'
  DEPLOYMENT_TIMEOUT: '600000'
  MAX_RETRY_ATTEMPTS: '3'
```

This configuration guide provides comprehensive coverage of all available options. For specific deployment scenarios, refer to the [deployment guide](deployment-guide.md) or [troubleshooting guide](troubleshooting.md).
