import { executeWorkerRequest } from '../worker-execution.mjs';
import { createCoreResourceClient, bootstrapVerifiedBrowserCore } from '../core.mjs';
import { identity, workerErrorMessage } from '../protocol.mjs';

// Keep this before any dynamic core loader import (ADR 0009).
delete Atomics.waitAsync;

export async function readBrowserAsset(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Asset response failed');
  return new Uint8Array(await response.arrayBuffer());
}

let request;
if (typeof self !== 'undefined') {
  self.addEventListener('message', ({ data }) => {
    if (request) return;
    request = data;
    if (self.name === 'em-pthread') {
      if (data?.type !== 'core-bootstrap') return;
      void bootstrapVerifiedBrowserCore(data.descriptor).catch(() => self.postMessage({type:'bootstrap-error'}));
      return;
    }
    if (data?.type !== 'run' || data.protocolVersion !== 1) {
      self.postMessage({ ...identity(data ?? {}), type: 'error', code: 'EXECUTION', message: 'Invalid Worker request', stdout: new Uint8Array(), stderr: new Uint8Array() });
      return;
    }
    const childWorkers = {
      post(message, transfer = []) { self.postMessage({ ...identity(data), ...message }, transfer); },
      subscribe(listener) {
        const callback = (event) => {
          const message = event.data;
          if (message?.protocolVersion === data.protocolVersion && message.sessionId === data.sessionId && message.runId === data.runId && message.generation === data.generation && typeof message.type === 'string' && (message.type.startsWith('child-') || message.type.startsWith('resource-'))) listener(message, event.ports);
        };
        self.addEventListener('message', callback);
        return () => self.removeEventListener('message', callback);
      },
    };
    const resources = createCoreResourceClient(childWorkers);
    void executeWorkerRequest(data, { post: (message) => self.postMessage(message), readBytes: readBrowserAsset, childWorkers, resources });
  });
  self.addEventListener('error', (event) => {
    if (event.error?.name === 'ExitStatus' || event.error === 'unwind' || /ExitStatus|unwind/.test(String(event.message))) { event.preventDefault(); return; }
    if (request) self.postMessage(workerErrorMessage(request, 'EXECUTION', { stdout: [], stderr: [] }));
  });
}
