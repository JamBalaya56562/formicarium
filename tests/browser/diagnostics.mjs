import { test as base } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

export async function captureDiagnostics(page) {
  return page.evaluate(() => ({
    streams: window.formicariumDiagnostics,
    result: window.formicariumResult,
    output: document.getElementById('output')?.textContent,
    pageStatus: document.getElementById('status')?.textContent,
    visibility: document.visibilityState,
    userAgent: navigator.userAgent,
    isolated: globalThis.crossOriginIsolated,
  }));
}

// Auto fixture runs before the test and captures partial output in teardown,
// including when the guest has not produced a final result.
export const test = base.extend({
  diagnostics: [async ({ page, browser }, use, testInfo) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
    page.on('pageerror', (error) => pageErrors.push(String(error)));
    await use();
    let snapshot;
    try {
      snapshot = await captureDiagnostics(page);
    } catch (error) {
      snapshot = { captureError: String(error) };
    }
    const evidence = {
      title: testInfo.title, project: testInfo.project.name,
      repeatIndex: testInfo.repeatEachIndex, retry: testInfo.retry,
      status: testInfo.status, expectedStatus: testInfo.expectedStatus,
      browserVersion: browser.version(), platform: process.platform,
      url: page.url(), console: consoleMessages, pageErrors, ...snapshot,
    };
    const file = testInfo.outputPath('diagnostics.json');
    await writeFile(file, JSON.stringify(evidence, null, 2));
    await testInfo.attach('diagnostics', { path: file, contentType: 'application/json' });
  }, { auto: true }],
});

export function probeUrl(args = []) {
  const query = new URLSearchParams({ guest: 'probe' });
  for (const arg of args) query.append('arg', arg);
  if (process.env.FORMICARIUM_DIAGNOSTIC === '1') {
    query.append('core-flag', '-s');
    query.append('arg', '--diagnostic');
  }
  return `/runtime/web/index.html?${query}`;
}
