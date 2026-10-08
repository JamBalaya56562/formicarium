import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import type { ExecutionError } from '../../runtime/errors.js';
import { elfHeader, serveDirectory } from './fixtures.js';

let server: Awaited<ReturnType<typeof serveDirectory>>;
const root = fileURLToPath(new URL('../../', import.meta.url));
const guest = [...elfHeader()];
test.beforeAll(async () => {
  server = await serveDirectory(root);
});
test.afterAll(async () => {
  await server.close();
});
test.beforeEach(async ({ page }) => {
  await page.goto(server.url);
});

test('browser API owns copied filesystem seed and reset without core startup', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createSession } = await import('/runtime/web/api.js');
    const data = Uint8Array.of(255);
    const session = await createSession({
      entries: [
        {
          path: '/work/input',
          type: 'file' as const,
          mode: 420,
          inodeId: 'a',
          data,
        },
      ],
    });
    data[0] = 0;
    const original = (await session.readFile('/work/input'))[0];
    await session.remove('/work/input');
    await session.reset();
    const restored = (await session.readFile('/work/input'))[0];
    await session.dispose();
    let disposed: string | undefined;
    try {
      await session.reset();
    } catch (caught) {
      const error = caught as ExecutionError;
      disposed = error.code;
    }
    return { original, restored, disposed };
  });
  expect(result).toEqual({
    original: 255,
    restored: 255,
    disposed: 'DISPOSED',
  });
});
test('browser session rejects malformed roots, assets and seed before ownership changes', async ({
  page,
}) => {
  const codes = await page.evaluate(async () => {
    const { createSession } = await import('/runtime/web/api.js');
    const codes = [];
    for (const options of [
      null,
      [],
      { cwd: '/tmp' },
      { assets: {} },
      { entries: [{ path: '/outside', type: 'dir' as const, mode: 493 }] },
    ]) {
      try {
        // @ts-expect-error Deliberately malformed input exercises the runtime guard.
        await createSession(options);
      } catch (caught) {
        const error = caught as ExecutionError;
        codes.push(error.code);
      }
    }
    return codes;
  });
  expect(codes).toEqual(Array(5).fill('INVALID_INPUT'));
});
test('invalid ELF and pre-aborted run create no browser Worker', async ({
  page,
}) => {
  const result = await page.evaluate(async (guest) => {
    const { createSession } = await import('/runtime/web/api.js');
    const original = Worker;
    let starts = 0;
    globalThis.Worker = class extends original {
      constructor(...args: ConstructorParameters<typeof Worker>) {
        starts++;
        super(...args);
      }
    };
    try {
      const session = await createSession();
      const codes = [];
      try {
        await session.run({ guest: new Uint8Array() });
      } catch (caught) {
        const error = caught as ExecutionError;
        codes.push(error.code);
      }
      const controller = new AbortController();
      controller.abort();
      try {
        await session.run({
          guest: Uint8Array.from(guest),
          signal: controller.signal,
        });
      } catch (caught) {
        const error = caught as ExecutionError;
        codes.push(error.code);
      }
      await session.dispose();
      return { starts, codes };
    } finally {
      globalThis.Worker = original;
    }
  }, guest);
  expect(result).toEqual({ starts: 0, codes: ['INVALID_INPUT', 'ABORTED'] });
});
test('isolation deficiency is UNSUPPORTED_ENV and guest never starts', async ({
  page,
}) => {
  const unisolated = await serveDirectory(root, { isolated: false });
  try {
    await page.goto(unisolated.url);
    const code = await page.evaluate(async (guest) => {
      const { createSession } = await import('/runtime/web/api.js');
      const session = await createSession();
      try {
        await session.run({ guest: Uint8Array.from(guest) });
      } catch (caught) {
        const error = caught as ExecutionError;
        return error.code;
      } finally {
        await session.dispose();
      }
    }, guest);
    expect(code).toBe('UNSUPPORTED_ENV');
  } finally {
    await unisolated.close();
  }
});
test('cross-origin Worker is explicitly rejected instead of blob fallback', async ({
  page,
}) => {
  const code = await page.evaluate(async (guest) => {
    const { createSession } = await import('/runtime/web/api.js');
    const assets = {
      loaderURL: `${location.origin}/missing`,
      wasmURL: `${location.origin}/missing`,
      buildInfoURL: `${location.origin}/missing`,
      workerURL: 'https://example.invalid/worker.js',
    };
    const session = await createSession({ assets });
    try {
      await session.run({ guest: Uint8Array.from(guest) });
    } catch (caught) {
      const error = caught as ExecutionError;
      return error.code;
    } finally {
      await session.dispose();
    }
  }, guest);
  expect(code).toBe('UNSUPPORTED_ENV');
});
test('CPU-bound browser Worker timeout releases BUSY reservation after termination', async ({
  page,
}) => {
  const result = await page.evaluate(async (guest) => {
    const { createSession } = await import('/runtime/web/api.js');
    const assets = {
      loaderURL: `${location.origin}/missing`,
      wasmURL: `${location.origin}/missing`,
      buildInfoURL: `${location.origin}/missing`,
      workerURL: `${location.origin}/tests/package/fixtures/quiet-worker.js`,
    };
    const session = await createSession({ assets });
    const running = session
      .run({ guest: Uint8Array.from(guest), timeoutMs: 50 })
      .catch((error: ExecutionError) => error.code);
    let busy: string | undefined;
    try {
      await session.listEntries();
    } catch (caught) {
      const error = caught as ExecutionError;
      busy = error.code;
    }
    const timeout = await running;
    const entries = await session.listEntries();
    await session.dispose();
    return { busy, timeout, count: entries.length };
  }, guest);
  expect(result).toEqual({ busy: 'BUSY', timeout: 'TIMEOUT', count: 0 });
});
