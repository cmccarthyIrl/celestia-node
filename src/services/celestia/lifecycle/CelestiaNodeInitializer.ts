import * as dotenv from 'dotenv';
import { Logger } from '../../../utils/Logger';
import { SshService } from '../../ssh/SshService';

dotenv.config();

const logger = Logger.for('CelestiaNodeInitializer');

/**
 * Service responsible for initializing Celestia light nodes
 */
export class CelestiaNodeInitializer {
  /**
   * Initialize the Celestia light node
   */
  static async initializeNode(
    targetNetwork: string = process.env.CELESTIA_NETWORK || 'mocha'
  ): Promise<boolean> {
    try {
      logger.info(
        `🚀 Initializing Celestia light node for network: ${targetNetwork}...`
      );

      const connection = await SshService.createConnection();
      if (!connection) {
        logger.warn(
          'Remote connection not configured, using local initialization'
        );
        return false; // the node is not initialized if no remote connection
      }

      // Create enhanced remote executor function
      const runRemote = await SshService.executeCommand(connection);

      try {
        // Initialize node remotely with timeout
        const celestiaBinary =
          process.env.CELESTIA_BINARY_PATH || '/usr/local/bin/celestia';
        await runRemote(
          `${celestiaBinary} light init --p2p.network ${targetNetwork}`,
          { timeout: 300000 } // 5 minute timeout for initialization
        );
        logger.info('✅ Node initialized successfully');
        return true;
      } catch (error: unknown) {
        if (
          error instanceof Error &&
          error.message.includes('already exists')
        ) {
          logger.info('✅ Node already configured');
          return true;
        }
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(`❌ Failed to initialize node: ${errorMessage}`);
        throw error;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`❌ Failed to initialize Celestia node: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Remove node initialization (cleanup node store)
   */
  static async removeNodeInitialization(
    targetNetwork: string = process.env.CELESTIA_NETWORK || 'mocha',
    celestiaUser?: string
  ): Promise<boolean> {
    try {
      logger.info(
        `🧹 Removing node initialization for network: ${targetNetwork}...`
      );

      const connection = await SshService.createConnection();
      if (!connection) {
        logger.warn('Remote connection not configured');
        return false;
      }

      const runRemote = await SshService.executeCommand(connection);
      const effectiveCelestiaUser = celestiaUser || process.env.CELESTIA_USER;

      const nodeStore = effectiveCelestiaUser
        ? `/home/${effectiveCelestiaUser}/.celestia-light-${targetNetwork}`
        : `$HOME/.celestia-light-${targetNetwork}`;

      // Remove the node store directory
      try {
        await runRemote(`rm -rf ${nodeStore}`);
        logger.info(`✅ Node store removed: ${nodeStore}`);
        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(
          `❌ Failed to remove node store: ${nodeStore} - ${errorMessage}`
        );
        return false;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`❌ Failed to remove node initialization: ${errorMessage}`);
      return false;
    }
  }
}
