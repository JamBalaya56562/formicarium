import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  testDir: '.',
  testMatch: '**/*.spec.ts',
  workers: 1,
  retries: 0,
  fullyParallel: false,
  timeout: 600_000,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list']],
  projects: [
    {
      name: 'chromium',
      use: {
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        ...devices['Desktop Chrome'],
      },
    },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
