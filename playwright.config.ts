import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src/tests',
  outputDir: './test-results',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 600000, // 10 minutes for deployment tests
  reporter: [
    ['list', { printSteps: true }],
    ['html', { open: 'never' }],
    ['junit', { outputFile: './test-results/test-results.xml' }],
    [require.resolve('./src/utils/PlaywrightTestListener.ts'), {
      outputDir: './test-results',
      enableConsoleLogging: true,
      enableFileLogging: true,
      enableTimestamps: true
    }]
  ],
  use: {
    trace: 'retain-on-failure',
    acceptDownloads: false,
    bypassCSP: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },


  projects: [
    {
      name: 'pipeline',
      use: {
        channel: 'chromium',
        headless: true,
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process'],
        },
      },
    },

    {
      name: 'local',
      use: {
        channel: 'chromium',
        headless: false,
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process'],
        },
      },
    },
  ],
});
