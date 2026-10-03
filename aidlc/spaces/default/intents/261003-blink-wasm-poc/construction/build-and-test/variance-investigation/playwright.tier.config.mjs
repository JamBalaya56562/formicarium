// 診断専用：wasm のコンパイラ段階（V8 の Liftoff）がばらつきの原因かを確かめる。
import { devices } from '@playwright/test';
import base from '../../playwright.config.mjs';
export default { ...base, testDir: '.', testMatch: '**/aube-timing.diag.mjs', timeout: 15 * 60 * 1000,
  webServer: { ...base.webServer, command: 'node ../../scripts/serve.mjs --port 8787' },
  projects: [
    { name: 'chromium-default', use: { ...devices['Desktop Chrome'] } },
    { name: 'chromium-noliftoff', use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--js-flags=--no-liftoff'] } } },
  ] };
