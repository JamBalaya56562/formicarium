import { readBrowserAsset } from '../../../runtime/web/package-worker.mjs';
self.postMessage({ type: 'inspection', waitAsync: typeof Atomics.waitAsync });
self.addEventListener('message', async ({ data }) => {
  if (data.type !== 'probe-fetch') return;
  try { self.postMessage({ type: 'asset', bytes: await readBrowserAsset(data.url) }); }
  catch { self.postMessage({ type: 'asset', failed: true }); }
});
