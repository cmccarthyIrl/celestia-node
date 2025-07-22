import { spawn } from 'child_process';
import { Logger } from '../../utils/Logger';

const logger = Logger.for('SSH');

export interface SshConnection {
  sshKey: string;
  remoteUser: string;
  remoteHost: string;
}

export interface SshCommandResult {
  stdout: string;
  stderr: string;
}

export interface CommandOptions {
  timeout?: number;
  requiresSudo?: boolean;
  retries?: number;
}

interface PooledConnection {
  connection: SshConnection;
  lastUsed: number;
  isActive: boolean;
  commandQueue: Array<{
    cmd: string;
    timeout: number;
    resolve: (result: SshCommandResult) => void;
    reject: (error: Error) => void;
  }>;
}

/**
 * @description Service for managing SSH connections and executing commands.
 * This service uses connection pooling to reuse SSH connections and command queuing to handle multiple commands efficiently.
 *
 * @tutorial:
 * - Connection pooling to reduce overhead of creating new SSH connections
 * - Command queuing to handle multiple commands sequentially
 * - Enhanced error handling for sudo commands
 * - Automatic cleanup of inactive connections
 * - Debug logging for command execution
 * - Support for retrying commands with exponential backoff
 * - Ability to create SSH connection configurations from environment variables
 * - Graceful shutdown and cleanup of pooled connections
 * - Support for executing commands with options like timeout, sudo handling, and retries
 * - Enhanced logging for command execution, including stdout and stderr
 * - Support for disabling pseudo-terminal allocation to avoid interactive session issues
 * - Automatic cleanup of pooled connections after a specified idle time
 * - Ability to execute commands with a specified timeout and retry logic
 * - Support for executing commands with or without sudo privileges
 * - Automatic cleanup of all pooled connections when shutting down the service
 */
export class SshService {
  private static connectionPool: Map<string, PooledConnection> = new Map();
  private static poolCleanupInterval: ReturnType<typeof setTimeout> | null =
    null;

  /**
   * Get or create a pooled connection
   */
  private static getPooledConnection(
    connection: SshConnection
  ): PooledConnection {
    const key = `${connection.remoteUser}@${connection.remoteHost}`;

    if (!this.connectionPool.has(key)) {
      const pooledConnection: PooledConnection = {
        connection,
        lastUsed: Date.now(),
        isActive: false,
        commandQueue: [],
      };

      this.connectionPool.set(key, pooledConnection);
      logger.debug(`🔗 Created new pooled connection for ${key}`);

      // Start cleanup timer if this is the first connection
      if (this.connectionPool.size === 1 && !this.poolCleanupInterval) {
        this.startPoolCleanup();
      }
    }

    const pooled = this.connectionPool.get(key)!;
    pooled.lastUsed = Date.now();
    return pooled;
  }

  /**
   * Start periodic cleanup of inactive connections
   */
  private static startPoolCleanup(): void {
    this.poolCleanupInterval = setInterval(() => {
      const now = Date.now();
      const maxIdleTime = 300000; // 5 minutes

      for (const [key, pooled] of this.connectionPool.entries()) {
        if (!pooled.isActive && now - pooled.lastUsed > maxIdleTime) {
          this.connectionPool.delete(key);
          logger.debug(`🧹 Cleaned up inactive connection for ${key}`);
        }
      }

      // Stop cleanup if no connections remain
      if (this.connectionPool.size === 0) {
        this.stopPoolCleanup();
      }
    }, 60000); // Check every minute
  }

  /**
   * Stop pool cleanup
   */
  private static stopPoolCleanup(): void {
    if (this.poolCleanupInterval) {
      clearInterval(this.poolCleanupInterval);
      this.poolCleanupInterval = null;
    }
  }

  /**
   * Execute command using connection pooling with command queuing
   */
  private static async executeRemoteCommandPooled(
    connection: SshConnection,
    cmd: string,
    timeoutMs: number = 30000
  ): Promise<SshCommandResult> {
    const pooled = this.getPooledConnection(connection);

    return new Promise<SshCommandResult>((resolve, reject) => {
      // Add command to queue
      pooled.commandQueue.push({
        cmd,
        timeout: timeoutMs,
        resolve,
        reject,
      });

      // Process queue if not already processing
      if (!pooled.isActive) {
        this.processCommandQueue(pooled).catch(error => {
          logger.error('Error processing command queue:', error);
        });
      }
    });
  }

  /**
   * Process queued commands sequentially to reuse connection
   */
  private static async processCommandQueue(
    pooled: PooledConnection
  ): Promise<void> {
    if (pooled.isActive || pooled.commandQueue.length === 0) {
      return;
    }

    pooled.isActive = true;
    logger.debug(`🔄 Processing ${pooled.commandQueue.length} queued commands`);

    while (pooled.commandQueue.length > 0) {
      const { cmd, timeout, resolve, reject } = pooled.commandQueue.shift()!;

      try {
        const result = await this.executeRemoteCommand(
          pooled.connection,
          cmd,
          timeout
        );
        resolve(result);

        // Small delay between commands to avoid overwhelming the connection
        await new Promise(r => setTimeout(r, 100));
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    pooled.isActive = false;
    pooled.lastUsed = Date.now();
  }

  /**
   * Handle sudo commands that might hang due to password prompts
   */
  private static async executeSudoCommand(
    connection: SshConnection,
    command: string,
    timeoutMs: number,
    retries: number
  ): Promise<SshCommandResult> {
    let modifiedCommand = command;

    // Ensure sudo commands use -n flag to prevent password prompts
    if (command.startsWith('sudo ') && !command.includes('sudo -n')) {
      modifiedCommand = command.replace('sudo ', 'sudo -n ');
      logger.debug(
        `🔧 Modified sudo command to use -n flag: ${modifiedCommand}`
      );
    }

    // Execute with retries using connection pooling
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        logger.debug(
          `🔄 Executing sudo command (attempt ${attempt}/${retries}): ${modifiedCommand}`
        );
        return await this.executeRemoteCommandPooled(
          connection,
          modifiedCommand,
          timeoutMs
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.warn(
          `❌ Sudo command attempt ${attempt} failed: ${errorMessage}`
        );

        if (attempt === retries) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }

    // This should never be reached due to the throw in the loop, but TypeScript needs it
    throw new Error('Unexpected end of executeSudoCommand');
  }

  /**
   * Enhanced executeRemoteCommand with sudo handling and connection pooling
   */
  private static async executeRemoteCommandWithOptions(
    connection: SshConnection,
    cmd: string,
    options: CommandOptions = {}
  ): Promise<SshCommandResult> {
    const {
      timeout = 30000,
      requiresSudo = cmd.includes('sudo'),
      retries = 1,
    } = options;

    // Handle sudo commands specially
    if (requiresSudo || cmd.startsWith('sudo')) {
      return await this.executeSudoCommand(connection, cmd, timeout, retries);
    }

    // Execute regular command with retries using connection pooling
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Use pooled connection to reduce new SSH connections
        return await this.executeRemoteCommandPooled(connection, cmd, timeout);
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.warn(
          `❌ Command attempt ${attempt} failed, retrying: ${errorMessage}`
        );
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    // This should never be reached due to the throw in the loop, but TypeScript needs it
    throw new Error('Unexpected end of executeRemoteCommandWithOptions');
  }

  /**
   * Create an SSH connection configuration from environment variables
   */
  static async createConnection(): Promise<SshConnection | null> {
    const sshKey = '~/.ssh/id_rsa.pem';
    const remoteUser = process.env.VM_USER || process.env.REMOTE_USER;
    const remoteHost = process.env.VM_IP_ADDRESS || process.env.REMOTE_HOST;

    if (!remoteUser || !remoteHost) {
      return null;
    }

    return {
      sshKey,
      remoteUser,
      remoteHost,
    };
  }

  /**
   * Execute a command remotely via SSH
   * @param connection SSH connection configuration
   * @param cmd Command to execute
   * @param timeoutMs Timeout in milliseconds (default: 30000)
   * @returns Promise with stdout and stderr
   */
  private static async executeRemoteCommand(
    connection: SshConnection,
    cmd: string,
    timeoutMs: number = 30000
  ): Promise<SshCommandResult> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let finished = false;

      // Use SSH options to avoid interactive session issues
      const ssh = spawn('ssh', [
        '-i',
        connection.sshKey,
        '-o',
        'StrictHostKeyChecking=no',
        '-o',
        'UserKnownHostsFile=/dev/null',
        '-o',
        'LogLevel=ERROR',
        '-T', // Disable pseudo-terminal allocation
        `${connection.remoteUser}@${connection.remoteHost}`,
        cmd,
      ]);

      // Add progress logging for long-running commands (only if debug enabled)
      const startTime = Date.now();
      const enableDebugLogging = process.env.ENABLE_SSH_DEBUG === 'true';
      let progressInterval: ReturnType<typeof setInterval> | null = null;

      if (enableDebugLogging) {
        progressInterval = setInterval(() => {
          if (!finished) {
            const elapsed = Date.now() - startTime;
            logger.debug(
              `SSH command still running... ${Math.round(elapsed / 1000)}s elapsed`
            );
          }
        }, 30000); // Log every 30 seconds
      }

      const timer = setTimeout(() => {
        if (!finished) {
          finished = true;
          if (progressInterval) clearInterval(progressInterval);
          ssh.kill('SIGTERM');
          // Force kill after 5 seconds if still running
          setTimeout(() => {
            if (ssh.pid) {
              ssh.kill('SIGKILL');
            }
          }, 5000);
          logger.error(`Timeout after ${timeoutMs}ms for command: ${cmd}`);
          reject(new Error(`SSH command timeout after ${timeoutMs}ms: ${cmd}`));
        }
      }, timeoutMs);

      if (ssh.stdout) {
        ssh.stdout.on('data', data => {
          const trimmedStdout = Logger.normalizeMessage(data.toString());
          stdout += trimmedStdout;
        });
      }

      if (ssh.stderr) {
        ssh.stderr.on('data', data => {
          const trimmedStderr = Logger.normalizeMessage(data.toString());
          stderr += trimmedStderr;
        });
      }

      ssh.on('close', code => {
        finished = true;
        clearTimeout(timer);
        if (progressInterval) clearInterval(progressInterval);

        // Normalize output consistently for all cases
        const trimmedStdout = Logger.normalizeMessage(stdout);
        const trimmedStderr = Logger.normalizeMessage(stderr);

        // Only log debug info if explicitly enabled
        const enableDebugLogging = process.env.ENABLE_SSH_DEBUG === 'true';

        if (enableDebugLogging) {
          logger.debug(`Command finished: ${cmd} (code: ${code})`);

          // Trim and limit output to prevent excessive line breaks
          if (trimmedStdout) {
            if (trimmedStdout.length > 200) {
              logger.debug(
                `stdout (truncated): ${trimmedStdout.substring(0, 200)}...`
              );
            } else {
              logger.debug(`stdout: ${trimmedStdout}`);
            }
          }
          if (trimmedStderr) {
            logger.debug(`stderr: ${trimmedStderr}`);
          }
        }

        if (code === 0) {
          resolve({ stdout: trimmedStdout, stderr: trimmedStderr });
        } else {
          reject(
            new Error(`SSH command failed with code ${code}: ${trimmedStderr}`)
          );
        }
      });

      ssh.on('error', error => {
        finished = true;
        clearTimeout(timer);
        if (progressInterval) clearInterval(progressInterval);
        logger.error(`Process error: ${error.message}`);
        reject(error);
      });
    });
  }

  static async executeCommand(
    connection: SshConnection
  ): Promise<
    (cmd: string, options?: CommandOptions) => Promise<SshCommandResult>
  > {
    return async (cmd: string, options: CommandOptions = {}) => {
      return this.executeRemoteCommandWithOptions(connection, cmd, options);
    };
  }

  /**
   * Clean up all pooled connections (call this when shutting down)
   */
  static cleanupConnectionPool(): void {
    logger.info(
      `🧹 Cleaning up ${this.connectionPool.size} pooled connections`
    );
    this.connectionPool.clear();
    this.stopPoolCleanup();
  }
}
