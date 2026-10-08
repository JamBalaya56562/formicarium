import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { serveDirectory, elfHeader } from './fixtures.mjs';
let server;
test.beforeAll(async () => { server = await serveDirectory(fileURLToPath(new URL('../../', import.meta.url))); });
test.afterAll(async () => { await server.close(); });
test.beforeEach(async ({ page }) => { await page.goto(server.url); });
test('current child-control unsupported major is EXECUTION rather than ignored', async ({ page }) => {
  const code = await page.evaluate(async (guest) => {
    const { createSession } = await import('/runtime/web/api.mjs');
    const url = `${location.origin}/tests/package/fixtures/broker-request-worker.mjs`;
    const session = await createSession({ assets: { loaderURL: url, wasmURL: url, buildInfoURL: url, workerURL: url } });
    try { await session.run({ guest: Uint8Array.from(guest), args: ['invalid-version'], timeoutMs: 5000 }); }
    catch (error) { return error.code; } finally { await session.dispose(); }
  }, [...elfHeader()]);
  expect(code).toBe('EXECUTION');
});
test('browser missing Worker asset is ASSET_LOAD before guest starts', async ({ page }) => {
  const code = await page.evaluate(async (guest) => {
    const { createSession } = await import('/runtime/web/api.mjs');
    const url = `${location.origin}/missing-worker.mjs`;
    const session = await createSession({ assets: { loaderURL: url, wasmURL: url, buildInfoURL: url, workerURL: url } });
    try { await session.run({ guest: Uint8Array.from(guest), timeoutMs: 5000 }); }
    catch (error) { return error.code; } finally { await session.dispose(); }
  }, [...elfHeader()]);
  expect(code).toBe('ASSET_LOAD');
});
for (const kind of ['abort', 'timeout', 'dispose']) test(`pending Worker preflight ${kind} cannot create a late Worker`, async ({ page }) => {
  const result = await page.evaluate(async ({ guest, kind }) => {
    const { createSession } = await import('/runtime/web/api.mjs');
    const Original = Worker; const originalFetch = fetch; let starts = 0; let release; let fetchCancelled = false;
    globalThis.Worker = class extends Original { constructor(...args) { starts++; super(...args); } };
    globalThis.fetch = (_, options) => new Promise((resolve) => {
      release = resolve; options.signal.addEventListener('abort', () => { fetchCancelled = true; });
    });
    const url = `${location.origin}/tests/package/fixtures/quiet-worker.mjs`;
    const session = await createSession({ assets: { loaderURL: url, wasmURL: url, buildInfoURL: url, workerURL: url } });
    const controller = new AbortController();
    try {
      const running = session.run({ guest: Uint8Array.from(guest), timeoutMs: kind === 'timeout' ? 30 : 5000, signal: controller.signal }).catch((error) => error.code);
      let busy; try { await session.listEntries(); } catch (error) { busy = error.code; }
      if (kind === 'abort') controller.abort();
      if (kind === 'dispose') await session.dispose();
      const code = await running;
      release(new Response('// fixture', { status: 200 }));
      await new Promise((resolve) => setTimeout(resolve, 20));
      let state; try { state = (await session.listEntries()).length; } catch (error) { state = error.code; }
      return { busy, code, starts, fetchCancelled, state };
    } finally { globalThis.fetch = originalFetch; globalThis.Worker = Original; await session.dispose(); }
  }, { guest: [...elfHeader()], kind });
  expect(result).toEqual({ busy: 'BUSY', code: kind === 'timeout' ? 'TIMEOUT' : 'ABORTED', starts: 0, fetchCancelled: true, state: kind === 'dispose' ? 'DISPOSED' : 0 });
});
