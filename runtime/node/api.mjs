import { existsSync } from 'node:fs';
import { Worker } from 'node:worker_threads';
import { SessionState } from '../state.mjs';
import { createLifecycle } from '../lifecycle.mjs';
import { identity } from '../protocol.mjs';
import { packageAssets, createCoreResourceOwner } from '../core.mjs';
import { validateAssets } from '../validation.mjs';
import { invalid, failure } from '../errors.mjs';

function spawnNodeWorker(request, handlers) {
  if (Number(process.versions.node.split('.')[0]) < 24) throw failure('UNSUPPORTED_ENV', 'Node >=24 is required');
  const url = new URL(request.assets.workerURL);
  if (url.protocol !== 'file:' || !existsSync(url)) throw failure('ASSET_LOAD', 'Package Worker file is unavailable');
  let worker;
  try { worker = new Worker(url, { type: 'module' }); }
  catch { throw failure('ASSET_LOAD', 'Package Worker could not be created'); }
  const resources = createCoreResourceOwner({ environment: 'node', bootstrapURL: request.assets.workerURL });
  let terminated = false;
  let allocation = false;
  const message = (value) => {
    if (!value?.type?.startsWith('resource-')) { handlers.message(value); return; }
    if (terminated || value.sessionId !== request.sessionId || value.runId !== request.runId || value.generation !== request.generation) return;
    if (value.protocolVersion !== request.protocolVersion || value.type !== 'resource-create' || allocation || !Number.isSafeInteger(value.resourceRequestId) || value.resourceRequestId < 1 || !(value.bytes instanceof Uint8Array)) { handlers.error(failure('EXECUTION', 'Resource control failed')); return; }
    allocation = true;
    void resources.allocate(value.bytes).then(descriptor => { if (!terminated) worker.postMessage({ ...identity(request), type: 'resource-ready', resourceRequestId:value.resourceRequestId, descriptor }); }, () => { if (!terminated) handlers.error(failure('ASSET_LOAD', 'Verified loader resource failed')); });
  };
  const callbacks = { message, error: handlers.error, messageerror: handlers.error, exit: handlers.exit };
  for (const [event, callback] of Object.entries(callbacks)) worker.on(event, callback);
  worker.postMessage(request);
  return {
    detach() { for (const [event, callback] of Object.entries(callbacks)) worker.off(event, callback); },
    async terminate() { terminated = true; await worker.terminate(); await resources.dispose(); },
  };
}

export async function createSession(options = {}) {
  invalid(options && typeof options === 'object' && !Array.isArray(options), 'session options must be an object');
  const assets = validateAssets(options.assets ?? packageAssets(new URL('./package-worker.mjs', import.meta.url)));
  const state = new SessionState(options);
  return createLifecycle(state, { assets, spawn: spawnNodeWorker });
}
