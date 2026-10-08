import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { serveDirectory, elfHeader } from './fixtures.mjs';
let server;
test.beforeAll(async () => { server = await serveDirectory(fileURLToPath(new URL('../../', import.meta.url))); });
test.afterAll(async () => { await server.close(); });
test.beforeEach(async ({ page }) => { await page.goto(server.url); });
for (const scenario of ['valid', 'invalid-url', 'invalid-options', 'resource-valid', 'resource-stale', 'resource-duplicate', 'resource-invalid-version', 'resource-invalid-bytes', 'invalid-resource', 'blob-url']) test(`host descendant broker validates ${scenario} and preserves ports`, async ({ page }) => {
  const result = await page.evaluate(async ({ guest, scenario }) => {
    const { createSession } = await import('/runtime/web/api.mjs');
    const url = `${location.origin}/tests/package/fixtures/broker-request-worker.mjs`;
    const session = await createSession({ assets: { workerURL: url, loaderURL: url, wasmURL: url, buildInfoURL: url } });
    try {
      try { const result = await session.run({ guest: Uint8Array.from(guest), args: [scenario], timeoutMs: 5000 }); return { code: result.exitCode, bytes: [...result.stdout] }; }
      catch (error) { return { code: error.code }; }
    } finally { await session.dispose(); }
  }, { guest: [...elfHeader()], scenario });
  expect(result).toEqual(scenario === 'valid' ? { code: 0, bytes: [7,1,1] } : ['resource-valid','resource-stale'].includes(scenario) ? {code:0,bytes:[]} : { code: 'EXECUTION' });
});
