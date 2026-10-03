// 診断専用：Chromium で hello と aube --version の所要時間を測り、起動にかかる時間を切り分ける。
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
const server = spawn(process.execPath, ['scripts/serve.mjs', '--port', '8791'], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((r) => server.stdout.on('data', (d) => String(d).includes('serving') && r()));
const browser = await chromium.launch();
const run = async (q) => {
  const page = await browser.newPage();
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:8791/runtime/web/index.html?${q}`);
  await page.waitForFunction(() => window.formicariumResult !== undefined, null, { timeout: 120000 });
  const r = await page.evaluate(() => window.formicariumResult);
  await page.close();
  return { page: Date.now() - t0, step: r.steps[0].elapsedMs, exit: r.exitCode };
};
for (let i = 1; i <= 5; i++) {
  const h = await run('guest=hello');
  const v = await run('guest=aube&arg=--version');
  console.log(`trial=${i} hello_step=${h.step.toFixed(0)} hello_page=${h.page} version_step=${v.step.toFixed(0)} version_page=${v.page} exits=${h.exit},${v.exit}`);
}
await browser.close();
server.kill();
