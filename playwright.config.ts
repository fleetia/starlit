import { defineConfig } from '@playwright/test';

export default defineConfig({
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.04,
      threshold: 0.25,
    },
  },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  outputDir: 'test-results/playwright',
  projects: [
    {
      name: 'desktop',
      use: { viewport: { height: 900, width: 1440 } },
    },
    {
      name: 'narrow',
      testMatch: '**/*.visual.spec.ts',
      use: { viewport: { height: 844, width: 390 } },
    },
  ],
  reporter: process.env.CI
    ? [
        ['github'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
      ]
    : 'list',
  retries: process.env.CI ? 2 : 0,
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}-{projectName}{ext}',
  testDir: './tests/e2e',
  timeout: 60_000,
  use: {
    actionTimeout: 10_000,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  workers: 1,
});
