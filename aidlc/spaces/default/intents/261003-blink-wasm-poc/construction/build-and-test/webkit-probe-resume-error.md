# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: probe.spec.mjs >> probe の全項目が PASS する
- Location: tests\browser\probe.spec.mjs:53:1

# Error details

```
TimeoutError: page.waitForFunction: Timeout 600000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "formicarium runner" [level=1] [ref=e2]
  - generic [ref=e3]:
    - term [ref=e4]: crossOriginIsolated
    - definition [ref=e5]: "true"
    - term [ref=e6]: guest
    - definition [ref=e7]: probe
    - term [ref=e8]: status
    - definition [ref=e9]: running
    - term [ref=e10]: elapsed
    - definition [ref=e11]: "-"
  - generic [ref=e12]: PASS tokio-timer
```

# Test source

```ts
  1  | // FR2.2・FR5.2：COOP/COEP 付きのページで crossOriginIsolated が真になり、
  2  | // blink の wasm 上で probe の全項目が PASS すること（Chromium・Firefox・WebKit）。
  3  | // 前提：bash scripts/build-blink-wasm.sh、bash scripts/build-guests.sh probe、
  4  | //       npx playwright install chromium firefox webkit
  5  | import { expect, test } from '@playwright/test';
  6  | 
  7  | const CHECKS = [
  8  |   'tokio-timer',
  9  |   'unix-stream-pair',
  10 |   'rayon',
  11 |   'mutex-condvar',
  12 |   'fs-basic',
  13 |   'fs-hardlink',
  14 |   'fs-symlink',
  15 |   'fs-flock',
  16 | ];
  17 | 
  18 | /** 実行が終わる（data-exit-code が付くか、エラーになる）まで待ち、結果を返す。 */
  19 | async function waitForResult(page) {
> 20 |   await page.waitForFunction(() => window.formicariumResult !== undefined, null, { timeout: 10 * 60 * 1000 });
     |              ^ TimeoutError: page.waitForFunction: Timeout 600000ms exceeded.
  21 |   return page.evaluate(() => window.formicariumResult);
  22 | }
  23 | 
  24 | test('ページが crossOriginIsolated になる', async ({ page }) => {
  25 |   await page.goto('/runtime/web/index.html?guest=hello');
  26 |   await expect(page.getByTestId('isolated')).toHaveText('true');
  27 |   expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
  28 | });
  29 | 
  30 | test('hello ゲストが起動して終了コード 0 を返す', async ({ page }) => {
  31 |   await page.goto('/runtime/web/index.html?guest=hello&arg=from-browser');
  32 |   const result = await waitForResult(page);
  33 |   expect(result.error).toBeUndefined();
  34 |   expect(result.exitCode).toBe(0);
  35 |   await expect(page.getByTestId('output')).toHaveAttribute('data-exit-code', '0');
  36 |   await expect(page.getByTestId('output')).toContainText('arg: from-browser');
  37 | });
  38 | 
  39 | test('終了コード 3 のゲストの終了コードが伝わる', async ({ page }) => {
  40 |   await page.goto('/runtime/web/index.html?guest=exit3');
  41 |   const result = await waitForResult(page);
  42 |   expect(result.exitCode).toBe(3);
  43 |   await expect(page.getByTestId('output')).toHaveAttribute('data-exit-code', '3');
  44 | });
  45 | 
  46 | test('一覧にないゲストは実行せずにエラーを表示する', async ({ page }) => {
  47 |   await page.goto('/runtime/web/index.html?guest=../../etc/passwd');
  48 |   const result = await waitForResult(page);
  49 |   expect(result.error).toMatch(/unknown guest/);
  50 |   await expect(page.getByTestId('output')).not.toHaveAttribute('data-exit-code', /.*/);
  51 | });
  52 | 
  53 | test('probe の全項目が PASS する', async ({ page }) => {
  54 |   await page.goto('/runtime/web/index.html?guest=probe');
  55 |   const result = await waitForResult(page);
  56 |   expect(result.error).toBeUndefined();
  57 |   const output = await page.getByTestId('output').textContent();
  58 |   for (const name of CHECKS) {
  59 |     expect(output, `項目 ${name}`).toContain(`PASS ${name}\n`);
  60 |   }
  61 |   expect(output).not.toContain('FAIL ');
  62 |   expect(result.exitCode).toBe(0);
  63 | });
  64 | 
```