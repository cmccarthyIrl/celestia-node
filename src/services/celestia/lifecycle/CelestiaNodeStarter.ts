import * as dotenv from 'dotenv';
import { Logger } from '../../../utils/Logger';
import { CommandOptions, SshService } from '../../ssh/SshService';

dotenv.config();

const logger = Logger.for('CelestiaNodeStarter');

/**
 * Service responsible for starting Celestia light nodes
 */
export class CelestiaNodeStarter {
  /**
   * Start a Celestia light node service
   */
  static async start(
    celestiaNetwork: string = process.env.CELESTIA_NETWORK || 'mocha-4'
  ): Promise<boolean> {
    try {
      const connection = await SshService.createConnection();
      if (!connection) {
        logger.warn('Remote connection not configured, using local start');
        return false;
      }

      // Create enhanced remote executor function
      const runRemote = await SshService.executeCommand(connection);

      logger.warn(
        `🚀 Starting Celestia light node service for network: ${celestiaNetwork}`
      );

      // Check if service is already running
      if (await this.isServiceRunning(runRemote)) {
        logger.warn('⚠️ Celestia light node service is already running');
        const statusResult = await runRemote(
          'systemctl status celestia-light.service --no-pager --lines=5'
        );
        logger.info('🔍 Current service status:');
        logger.debug(statusResult.stdout);
        return true;
      }

      // Start the systemd service
      await this.startService(runRemote);

      // Wait a moment for the service to start
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify service is running
      const isRunning = await this.isServiceRunning(runRemote);
      if (isRunning) {
        logger.info('✅ Celestia light node service started successfully');
        return true;
      } else {
        logger.error('❌ Failed to start Celestia light node service');
        await this.showServiceStatus(runRemote);
        return false;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`❌ Failed to start Celestia light node: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Check if the celestia-light service is running
   */
  private static async isServiceRunning(
    runRemote: (
      cmd: string,
      options?: CommandOptions
    ) => Promise<{ stdout: string; stderr: string }>
  ): Promise<boolean> {
    try {
      const serviceStatus = await runRemote(
        'systemctl is-active celestia-light.service 2>/dev/null || echo "inactive"'
      );
      return serviceStatus.stdout.trim() === 'active';
    } catch (_error) {
      return false;
    }
  }

  /**
   * Start the celestia-light systemd service
   */
  private static async startService(
    runRemote: (
      cmd: string,
      options?: CommandOptions
    ) => Promise<{ stdout: string; stderr: string }>
  ): Promise<void> {
    logger.warn('🌟 Starting celestia-light systemd service...');

    try {
      // Start the service
      const startResult = await runRemote(
        'sudo systemctl start celestia-light.service'
      );
      logger.debug(`Service start command output: ${startResult.stdout}`);

      // Wait for service to initialize
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.warn(`⚠️ Service start command failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Show detailed service status for debugging
   */
  private static async showServiceStatus(
    runRemote: (
      cmd: string,
      options?: CommandOptions
    ) => Promise<{ stdout: string; stderr: string }>
  ): Promise<void> {
    try {
      logger.info('📋 Detailed service status:');
      const statusResult = await runRemote(
        'sudo systemctl status celestia-light.service --no-pager --lines=20'
      );
      logger.debug(statusResult.stdout);

      logger.info('📋 Recent service logs:');
      const logsResult = await runRemote(
        'sudo journalctl -u celestia-light.service --no-pager --lines=10'
      );
      logger.debug(logsResult.stdout);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.warn(`⚠️ Could not retrieve service status: ${errorMessage}`);
    }
  }
}
