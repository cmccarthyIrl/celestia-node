export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

export interface LoggerConfig {
  level?: LogLevel;
  enableTimestamps?: boolean;
  enableColors?: boolean;
  enableFileLogging?: boolean;
  logFile?: string;
  maxLineLength?: number;
  context?: string;
}

export type LogMetadata =
  | Record<string, unknown>
  | Error
  | string
  | number
  | boolean
  | unknown
  | null
  | undefined;

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: LogMetadata;
}

export class Logger {
  private static globalConfig: Required<LoggerConfig> = {
    level: LogLevel.INFO,
    enableTimestamps: true,
    enableColors: true,
    enableFileLogging: false,
    logFile: 'application.log',
    maxLineLength: 200,
    context: 'APP',
  };

  private static logBuffer: LogEntry[] = [];
  private static fs: any = null;
  private static initialized = false;

  private context: string;

  constructor(context: string = 'APP') {
    this.context = context;
    // Auto-initialize on first use
    if (!Logger.initialized) {
      Logger.initializeFromEnvironment();
    }
  }

  /**
   * Initialize logger configuration from environment variables
   */
  private static initializeFromEnvironment(): void {
    Logger.initialized = true;

    // Configure from environment variables
    const envConfig: Partial<LoggerConfig> = {};

    // Set log level from environment
    if (process.env.LOG_LEVEL) {
      const level = LogLevel[process.env.LOG_LEVEL as keyof typeof LogLevel];
      if (level !== undefined) {
        envConfig.level = level;
      }
    }

    // Set file logging from environment
    if (process.env.ENABLE_FILE_LOGGING === 'true') {
      envConfig.enableFileLogging = true;
    }

    // Set custom log file from environment
    if (process.env.LOG_FILE) {
      envConfig.logFile = process.env.LOG_FILE;
    }

    // Apply environment configuration
    if (Object.keys(envConfig).length > 0) {
      Logger.configure({
        ...envConfig,
        maxLineLength: 500, // Increased for more context
        context: 'TESTNETS',
      });
    }
  }

  /**
   * Configure global logger settings
   */
  static configure(config: Partial<LoggerConfig>): void {
    Logger.globalConfig = { ...Logger.globalConfig, ...config };

    // Initialize file system if file logging is enabled
    if (Logger.globalConfig.enableFileLogging && !Logger.fs) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        Logger.fs = require('fs');
      } catch (_error) {
        console.warn('File system not available for logging');
      }
    }
  }

  /**
   * Create a logger instance for a specific context/class
   */
  static for(context: string): Logger {
    return new Logger(context);
  }

  /**
   * Normalize output to prevent line breaks and excessive whitespace
   */
  static normalizeMessage(message: string): string {
    if (typeof message !== 'string') {
      message = String(message);
    }
    return (
      message
        .trim()
        .replace(/\r\n/g, ' ') // Windows line endings
        .replace(/\r/g, ' ') // Mac line endings
        .replace(/\n/g, ' ') // Unix line endings
        .replace(/\t/g, ' ') // Tabs
        .replace(/\s+/g, ' ') // Multiple spaces
        // .replace(/[\x00-\x1F\x7F]/g, ' ') // Control characters
        .trim()
        .substring(0, Logger.globalConfig.maxLineLength)
    );
  }

  /**
   * Get color codes for console output
   */
  private static getColorCode(level: LogLevel): string {
    if (!Logger.globalConfig.enableColors) return '';

    switch (level) {
      case LogLevel.DEBUG:
        return '\x1b[36m'; // Cyan
      case LogLevel.INFO:
        return '\x1b[32m'; // Green
      case LogLevel.WARN:
        return '\x1b[33m'; // Yellow
      case LogLevel.ERROR:
        return '\x1b[31m'; // Red
      default:
        return '';
    }
  }

  /**
   * Get reset color code
   */
  private static getResetCode(): string {
    return Logger.globalConfig.enableColors ? '\x1b[0m' : '';
  }

  /**
   * Get level icon
   */
  private static getLevelIcon(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '🔍';
      case LogLevel.INFO:
        return 'ℹ️';
      case LogLevel.WARN:
        return '⚠️';
      case LogLevel.ERROR:
        return '❌';
      default:
        return '';
    }
  }

  /**
   * Get level name
   */
  private static getLevelName(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return 'DEBUG';
      case LogLevel.INFO:
        return 'INFO';
      case LogLevel.WARN:
        return 'WARN';
      case LogLevel.ERROR:
        return 'ERROR';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Format log message
   */
  private static formatMessage(entry: LogEntry): string {
    const timestamp = Logger.globalConfig.enableTimestamps
      ? `[${entry.timestamp.toISOString()}] `
      : '';

    const icon = Logger.getLevelIcon(entry.level);
    const colorCode = Logger.getColorCode(entry.level);
    const resetCode = Logger.getResetCode();
    const context = entry.context ? `[${entry.context}] ` : '';
    const message = entry.message;

    // Remove the space between icon and context
    return `${timestamp}${colorCode}${icon}${context}${message}${resetCode}`;
  }

  /**
   * Write log entry to file
   */
  private static writeToFile(entry: LogEntry): void {
    if (!Logger.globalConfig.enableFileLogging || !Logger.fs) return;

    try {
      const timestamp = entry.timestamp.toISOString();
      const level = Logger.getLevelName(entry.level);
      const context = entry.context ? `[${entry.context}] ` : '';
      const message = entry.message;
      const logLine = `${timestamp} ${level} ${context}${message}\n`;

      Logger.fs.appendFileSync(Logger.globalConfig.logFile, logLine);
    } catch (error) {
      // Silently fail if file logging fails
      console.error(
        `Failed to write log to file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, metadata?: LogMetadata): void {
    if (level < Logger.globalConfig.level) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message: Logger.normalizeMessage(message), // Ensure message is normalized
      context: this.context,
      metadata,
    };

    // Format and output to console
    const formattedMessage = Logger.formatMessage(entry);

    // Use console.log but ensure message doesn't contain extra newlines
    console.log(formattedMessage);

    // Write to file if enabled
    Logger.writeToFile(entry);

    // Store in buffer for potential retrieval
    Logger.logBuffer.push(entry);
    if (Logger.logBuffer.length > 1000) {
      Logger.logBuffer.shift(); // Keep only last 1000 entries
    }
  }

  /**
   * Debug level logging
   */
  debug(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * Info level logging
   */
  info(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * Warning level logging
   */
  warn(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * Error level logging
   */
  error(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.ERROR, message, metadata);
  }

  /**
   * Log SSH command execution
   */
  sshCommand(
    command: string,
    result?: { stdout: string; stderr: string }
  ): void {
    this.debug(`SSH Command: ${command}`);
    if (result) {
      if (result.stdout) {
        this.debug(`SSH stdout: ${Logger.normalizeMessage(result.stdout)}`);
      }
      if (result.stderr) {
        this.debug(`SSH stderr: ${Logger.normalizeMessage(result.stderr)}`);
      }
    }
  }

  /**
   * Log step execution (for test steps)
   */
  step(
    stepName: string,
    status: 'started' | 'completed' | 'failed',
    duration?: number
  ): void {
    const durationStr = duration ? ` (${duration}ms)` : '';
    const icon =
      status === 'started' ? '🔹' : status === 'completed' ? '✅' : '❌';

    this.info(`${icon} Step ${status}: ${stepName}${durationStr}`);
  }

  /**
   * Log service status
   */
  serviceStatus(
    serviceName: string,
    status: 'starting' | 'running' | 'stopped' | 'failed'
  ): void {
    const icons = {
      starting: '🔄',
      running: '✅',
      stopped: '🛑',
      failed: '❌',
    };

    this.info(`${icons[status]} ${serviceName} service is ${status}`);
  }

  /**
   * Get recent log entries
   */
  static getRecentLogs(count: number = 50): LogEntry[] {
    return Logger.logBuffer.slice(-count);
  }

  /**
   * Clear log buffer
   */
  static clearBuffer(): void {
    Logger.logBuffer = [];
  }
}
