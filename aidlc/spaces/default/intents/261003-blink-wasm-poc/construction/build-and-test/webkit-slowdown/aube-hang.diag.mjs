// 診断専用：aube #1645 を -s（システムコール記録）付きで実行し、4 分で終わらなければ停止として記録する。
import { writeFile } from 'node:fs/promises';
import { expect } from '@playwright/test';
import { test, captureDiagnostics } from '../../tests/browser/diagnostics.mjs';

test('diag: aube #1645 の停止を記録する', async ({ page }, testInfo) => {
  const t0 = Date.now();
  await page.goto('/runtime/web/index.html?session=aube-1645&core-flag=-s');
  let finished = true;
  try {
    await page.waitForFunction(() => window.formicariumResult !== undefined, null, { timeout: 4 * 60 * 1000 });
  } catch {
    finished = false;
  }
  const snap = await captureDiagnostics(page);
  const steps = snap.result?.steps?.map((s) => (s.elapsedMs / 1000).toFixed(1)).join(' ') ?? 'unfinished';
  console.log(`TIMING ${testInfo.project.name} r${testInfo.repeatEachIndex} total=${((Date.now() - t0) / 1000).toFixed(1)} steps=${steps}`);
  await writeFile(testInfo.outputPath('stderr.txt'), String(snap.streams?.stderr ?? ''));
  await writeFile(testInfo.outputPath('stdout.txt'), String(snap.streams?.stdout ?? ''));
  expect(finished, 'aube が 4 分以内に終わらなかった').toBe(true);
});
