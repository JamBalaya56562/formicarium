// エミュレータのコアの記述子。コア固有の知識はここだけに置く。
//
// コアは「wasm モジュール 1 つ＋起動用の JS」として扱う。起動用の JS は Emscripten の
// MODULARIZE 形式（ES モジュールの既定エクスポートがファクトリ）であることを前提にする。
// いまのコアは blink の fork（dist/blink/）。paludarium（Rust 版 blink）に置き換えるときは、
// この記述子を差し替える。

/** blink（fork）のコア */
export const blinkCore = {
  name: 'blink',
  /** プロジェクトのルートから見た、起動用 JS の場所 */
  loaderPath: 'dist/blink/blink.mjs',
  /** ビルド情報（コミットなど）の場所 */
  buildInfoPath: 'dist/blink/build-info.json',
  captureModule(module) {
    if (!module?.FS) throw new Error('Core did not provide a filesystem');
    return module;
  },
  /**
   * コアに渡すコマンドライン。blink は `blink [flags] <program> [args...]` の形で受け取る。
   * @param {string} guestPath 仮想ファイルシステム上のゲストのパス
   * @param {string[]} args ゲストに渡す引数
   * @param {string[]} [coreFlags] コア自身へのフラグ（診断用。例：blink の -s はシステムコールの記録）
   */
  argv(guestPath, args, coreFlags = []) {
    return [...coreFlags, guestPath, ...args];
  },
};

export const defaultCore = blinkCore;

/** Distribution layout is distinct from the legacy development dist descriptor. */
export function packageAssets(workerURL) {
  return {
    loaderURL: new URL('../assets/blink.mjs', import.meta.url).href,
    wasmURL: new URL('../assets/blink.wasm', import.meta.url).href,
    buildInfoURL: new URL('../assets/build-info.json', import.meta.url).href,
    workerURL: new URL(workerURL).href,
  };
}

const digest = async (bytes) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((byte) => byte.toString(16).padStart(2, '0')).join('');

/** Verify the asset tuple before evaluating the trusted generated loader. */
export async function loadPackageCore({ assets, readBytes, childWorkers, resources, importModule = (url) => import(url) }) {
  let loader;
  let wasm;
  let info;
  try {
    [loader, wasm, info] = await Promise.all([readBytes(assets.loaderURL), readBytes(assets.wasmURL), readBytes(assets.buildInfoURL)]);
    info = JSON.parse(new TextDecoder().decode(info));
    if (!loader.length || !wasm.length || !/^[0-9a-f]{40}$/.test(info.blinkCommit) || info.blinkSourceDirty !== false) throw new Error('provenance');
    if (info.assetDigests?.loaderSha256 !== await digest(loader) || info.assetDigests?.wasmSha256 !== await digest(wasm)) throw new Error('asset digest');
  } catch { throw Object.assign(new Error('Core assets could not be loaded or verified'), { code: 'ASSET_LOAD' }); }
  const localOwner = resources ? null : createCoreResourceOwner({ environment: globalThis.process?.versions?.node ? 'node' : 'browser', bootstrapURL: assets.workerURL });
  const owner = resources ?? localOwner;
  let descriptor;
  let restoreURL = () => {};
  let factory;
  try {
    descriptor = await owner.allocate(new Uint8Array(loader));
    restoreURL = installVerifiedLoaderURLBridge(descriptor);
    factory = (await importModule(descriptor.moduleURL)).default;
  }
  catch { restoreURL(); await localOwner?.dispose(); throw Object.assign(new Error('Core loader could not be imported'), { code: 'ASSET_LOAD' }); }
  if (typeof factory !== 'function') { restoreURL(); await localOwner?.dispose(); throw Object.assign(new Error('Core factory is unavailable'), { code: 'CORE_INIT' }); }
  const broker = childWorkers ? installChildWorkerBroker({ ...childWorkers, resource: descriptor }) : null;
  let module;
  const core = {
    ...blinkCore,
    captureModule(value) { module = blinkCore.captureModule(value); return module; },
    cleanup() { broker?.dispose(); restoreURL(); if (localOwner) void localOwner.dispose(); const owned = module; module = null; return Boolean(owned); },
  };
  const createModule = async (options) => {
    try {
      return await factory({ ...options, wasmBinary: new Uint8Array(wasm), locateFile: (path) => path.endsWith('.wasm') ? assets.wasmURL : new URL(path, assets.loaderURL).href });
    } catch (error) {
      if (error?.name === 'ExitStatus' || error === 'unwind') throw error;
      throw Object.assign(new Error('Core initialization failed'), { code: 'CORE_INIT' });
    }
  };
  return { createModule, core, buildInfo: info };
}

/** Keep generated pthread knowledge here; the host owns actual browser children. */
export function installChildWorkerBroker({ post, subscribe, resource }) {
  const Original = globalThis.Worker;
  const children = new Map();
  let next = 0;
  class ChildWorker extends EventTarget {
    constructor(url, options = {}) {
      super(); this.id = ++next; children.set(this.id, this);
      // Emscripten emits the Node-only pthread marker even for browser Workers.
      const { workerData, ...browserOptions } = options; void workerData;
      post({ type: 'child-create', childId: this.id, url: String(url), options: browserOptions, ...(resource ? { resourceId: resource.resourceId } : {}) });
    }
    postMessage(payload, transfer = []) { post({ type: 'child-post', childId: this.id, payload }, Array.isArray(transfer) ? transfer : transfer.transfer ?? []); }
    terminate() { children.delete(this.id); post({ type: 'child-terminate', childId: this.id }); }
  }
  const unsubscribe = subscribe((message, ports = []) => {
    const child = children.get(message.childId); if (!child) return;
    if (message.type === 'child-message') {
      const event = new MessageEvent('message', { data: message.payload, ports });
      child.onmessage?.(event); child.dispatchEvent(event);
    } else if (message.type === 'child-error') {
      const event = new Event('error'); child.onerror?.(event); child.dispatchEvent(event);
    }
  });
  globalThis.Worker = ChildWorker;
  return {
    dispose() {
      for (const child of [...children.values()]) child.terminate();
      unsubscribe(); if (globalThis.Worker === ChildWorker) globalThis.Worker = Original;
    },
  };
}


/** Host-owned run resources survive termination of the core Worker. */
export function createCoreResourceOwner({ environment, bootstrapURL }) {
  if (!['node', 'browser'].includes(environment)) throw new Error('invalid resource environment');
  const entries = new Map();
  let closed = false;
  let next = 0;
  let pending = Promise.resolve();
  return {
    async allocate(bytes) {
      if (closed || !(bytes instanceof Uint8Array) || !bytes.length) throw new Error('closed or invalid resource');
      const resourceId = ++next;
      let entry;
      const operation = (async () => {
        if (environment === 'node') {
          const fs = await import('node:fs/promises');
          const { tmpdir } = await import('node:os');
          const { join } = await import('node:path');
          const { pathToFileURL } = await import('node:url');
          const directory = await fs.mkdtemp(join(tmpdir(), 'formicarium-core-'));
          entry = { directory, fs };
          entries.set(resourceId, entry);
          await fs.chmod(directory, 0o700);
          const file = join(directory, 'blink.mjs');
          await fs.writeFile(file, bytes, { flag: 'wx', mode: 0o400 });
          entry.moduleURL = pathToFileURL(file).href;
        } else {
          entry = { moduleURL: URL.createObjectURL(new Blob([bytes], { type: 'text/javascript' })) };
          entries.set(resourceId, entry);
        }
        if (closed) throw new Error('resource creation cancelled');
        return { resourceId, moduleURL: entry.moduleURL, bootstrapURL: environment === 'node' ? entry.moduleURL : bootstrapURL };
      })();
      pending = Promise.allSettled([pending, operation]);
      return operation;
    },
    get(resourceId) { return entries.get(resourceId); },
    async dispose() {
      closed = true;
      await pending;
      for (const entry of entries.values()) {
        if (entry.directory) await entry.fs.rm(entry.directory, { recursive: true, force: true });
        else URL.revokeObjectURL(entry.moduleURL);
      }
      entries.clear();
    },
  };
}

/** The unmodified loader resolves its literal pthread name against import.meta.url. */
export function installVerifiedLoaderURLBridge(descriptor) {
  if (!descriptor.moduleURL.startsWith('blob:')) return () => {};
  const Original = globalThis.URL;
  class CoreURL extends Original {
    constructor(input, base) {
      if (String(input) === 'blink.mjs' && String(base) === descriptor.moduleURL) super(descriptor.bootstrapURL);
      else super(input, base);
    }
  }
  globalThis.URL = CoreURL;
  return () => { if (globalThis.URL === CoreURL) globalThis.URL = Original; };
}

/** Identity-bound resource allocation channel; replies are consumed before run messages. */
export function createCoreResourceClient({ post, subscribe }) {
  let next = 0;
  const pending = new Map();
  const unsubscribe = subscribe(message => {
    if (message.type !== 'resource-ready' && message.type !== 'resource-error') return;
    const request = pending.get(message.resourceRequestId); if (!request) return;
    pending.delete(message.resourceRequestId);
    if (message.type === 'resource-ready') request.resolve(message.descriptor);
    else request.reject(new Error('resource allocation failed'));
  });
  return {
    allocate(bytes) {
      const resourceRequestId = ++next;
      return new Promise((resolve, reject) => { pending.set(resourceRequestId, {resolve, reject}); post({type:'resource-create',resourceRequestId,bytes}); });
    },
    detach() { unsubscribe(); for (const request of pending.values()) request.reject(new Error('resource channel closed')); pending.clear(); },
  };
}

/** Browser pthread bootstrap buffers generated messages until the verified module is ready. */
export async function bootstrapVerifiedBrowserCore(descriptor) {
  if (!descriptor || typeof descriptor.moduleURL !== 'string' || !descriptor.moduleURL.startsWith(`blob:${location.origin}/`)) throw new Error('invalid verified module');
  const queued = [];
  const buffer = event => queued.push(event);
  self.addEventListener('message', buffer);
  const restore = installVerifiedLoaderURLBridge(descriptor);
  try {
    await import(descriptor.moduleURL);
    self.removeEventListener('message', buffer);
    for (const event of queued) self.onmessage?.(event);
  } finally { restore(); }
}
