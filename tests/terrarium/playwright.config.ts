import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  testDir: '.',
  testMatch: 'consumer.spec.ts',
  timeout: 840_000,
  expect: { timeout: 120_000 },
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    baseURL: 'http://127.0.0.1:8880',
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `"${process.execPath}" tests/terrarium/serve.js`,
    cwd: repositoryRoot,
    url: 'http://127.0.0.1:8880/element.html',
    reuseExistingServer: false,
  },
});
