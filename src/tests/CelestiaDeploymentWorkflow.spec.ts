import { expect, test } from '@playwright/test';
import { NodeLifecycleService } from '../services/celestia/lifecycle/NodeLifecycleService';
import { Logger } from '../utils/Logger';

const logger = Logger.for('CelestiaDeploymentWorkflow');

/**
 * Feature: Deploy Celestia Light Node
 * This test suite verifies the deployment workflow of a Celestia light node.
 * The Celestia node will be up and running before the test suite starts.
 */
test.describe('Feature: Deploy Celestia Light Node @DeploymentWorkflow @Priority(1)', () => {
  const deploymentContext: {
    serverAvailable: boolean;
    environmentSetup: boolean;
    binaryInstalled: boolean;
    nodeConfigured: boolean;
    nodeRunning: boolean;
    walletTested: boolean;
    detailedStatus: {
      isRunning: boolean;
      processIds: string[];
      processDetails: string;
    } | null;
  } = {
    serverAvailable: false,
    environmentSetup: false,
    binaryInstalled: false,
    nodeConfigured: false,
    nodeRunning: false,
    walletTested: false,
    detailedStatus: null,
  };

  test.beforeAll(async () => {
    logger.info('📦 Verify that the Celestia Node is running');
    await test.step('Check if the Celestia node is running', async () => {
      const isRunning = await NodeLifecycleService.isCelestiaProcessesRunning();
      if (isRunning) {
        logger.info('✅ Celestia node is running');
      } else {
        logger.error('❌ Celestia node is not running');
      }
      expect(isRunning, 'Celestia node should be up and running').toBe(true);
      deploymentContext.nodeRunning = isRunning;
    });

    await test.step('Get detailed node status', async () => {
      const detailedStatus = await NodeLifecycleService.getStatus();
      deploymentContext.detailedStatus = detailedStatus;
      logger.debug(
        `📋 Detailed Status: ${JSON.stringify(detailedStatus, null, 2)}`
      );

      expect(
        detailedStatus.isRunning,
        'Detailed status should show node is running'
      ).toBe(true);
      expect(
        detailedStatus.processIds.length,
        'Should have at least one process ID'
      ).toBeGreaterThan(0);
    });
  });

  test.afterAll(async () => {
    console.log('🧹 Cleaning up after deployment workflow tests...');
    const isRunning = await NodeLifecycleService.isCelestiaProcessesRunning();
    if (isRunning) {
      await NodeLifecycleService.stop();
    }
  });

  test('Scenario: Verify that the user can Stop the Celestia Node', async () => {
    logger.info('📦 Testing Celestia Node Stop Status');
    await test.step('Stop the Celestia Node', async () => {
      const stopSuccessful = await NodeLifecycleService.stop();
      if (stopSuccessful) {
        logger.info('✅ Celestia node stopped successfully');
      } else {
        logger.error('❌ Failed to stop Celestia node');
      }
      expect(
        stopSuccessful,
        'Celestia node should be stopped successfully'
      ).toBe(true);
      deploymentContext.nodeRunning = !stopSuccessful;
    });

    await test.step('Verify node is inactive', async () => {
      // Wait a moment for the stop to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      const celestiaNodeDetails = await NodeLifecycleService.status();
      expect(
        celestiaNodeDetails.serviceStatus,
        `Expected the service status to be inactive, but it was: ${celestiaNodeDetails.serviceStatus}`
      ).toContain('inactive');
    });
  });

  test('Scenario: Verify the user can start the Node service', async () => {
    console.log('📦 Testing Celestia Node Status Functions');

    await test.step('Start the Celestia Node', async () => {
      const startSuccessful = await NodeLifecycleService.start();
      if (startSuccessful) {
        console.log('✅ Celestia node started successfully');
      } else {
        console.error('❌ Failed to start Celestia node');
      }
      expect(
        startSuccessful,
        'Celestia node should be started successfully'
      ).toBe(true);
      deploymentContext.nodeRunning = startSuccessful;
    });

    await test.step('Verify node is active', async () => {
      // Wait a moment for the start to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      const celestiaNodeDetails = await NodeLifecycleService.status();
      expect(
        celestiaNodeDetails.serviceStatus,
        `Expected the service status to be active, but it was: ${celestiaNodeDetails.serviceStatus}`
      ).toContain('active');
    });
  });
});
