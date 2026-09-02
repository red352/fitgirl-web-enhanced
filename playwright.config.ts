import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  testMatch: '*.spec.ts',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  fullyParallel: true,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      animations: 'disabled',
      maxDiffPixelRatio: 0.015,
    },
  },
  use: {
    baseURL: 'http://127.0.0.1:4175/test/e2e/',
    browserName: 'chromium',
    colorScheme: 'light',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run test:fixture -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4175/test/e2e/',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
