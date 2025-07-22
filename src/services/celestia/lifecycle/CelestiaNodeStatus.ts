import * as dotenv from 'dotenv';
import { Logger } from '../../../utils/Logger';
import { SshService } from '../../ssh/SshService';

dotenv.config();

const logger = Logger.for('CelestiaNodeStatus');

/**
 * Service responsible for checking Celestia node status
 */
export class CelestiaNodeStatus {
  /**
   * Check if Celestia node service is running
   */
  static async isCelestiaProcessesRunning(): Promise<boolean> {
    try {
      const connection = await SshService.createConnection();
      if (!connection) {
        logger.warn('Remote connection not configured, using local check');
        return false;
      }

      // Create enhanced remote executor function with sudo handling
      const runRemote = await SshService.executeCommand(connection);

      // Check systemd service status first
      try {
        const serviceStatus = await runRemote(
          'systemctl is-active celestia-light.service 2>/dev/null || echo "inactive"',
          { timeout: 15000, retries: 2 }
        );
        if (serviceStatus.stdout.trim() === 'active') {
          logger.info('✅ Celestia light node service is active');
          return true;
        }
      } catch (_error) {
        logger.debug('Service status check failed, checking processes...');
      }

      // Fallback: Check for any celestia light processes using pgrep
      try {
        const processResult = await runRemote('pgrep -f "celestia.*light"', {
          timeout: 15000,
          retries: 2,
        });
        if (processResult.stdout.trim()) {
          logger.info(
            '✅ Found running Celestia light processes (not managed by service)'
          );
          logger.debug(`Process IDs: ${processResult.stdout}`);
          return true;
        }
      } catch (_error) {
        logger.debug('No celestia light processes found');
      }

      logger.info('❌ Celestia node is not running');
      return false;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Error checking node status: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Get detailed status information about Celestia service and processes
   */
  static async getStatus(): Promise<{
    isRunning: boolean;
    serviceStatus: string;
    processIds: string[];
    processDetails: string;
    serviceDetails: string;
  }> {
    try {
      const connection = await SshService.createConnection();
      if (!connection) {
        return {
          isRunning: false,
          serviceStatus: 'inactive',
          processIds: [],
          processDetails: 'Remote connection not configured',
          serviceDetails: 'Remote connection not configured',
        };
      }

      const runRemote = await SshService.executeCommand(connection);

      // Get service status
      let serviceStatus = 'unknown';
      let serviceDetails = '';
      try {
        const serviceStatusResult = await runRemote(
          'systemctl is-active celestia-light.service 2>/dev/null || echo "inactive"',
          { timeout: 15000, retries: 2 }
        );
        serviceStatus = serviceStatusResult.stdout.trim();

        const serviceDetailsResult = await runRemote(
          'sudo systemctl status celestia-light.service --no-pager --lines=10 2>/dev/null || echo "Service not found"',
          { timeout: 30000, requiresSudo: true, retries: 2 }
        );
        serviceDetails = serviceDetailsResult.stdout.trim();
      } catch (_error) {
        serviceDetails = 'Could not retrieve service details';
      }

      // Get process IDs
      let processIds: string[] = [];
      try {
        const processResult = await runRemote('pgrep -f "celestia.*light"', {
          timeout: 15000,
          retries: 2,
        });
        processIds = processResult.stdout
          .trim()
          .split('\n')
          .filter((pid: string) => pid.trim());
      } catch (_error) {
        // No processes found
      }

      // Get detailed process information
      let processDetails = '';
      try {
        const detailsResult = await runRemote(
          'ps aux | grep celestia | grep -v grep || true',
          { timeout: 20000, retries: 2 }
        );
        processDetails = detailsResult.stdout.trim();
      } catch (_error) {
        processDetails = 'Could not retrieve process details';
      }

      const isRunning = serviceStatus === 'active' || processIds.length > 0;

      return {
        isRunning,
        serviceStatus,
        processIds,
        processDetails,
        serviceDetails,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Error getting detailed status: ${errorMessage}`);
      return {
        isRunning: false,
        serviceStatus: 'error',
        processIds: [],
        processDetails: `Error: ${errorMessage}`,
        serviceDetails: `Error: ${errorMessage}`,
      };
    }
  }
}
