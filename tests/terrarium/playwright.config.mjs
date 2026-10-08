import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
export default defineConfig({
  testDir: '.', testMatch: 'consumer.spec.mjs', timeout: 840_000,
  expect: { timeout: 120_000 }, workers: 1, retries: 0, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:8880', serviceWorkers: 'block', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: { command: `"${process.execPath}" tests/terrarium/serve.mjs`,
    cwd: repositoryRoot,
    url: 'http://127.0.0.1:8880/element.html', reuseExistingServer: false },
});
