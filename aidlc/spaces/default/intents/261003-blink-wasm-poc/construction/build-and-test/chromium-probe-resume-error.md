# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: probe.spec.mjs >> probe の全項目が PASS する
- Location: tests\browser\probe.spec.mjs:53:1

# Error details

```
Error: 項目 mutex-condvar

expect(received).toContain(expected) // indexOf

Expected substring: "PASS mutex-condvar
"
Received string:    "PASS tokio-timer
PASS unix-stream-pair
PASS rayon
E2026-10-04T21:45:20.020999:blink/blink.c:162:262152 terminating due to SIGSEGV (rip=0x88042fc0 code=1 faultaddr=0x80018320)
E2026-10-04T21:45:20.028000:blink/blink.c:146:262152 additional information
	 PC 88042fc0 mov 0x820(%rdi),%rax 48 8b 87 20 08 00 00 48
	 AX 0000000000000001  CX 0000000080004430  DX 0000000000000001  BX 0000000080822aa8
	 SP 00000000808228a0  BP 00000000808228c0  SI 0000000000000000  DI 0000000080017b00
	 R8 0000000000000000  R9 0000000000000000 R10 0000000000000008 R11 3f5df6955179fc00
	R12 00000000880d89c0 R13 00000000880d8a00 R14 0000000000000001 R15 0000000080822b38
	 FS 0000000080822b38  GS 0000000000000000 OPS 161018           FLG ..Z...
	/guest/probe
	0000808228c0 000088042fc0 UNKNOWN 32 bytes
	000088075140 000088098d43 UNKNOWN
	66665053e5894855 25048b486466 UNKNOWN [MISALIGN] [CORRUPT FRAME POINTER]
000080000000-000080000fff  4096 100% rw··
000080001000-000080001fff  4096   0%·····
000080002000-000080005fff   16k 100% rw··
000080007000-000080007fff  4096 100% rw··
00008000a000-00008000afff  4096 100% rw··
00008000b000-00008000bfff  4096   0%·····
00008000c000-00008000dfff  8192 100% rw··
00008000e000-00008000efff  4096   0%·····
00008000f000-000080010fff  8192 100% rw··
00008020e000-000080210fff   12k 100% rw··
000080211000-000080212fff  8192   0%·····
000080213000-000080413fff 2052k   1% rw··
000080415000-000080416fff  8192 100% rw··
000080417000-000080418fff  8192   0%·····
000080419000-000080619fff 2052k   1% rw··
000080620000-000080621fff  8192   0%·····
000080622000-000080822fff 2052k   1% rw··
000080828000-000080829fff  8192   0%·····
00008082a000-000080a2afff 2052k   1% rw··
000080a2b000-000080c2dfff 2060k   0%·····
000088000000-000088008fff   36k 100% r   /guest/probe
000088009000-0000880a1fff  612k 100% rx  /guest/probe
0000880a2000-0000880d0fff  188k 100% r   /guest/probe
0000880d1000-0000880d9fff   36k 100% rw  /guest/probe
0000880da000-0000880dafff  4096   0%·····
0000880db000-0000880dbfff  4096 100% rw  [heap]
4fffff800000-4fffffffffff 8192k   1% rw  [stack]
<blink backtrace unavailable>
"
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
    - definition [ref=e9]: done (exit 139)
    - term [ref=e10]: elapsed
    - definition [ref=e11]: 33.04 s
  - generic [ref=e12]: "PASS tokio-timer PASS unix-stream-pair PASS rayon E2026-10-04T21:45:20.020999:blink/blink.c:162:262152 terminating due to SIGSEGV (rip=0x88042fc0 code=1 faultaddr=0x80018320) E2026-10-04T21:45:20.028000:blink/blink.c:146:262152 additional information PC 88042fc0 \x1b[38;5;155mmov \x1b[39m0x820(\x1b[38;5;215m%rdi\x1b[39m),\x1b[38;5;215m%rax\x1b[39m 48 8b 87 20 08 00 00 48 AX 0000000000000001 CX 0000000080004430 DX 0000000000000001 BX 0000000080822aa8 SP 00000000808228a0 BP 00000000808228c0 SI 0000000000000000 DI 0000000080017b00 R8 0000000000000000 R9 0000000000000000 R10 0000000000000008 R11 3f5df6955179fc00 R12 00000000880d89c0 R13 00000000880d8a00 R14 0000000000000001 R15 0000000080822b38 FS 0000000080822b38 GS 0000000000000000 OPS 161018 FLG ..Z... /guest/probe 0000808228c0 000088042fc0 UNKNOWN 32 bytes 000088075140 000088098d43 UNKNOWN 66665053e5894855 25048b486466 UNKNOWN [MISALIGN] [CORRUPT FRAME POINTER] 000080000000-000080000fff 4096 100% rw 000080001000-000080001fff 4096 0% 000080002000-000080005fff 16k 100% rw 000080007000-000080007fff 4096 100% rw 00008000a000-00008000afff 4096 100% rw 00008000b000-00008000bfff 4096 0% 00008000c000-00008000dfff 8192 100% rw 00008000e000-00008000efff 4096 0% 00008000f000-000080010fff 8192 100% rw 00008020e000-000080210fff 12k 100% rw 000080211000-000080212fff 8192 0% 000080213000-000080413fff 2052k 1% rw 000080415000-000080416fff 8192 100% rw 000080417000-000080418fff 8192 0% 000080419000-000080619fff 2052k 1% rw 000080620000-000080621fff 8192 0% \x1b[31m000080622000-000080822fff\x1b[0m 2052k 1% rw 000080828000-000080829fff 8192 0% 00008082a000-000080a2afff 2052k 1% rw 000080a2b000-000080c2dfff 2060k 0% 000088000000-000088008fff 36k 100% r /guest/probe \x1b[7m000088009000-0000880a1fff\x1b[0m 612k 100% rx /guest/probe 0000880a2000-0000880d0fff 188k 100% r /guest/probe 0000880d1000-0000880d9fff 36k 100% rw /guest/probe 0000880da000-0000880dafff 4096 0% 0000880db000-0000880dbfff 4096 100% rw [heap] 4fffff800000-4fffffffffff 8192k 1% rw [stack] <blink backtrace unavailable>"
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
  20 |   await page.waitForFunction(() => window.formicariumResult !== undefined, null, { timeout: 10 * 60 * 1000 });
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
> 59 |     expect(output, `項目 ${name}`).toContain(`PASS ${name}\n`);
     |                                  ^ Error: 項目 mutex-condvar
  60 |   }
  61 |   expect(output).not.toContain('FAIL ');
  62 |   expect(result.exitCode).toBe(0);
  63 | });
  64 | 
```