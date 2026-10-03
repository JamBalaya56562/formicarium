// 診断専用：WebKit で aube #1645 の手順ごとの時間を測る（記録なし）。
import { devices } from '@playwright/test';
import base from '../../playwright.config.mjs';
export default { ...base, testDir: '.', testMatch: '**/aube-timing.diag.mjs', timeout: 15 * 60 * 1000,
  webServer: { ...base.webServer, command: 'node ../../scripts/serve.mjs --port 8787' },
  projects: [{ name: 'webkit', use: { ...devices['Desktop Safari'] } }] };
