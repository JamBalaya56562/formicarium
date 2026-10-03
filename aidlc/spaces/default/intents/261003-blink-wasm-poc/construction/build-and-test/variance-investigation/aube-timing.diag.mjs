// 診断専用：aube #1645 を記録なしで実行し、手順ごとの所要時間を出力する。
import { writeFile } from 'node:fs/promises';
import { expect } from '@playwright/test';
import { test } from '../../tests/browser/diagnostics.mjs';
test('diag: aube #1645 の手順ごとの時間', async ({ page }, testInfo) => {
  await page.goto('/runtime/web/index.html?session=aube-1645');
  await page.waitForFunction(() => window.formicariumResult !== undefined, null, { timeout: 14 * 60 * 1000 });
  const r = await page.evaluate(() => window.formicariumResult);
  const line = `TIMING ${testInfo.project.name} ${r.steps.map((s) => (s.elapsedMs / 1000).toFixed(1)).join(' ')} exit=${r.exitCode}`;
  console.log(line);
  await writeFile(testInfo.outputPath('timing.txt'), line + '\n');
  expect(r.exitCode).toBe(0);
});
