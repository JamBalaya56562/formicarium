import { SessionState } from '../state.mjs';
import { createLifecycle } from '../lifecycle.mjs';
import { packageAssets, createCoreResourceOwner } from '../core.mjs';
import { validateAssets } from '../validation.mjs';
import { invalid, failure } from '../errors.mjs';
import { identity } from '../protocol.mjs';

function spawnBrowserWorker(request, handlers) {
  if (typeof Worker !== 'function' || typeof SharedArrayBuffer !== 'function' || globalThis.crossOriginIsolated !== true) {
    throw failure('UNSUPPORTED_ENV', 'Worker, SharedArrayBuffer and cross-origin isolation are required');
  }
  const url = new URL(request.assets.workerURL);
  if (url.origin !== globalThis.location?.origin || !['http:', 'https:'].includes(url.protocol)) throw failure('UNSUPPORTED_ENV', 'Browser Worker must be served from the same origin');
  let worker;
  const preflight = new AbortController();
  const children = new Map();
  let terminated = false;
  let allocation = false;
  const resources = createCoreResourceOwner({ environment: 'browser', bootstrapURL: request.assets.workerURL });
  const current = (message) => message.sessionId === request.sessionId && message.runId === request.runId && message.generation === request.generation;
  const childControl = (event) => {
    const message = event.data;
    if (!current(message) || terminated) return;
    try {
      if (message.protocolVersion !== request.protocolVersion) throw new Error('child protocol');
      if (!Number.isSafeInteger(message.childId) || message.childId <= 0) throw new Error('child identity');
      if (message.type === 'child-create') {
        const childURL = new URL(message.url);
        const options = message.options;
        if (childURL.origin !== url.origin || !['http:', 'https:'].includes(childURL.protocol) || children.has(message.childId)) throw new Error('child URL');
        if (!options || typeof options !== 'object' || Array.isArray(options) || Object.keys(options).some((key) => !['type', 'name', 'credentials'].includes(key))) throw new Error('child options');
        if (options.type !== undefined && !['module', 'classic'].includes(options.type)) throw new Error('child type');
        if (options.name !== undefined && (typeof options.name !== 'string' || options.name.length > 256)) throw new Error('child name');
        if (options.credentials !== undefined && !['omit', 'same-origin', 'include'].includes(options.credentials)) throw new Error('child credentials');
        const resource = message.resourceId === undefined ? null : resources.get(message.resourceId);
        if (message.resourceId !== undefined && (!resource || message.url !== request.assets.workerURL)) throw new Error('child resource');
        const child = new Worker(childURL, options);
        if (terminated) { child.terminate(); return; }
        children.set(message.childId, child);
        if (message.resourceId !== undefined) {
          child.postMessage({ ...identity(request), type:'core-bootstrap', descriptor:{moduleURL:resource.moduleURL,bootstrapURL:request.assets.workerURL,resourceId:message.resourceId} });
        }
        child.addEventListener('message', (reply) => {
          if (!terminated && children.get(message.childId) === child) worker.postMessage({ ...identity(request), type: 'child-message', childId: message.childId, payload: reply.data }, [...reply.ports]);
        });
        child.addEventListener('error', (error) => {
          error.preventDefault();
          if (!terminated) worker.postMessage({ ...identity(request), type: 'child-error', childId: message.childId });
        });
      } else if (message.type === 'child-post') {
        const child = children.get(message.childId); if (!child) throw new Error('unknown child');
        child.postMessage(message.payload, [...event.ports]);
      } else if (message.type === 'child-terminate') {
        const child = children.get(message.childId); children.delete(message.childId); child?.terminate();
      } else throw new Error('unknown child control');
    } catch { handlers.error(failure('EXECUTION', 'Child Worker control failed')); }
  };
  const callbacks = {
    message: (event) => {
      if (typeof event.data?.type === 'string' && event.data.type.startsWith('resource-')) {
        const message = event.data;
        if (terminated || !current(message)) return;
        if (message.protocolVersion !== request.protocolVersion || message.type !== 'resource-create' || allocation || !Number.isSafeInteger(message.resourceRequestId) || message.resourceRequestId < 1 || !(message.bytes instanceof Uint8Array)) { handlers.error(failure('EXECUTION', 'Resource control failed')); return; }
        allocation = true;
        void resources.allocate(message.bytes).then(descriptor => { if (!terminated) worker.postMessage({...identity(request),type:'resource-ready',resourceRequestId:message.resourceRequestId,descriptor}); }, () => { if (!terminated) handlers.error(failure('ASSET_LOAD', 'Verified loader resource failed')); });
      } else if (typeof event.data?.type === 'string' && event.data.type.startsWith('child-')) childControl(event); else handlers.message(event.data); },
    error: (event) => { event.preventDefault(); handlers.error(event.error); },
    messageerror: () => handlers.error(new Error('Worker message could not be decoded')),
  };
  // Return ownership immediately; deadline/abort can cancel before creation.
  void (async () => {
    try {
      const response = await fetch(url, { signal: preflight.signal });
      if (terminated) { await response.body?.cancel(); return; }
      if (!response.ok) throw new Error('Worker asset response');
      await response.arrayBuffer();
      if (terminated) return;
      worker = new Worker(url, { type: 'module' });
      if (terminated) { worker.terminate(); return; }
      for (const [event, callback] of Object.entries(callbacks)) worker.addEventListener(event, callback);
      worker.postMessage(request);
    } catch {
      if (!terminated) handlers.error(failure('ASSET_LOAD', 'Package Worker could not be loaded or created'));
    }
  })();
  return {
    detach() { for (const [event, callback] of Object.entries(callbacks)) worker?.removeEventListener(event, callback); },
    async terminate() {
      terminated = true; preflight.abort(); worker?.terminate();
      for (const child of children.values()) child.terminate();
      children.clear();
      await resources.dispose();
    },
  };
}

export async function createSession(options = {}) {
  invalid(options && typeof options === 'object' && !Array.isArray(options), 'session options must be an object');
  const assets = validateAssets(options.assets ?? packageAssets(new URL('./package-worker.mjs', import.meta.url)));
  return createLifecycle(new SessionState(options), { assets, spawn: spawnBrowserWorker });
}
