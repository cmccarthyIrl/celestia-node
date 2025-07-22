import { Logger } from '../../../utils/Logger';
import { SshConnection, SshService } from '../../ssh/SshService';

const logger = Logger.for('CelestiaNodeStopper');

export class CelestiaNodeStopper {
  static async stop(): Promise<boolean> {
    const stopper = new CelestiaNodeStopper();
    return await stopper.stopNode();
  }

  async stopNode(): Promise<boolean> {
    try {
      logger.warn('🛑 Stopping Celestia light node...');

      // Get SSH connection
      const connection = await SshService.createConnection();
      if (!connection) {
        logger.error('Could not create SSH connection');
        return false;
      }

      // Stop systemd service if it exists
      await this.stopSystemdService(connection);

      // Verify the node is actually stopped
      await this.verifyNodeStopped(connection);

      return true;
    } catch (error) {
      logger.error('❌ Error stopping Celestia node:', error);
      return false;
    }
  }

  private async stopSystemdService(connection: SshConnection): Promise<void> {
    try {
      logger.warn('🛑 Stopping systemd service...');

      // Use enhanced executor with sudo handling
      const runRemote = await SshService.executeCommand(connection);

      const result = await runRemote('sudo systemctl stop celestia-light', {
        timeout: 90000,
        requiresSudo: true,
        retries: 2,
      });

      logger.info('✅ Systemd service stop command completed');

      // Wait a moment for service to fully stop
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check if service is actually stopped
      try {
        const statusResult = await runRemote(
          'systemctl is-active celestia-light.service 2>/dev/null || echo "inactive"',
          { timeout: 15000, retries: 2 }
        );
        if (statusResult.stdout.includes('inactive')) {
          logger.info('✅ Service confirmed inactive');
        } else {
          logger.warn(`⚠️ Service status: ${statusResult.stdout.trim()}`);
        }
      } catch (error) {
        logger.warn('⚠️ Could not verify service status after stop:', error);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('⚠️ Error stopping systemd service:', errorMessage);
      throw error; // Re-throw to let caller handle the error
    }
  }

  private async verifyNodeStopped(connection: SshConnection): Promise<void> {
    try {
      logger.info('🔍 Verifying node is completely stopped...');

      const runRemote = await SshService.executeCommand(connection);

      // Wait up to 30 seconds for node to fully stop
      const maxWaitTime = 30000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        try {
          // Check for any remaining processes
          const processCheck = await runRemote(
            'pgrep -f "celestia.*light" || echo "NO_PROCESSES"',
            { timeout: 10000 }
          );

          if (processCheck.stdout.trim() === 'NO_PROCESSES') {
            logger.info('✅ Node verification complete - no processes running');
            return;
          }

          const remainingPids = processCheck.stdout
            .trim()
            .split('\n')
            .filter(p => p.trim());
          logger.warn(
            `⏳ Still waiting for ${remainingPids.length} process(es) to stop: ${remainingPids.join(', ')}`
          );

          // Wait before checking again
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error) {
          // If pgrep fails, assume no processes (which is good)
          logger.error(
            '✅ Process check failed (likely no processes running):',
            error
          );
          return;
        }
      }

      logger.warn(
        '⚠️ Verification timeout - some processes may still be running'
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.warn('⚠️ Node verification failed:', errorMessage);
    }
  }

  private async stopManualProcesses(connection: SshConnection): Promise<void> {
    const runRemote = await SshService.executeCommand(connection);

    try {
      logger.info('🔍 Checking for running Celestia processes...');

      // Multiple rounds of process termination to handle race conditions
      for (let round = 1; round <= 3; round++) {
        logger.info(`📋 Termination round ${round}/3`);

        // Find all Celestia light processes
        const result = await runRemote(`pgrep -f "celestia.*light" || true`);
        const pids = result.stdout
          .trim()
          .split('\n')
          .filter((pid: string) => pid.trim());

        if (pids.length === 0 || (pids.length === 1 && !pids[0])) {
          logger.info(`✅ No Celestia processes found in round ${round}`);
          break;
        }

        logger.info(
          `🎯 Found ${pids.length} process(es) to terminate: ${pids.join(', ')}`
        );

        // First attempt: Graceful termination with SIGTERM
        for (const pid of pids) {
          if (pid.trim()) {
            try {
              const termResult = await runRemote(
                `kill -TERM ${pid} 2>&1 || true`
              );
              if (
                termResult.stderr &&
                !termResult.stderr.includes('No such process')
              ) {
                logger.info(`⚠️ SIGTERM to PID ${pid}:`, termResult.stderr);
              } else {
                logger.info(`📤 Sent SIGTERM to PID ${pid}`);
              }
            } catch (termError) {
              logger.error(
                `⚠️ Failed to send SIGTERM to PID ${pid}:`,
                termError
              );
            }
          }
        }

        // Wait for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Check which processes are still running
        const stillRunning = await runRemote(
          `pgrep -f "celestia.*light" || true`
        );
        const remainingPids = stillRunning.stdout
          .trim()
          .split('\n')
          .filter((pid: string) => pid.trim());

        if (
          remainingPids.length === 0 ||
          (remainingPids.length === 1 && !remainingPids[0])
        ) {
          logger.info('✅ All processes terminated gracefully');
          break;
        }

        logger.info(
          `💪 Force killing remaining ${remainingPids.length} process(es): ${remainingPids.join(', ')}`
        );

        // Force kill remaining processes
        for (const pid of remainingPids) {
          if (pid.trim()) {
            try {
              const killResult = await runRemote(
                `kill -KILL ${pid} 2>&1 || true`
              );
              if (
                killResult.stderr &&
                !killResult.stderr.includes('No such process')
              ) {
                logger.warn(
                  `⚠️ Failed to force kill PID ${pid}:`,
                  killResult.stderr
                );
              } else {
                logger.warn(`💀 Force killed PID ${pid}`);
              }
            } catch (killError) {
              logger.error(`⚠️ Failed to force kill PID ${pid}:`, killError);
            }
          }
        }

        // Wait before next round
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Thorough final verification - wait patiently for all processes to terminate
      logger.info(
        '🔍 Starting thorough final verification (30 second timeout)...'
      );
      const maxWaitTime = 30000; // 30 seconds
      const startTime = Date.now();
      let allProcessesStopped = false;

      while (Date.now() - startTime < maxWaitTime && !allProcessesStopped) {
        const finalCheck = await runRemote(
          `pgrep -f "celestia.*light" || true`
        );
        const remainingPids = finalCheck.stdout.trim();

        if (!remainingPids) {
          allProcessesStopped = true;
          logger.info('✅ All manual Celestia processes confirmed stopped');
        } else {
          const remainingCount = remainingPids
            .split('\n')
            .filter((pid: string) => pid.trim()).length;
          const elapsedTime = Math.round((Date.now() - startTime) / 1000);
          logger.info(
            `⏳ Still waiting for ${remainingCount} process(es) to terminate (${elapsedTime}s elapsed): ${remainingPids.replace(/\n/g, ', ')}`
          );
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before checking again
        }
      }

      if (!allProcessesStopped) {
        logger.warn(
          '⚠️ Some processes may still be running after 30 second timeout'
        );
      }
    } catch (error) {
      logger.error('⚠️ Error stopping manual processes:', error);
    }
    logger.info('✅ Celestia node manual stop process completed');
  }
}
