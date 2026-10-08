import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Worker } from 'node:worker_threads';
import { createCoreResourceOwner } from '../../runtime/core.js';

/** Real generated source remains intact after the observable test-only prefix. */
export async function mutatedLoaderFixture(
  directory: string,
  assetsRoot: string,
) {
  const threads = createRequire(import.meta.url)(
    'node:worker_threads',
  ) as typeof import('node:worker_threads');
  const NativeWorker = threads.Worker;
  const workers: Worker[] = [];
  threads.Worker = class extends NativeWorker {
    constructor(...args: ConstructorParameters<typeof Worker>) {
      super(...args);
      workers.push(this);
    }
  };
  const original = await readFile(join(assetsRoot, 'blink.mjs'));
  const wasm = await readFile(join(assetsRoot, 'blink.wasm'));
  const metadata = JSON.parse(
    await readFile(join(assetsRoot, 'build-info.json'), 'utf8'),
  );
  const hash = (bytes: Uint8Array) =>
    createHash('sha256').update(bytes).digest('hex');
  metadata.assetDigests = {
    loaderSha256: hash(original),
    wasmSha256: hash(wasm),
  };
  const loaderURL = pathToFileURL(join(directory, 'blink.mjs'));
  await writeFile(loaderURL, original);
  const marker = `__formicarium_unverified_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const changed = Buffer.concat([
    Buffer.from(
      `globalThis[${JSON.stringify(marker)}] = (globalThis[${JSON.stringify(marker)}] ?? 0) + 1;\n`,
    ),
    original,
  ]);
  let switched = false;
  const resources = createCoreResourceOwner({ environment: 'node' });
  return {
    marker,
    resources,
    async dispose() {
      threads.Worker = NativeWorker;
      await Promise.all(workers.map((worker) => worker.terminate()));
      await resources.dispose();
    },
    assets: {
      loaderURL: loaderURL.href,
      wasmURL: pathToFileURL(join(assetsRoot, 'blink.wasm')).href,
      buildInfoURL: pathToFileURL(join(directory, 'build-info.json')).href,
      workerURL: pathToFileURL(join(directory, 'unused.mjs')).href,
    },
    async readBytes(url: string | URL) {
      if (String(url) === String(loaderURL) && !switched) {
        switched = true;
        await writeFile(loaderURL, changed);
        return new Uint8Array(original);
      }
      if (String(url).endsWith('/build-info.json'))
        return new TextEncoder().encode(JSON.stringify(metadata));
      return new Uint8Array(await readFile(new URL(url)));
    },
  };
}
