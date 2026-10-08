import { test, expect } from '@playwright/test';

for (const [tool, ref, version] of [['aube', 'v2.7.0', '2.7.0 linux-x64 (2026-10-07)\n'], ['pitchfork', 'v2.30.1', 'pitchfork 2.30.1\n']]) {
  test(`actual terrarium uses installed pack and latest ${tool}`, async ({ page }) => {
    if (tool === 'pitchfork') test.setTimeout(600_000);
    await page.goto(`/element.html?${new URLSearchParams({ tool, ref, fixture: '' })}`);
    await page.locator('terrarium-terminal').waitFor();
    const result = await page.evaluate(async ({ tool }) => {
      const terminal = document.querySelector('terrarium-terminal');
      const ready = await terminal.ready;
      const first = await terminal.run(`${tool} --version`);
      const pwd = await terminal.run('pwd');
      return { ready, first, pwd, transcript: terminal.transcript };
    }, { tool });
    expect(result.ready).toMatchObject({ tool, ref }); expect(result.first).toMatchObject({ code: 0, output: version });
    expect(result.pwd.output).toBe('/work\n'); expect(result.transcript).toBe(`${version}/work\n`);
  });
}
