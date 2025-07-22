import * as dotenv from 'dotenv';
import { CelestiaNodeInitializer } from './CelestiaNodeInitializer';
import { CelestiaNodeStarter } from './CelestiaNodeStarter';
import { CelestiaNodeStatus } from './CelestiaNodeStatus';
import { CelestiaNodeStopper } from './CelestiaNodeStopper';

dotenv.config();

/**
 * Main service for managing Celestia light node lifecycle operations
 * This service orchestrates the various node management operations
 */
export class NodeLifecycleService {
  static async status() {
    return await CelestiaNodeStatus.getStatus();
  }
  /**
   * Start a Celestia light node
   */
  static async start(
    celestiaNetwork: string = process.env.CELESTIA_NETWORK || 'mocha-4'
  ): Promise<boolean> {
    return CelestiaNodeStarter.start(celestiaNetwork);
  }

  /**
   * Stop the Celestia light node
   */
  static async stop(): Promise<boolean> {
    return await CelestiaNodeStopper.stop();
  }

  /**
   * Check if Celestia node is running
   */
  static async isCelestiaProcessesRunning(): Promise<boolean> {
    return await CelestiaNodeStatus.isCelestiaProcessesRunning();
  }

  /**
   * Get detailed status information about running Celestia processes
   */
  static async getStatus(): Promise<{
    isRunning: boolean;
    processIds: string[];
    processDetails: string;
  }> {
    return await CelestiaNodeStatus.getStatus();
  }

  /**
   * Initialize the Celestia light node
   */
  static async initializeNode(
    targetNetwork: string = process.env.CELESTIA_NETWORK || 'mocha'
  ): Promise<boolean> {
    return await CelestiaNodeInitializer.initializeNode(targetNetwork);
  }
}
