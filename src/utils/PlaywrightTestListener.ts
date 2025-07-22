import {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
  TestStep,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import { Logger } from './Logger';

interface TestListenerConfig {
  outputDir?: string;
  enableConsoleLogging?: boolean;
  enableFileLogging?: boolean;
  enableScreenshots?: boolean;
  enableVideos?: boolean;
  enableTimestamps?: boolean;
  customReportName?: string;
}

interface TestExecutionContext {
  testName: string;
  suiteName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
  error?: string;
  screenshots?: string[];
  videos?: string[];
  steps?: TestStepInfo[];
}

interface TestStepInfo {
  title: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'passed' | 'failed' | 'skipped';
  error?: string;
}

interface SuiteExecutionContext {
  suiteName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  tests: TestExecutionContext[];
  passed: number;
  failed: number;
  skipped: number;
  total: number;
}

// ============================================================================
// MAIN CLASS DEFINITION
// ============================================================================

export default class PlaywrightTestListener implements Reporter {
  private config: TestListenerConfig;
  protected outputDir: string;
  protected executionContext: Map<string, TestExecutionContext> = new Map();
  protected suiteContext: Map<string, SuiteExecutionContext> = new Map();
  private globalStartTime?: Date;
  private globalEndTime?: Date;
  private logger: Logger;

  constructor(config: TestListenerConfig = {}) {
    this.config = {
      outputDir: './test-results',
      enableConsoleLogging: true,
      enableFileLogging: true,
      enableScreenshots: true,
      enableVideos: true,
      enableTimestamps: true,
      customReportName: 'test-execution-report',
      ...config,
    };

    this.outputDir = this.config.outputDir!;
    this.logger = Logger.for('PlaywrightTestListener');
    this.ensureOutputDirectory();
  }

  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  // ============================================================================
  // PLAYWRIGHT REPORTER LIFECYCLE METHODS
  // ============================================================================

  onBegin(config: FullConfig, suite: Suite): void {
    this.globalStartTime = new Date();
    // Ensure output directory exists at the start
    this.ensureOutputDirectory();
    this.logger.info(
      '═══════════════════════════════════════════════════════════════'
    );
    this.logger.info('🚀 Test execution started');
    this.logger.info(
      `📊 Configuration: Projects=${config.projects.length}, Workers=${config.workers}`
    );
    this.logger.info(`📁 Output directory: ${this.outputDir}`);
    this.logger.info(
      '═══════════════════════════════════════════════════════════════'
    );

    // Initialize all test suites recursively
    this.initializeSuites(suite);
  }

  private initializeSuites(suite: Suite): void {
    // Initialize this suite if it has a title (not the root)
    if (suite.title) {
      this.onTestSuiteStart(suite);
    }

    // Initialize child suites recursively
    for (const childSuite of suite.suites) {
      this.initializeSuites(childSuite);
    }
  }

  onTestBegin(test: TestCase): void {
    const testId = this.getTestId(test);
    const context: TestExecutionContext = {
      testName: test.title,
      suiteName: test.parent.title,
      startTime: new Date(),
      status: 'passed',
      steps: [],
    };

    this.executionContext.set(testId, context);
    this.logger.info(`🧪 Test started: ${test.parent.title} > ${test.title}`);

    this.onTestStart(test);
  }

  onStepBegin(test: TestCase, result: TestResult, step: TestStep): void {
    const testId = this.getTestId(test);
    const context = this.executionContext.get(testId);

    if (context) {
      const stepInfo: TestStepInfo = {
        title: step.title,
        startTime: new Date(),
        status: 'passed',
      };
      context.steps!.push(stepInfo);
      this.logger.step(step.title, 'started');
    }
  }

  onStepEnd(test: TestCase, result: TestResult, step: TestStep): void {
    const testId = this.getTestId(test);
    const context = this.executionContext.get(testId);

    if (context && context.steps) {
      const stepInfo = context.steps.find(
        s => s.title === step.title && !s.endTime
      );
      if (stepInfo) {
        stepInfo.endTime = new Date();
        stepInfo.duration =
          stepInfo.endTime.getTime() - stepInfo.startTime.getTime();
        stepInfo.status = step.error ? 'failed' : 'passed';
        if (step.error) {
          stepInfo.error = step.error.message;
        }

        const status = stepInfo.status === 'passed' ? 'completed' : 'failed';
        this.logger.step(step.title, status, stepInfo.duration);
      }
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const testId = this.getTestId(test);
    const context = this.executionContext.get(testId);

    if (context) {
      context.endTime = new Date();
      context.duration =
        context.endTime.getTime() - context.startTime.getTime();
      context.status = result.status;

      if (result.error) {
        context.error = result.error.message;
      }

      // Collect screenshots and videos if available
      if (this.config.enableScreenshots && result.attachments) {
        context.screenshots = result.attachments
          .filter(a => a.name === 'screenshot')
          .map(a => a.path || '');
      }

      if (this.config.enableVideos && result.attachments) {
        context.videos = result.attachments
          .filter(a => a.name === 'video')
          .map(a => a.path || '');
      }

      const statusIcon = this.getStatusIcon(result.status);
      this.logger.info(
        `${statusIcon} Test completed: ${test.parent.title} > ${test.title} (${context.duration}ms)`
      );

      if (result.error) {
        this.logger.info(`   Error: ${result.error.message}`, 'error');
      }
    }

    this.onTestFinish(test, result);
  }

  onEnd(result: FullResult): void {
    this.globalEndTime = new Date();
    const totalDuration =
      this.globalEndTime.getTime() - this.globalStartTime!.getTime();

    this.logger.info(
      '═══════════════════════════════════════════════════════════════'
    );
    this.logger.info(`🏁 Test execution completed in ${totalDuration}ms`);
    this.logger.info(`📊 Overall Results: ${result.status.toUpperCase()}`);

    // Calculate totals across all suites
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    for (const [, context] of this.suiteContext.entries()) {
      totalTests += context.total;
      totalPassed += context.passed;
      totalFailed += context.failed;
      totalSkipped += context.skipped;
    }

    if (totalTests > 0) {
      this.logger.info(
        `📊 Grand Total: ${totalTests} tests - ${totalPassed} passed, ${totalFailed} failed, ${totalSkipped} skipped`
      );
    }
    this.logger.info(
      '═══════════════════════════════════════════════════════════════'
    );

    this.onTestSuiteFinish();
  }

  // TestNG-like event methods that can be overridden
  protected onTestSuiteStart(suite: Suite): void {
    const suiteName = suite.title || 'Root Suite';
    const suiteContext: SuiteExecutionContext = {
      suiteName,
      startTime: new Date(),
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
    };

    this.suiteContext.set(suiteName, suiteContext);
    this.logger.info(
      '───────────────────────────────────────────────────────────────'
    );
    this.logger.info(`📋 Test suite started: ${suiteName}`);
  }

  protected onTestStart(_test: TestCase): void {
    // Hook for test start - can be overridden
  }

  protected onTestFinish(_test: TestCase, result: TestResult): void {
    // Hook for test finish - can be overridden
    const suiteName = _test.parent.title || 'Root Suite';
    const suiteContext = this.suiteContext.get(suiteName);
    if (suiteContext) {
      suiteContext.total++;
      switch (result.status) {
        case 'passed':
          suiteContext.passed++;
          break;
        case 'failed':
        case 'timedOut':
        case 'interrupted':
          suiteContext.failed++;
          break;
        case 'skipped':
          suiteContext.skipped++;
          break;
      }
    }
  }

  protected onTestSuiteFinish(): void {
    // Hook for test suite finish - can be overridden
    if (this.suiteContext.size === 0) {
      this.logger.info(`📋 No test suites found`);
      return;
    }

    // Only show suites that actually have tests
    const suitesWithTests = Array.from(this.suiteContext.entries()).filter(
      ([, context]) => context.total > 0
    );

    if (suitesWithTests.length === 0) {
      this.logger.info(`📋 No suites with tests found`);
      return;
    }

    this.logger.info(`📋 Test Suite Summary:`);
    this.logger.info(
      '───────────────────────────────────────────────────────────────'
    );
    for (const [suiteName, context] of suitesWithTests) {
      context.endTime = new Date();
      context.duration =
        context.endTime.getTime() - context.startTime.getTime();

      this.logger.info(`📋 Suite completed: ${suiteName}`);
      this.logger.info(
        `📊 Total: ${context.total}, Passed: ${context.passed}, Failed: ${context.failed}, Skipped: ${context.skipped}, Duration: ${context.duration}ms`
      );

      // Log individual test results if there are any failures
      if (context.failed > 0) {
        this.logger.info(
          `❌ Suite had ${context.failed} failed test(s)`,
          'warn'
        );
      }
      this.logger.info(''); // Add empty line between suites
    }
  }

  protected getTestId(test: TestCase): string {
    return `${test.parent.title}::${test.title}`;
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'passed':
        return '✅';
      case 'failed':
        return '❌';
      case 'skipped':
        return '⏭️';
      case 'timedOut':
        return '⏰';
      case 'interrupted':
        return '🚫';
      default:
        return '❓';
    }
  }
}
