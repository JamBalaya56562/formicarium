import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Minimal ELF header for boundary tests; it is deliberately not executable. */
export function elfHeader({ interpreter = false } = {}) {
  const bytes = new Uint8Array(120);
  bytes.set([0x7f, 69, 76, 70, 2, 1, 1]);
  const view = new DataView(bytes.buffer);
  view.setUint16(16, 2, true);
  view.setUint16(18, 62, true);
  view.setUint32(20, 1, true);
  view.setUint16(52, 64, true);
  view.setUint16(54, 56, true);
  view.setBigUint64(32, 64n, true);
  view.setUint16(56, 1, true);
  view.setUint32(64, interpreter ? 3 : 1, true);
  view.setBigUint64(96, 120n, true);
  view.setBigUint64(104, 120n, true);
  return bytes;
}

export function fileEntry(path = '/work/input', data = Uint8Array.of(1, 2), mode = 0o644) {
  return { path, type: 'file', inodeId: `seed:${path}`, data, mode };
}

export async function isolatedDirectory(test) {
  const directory = await mkdtemp(join(tmpdir(), 'formicarium-u1-'));
  test.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

/** Small FS oracle: links share nodes, lstat never follows symlinks. */
export function memoryFs() {
  let inode = 1;
  const nodes = new Map([['/', { mode: 0o40755, ino: inode++ }]]);
  const find = (path) => {
    const node = nodes.get(path);
    if (!node) throw Object.assign(new Error('not found'), { code: 'ENOENT' });
    return node;
  };
  return {
    nodes,
    analyzePath(path) { return { exists: nodes.has(path), object: nodes.get(path) }; },
    isDir(mode) { return (mode & 0o170000) === 0o40000; },
    mkdir(path, mode = 0o755) {
      const parent = path.slice(0,path.lastIndexOf('/')) || '/';
      const node = find(parent);
      if ((node.mode & 0o170000) !== 0o40000) throw Object.assign(new Error('parent is not a directory'),{code:'ENOTDIR'});
      if (nodes.has(path)) throw Object.assign(new Error('already exists'),{code:'EEXIST'});
      nodes.set(path, { mode: 0o40000 | mode, ino: inode++ });
    },
    writeFile(path, data) {
      const node = nodes.get(path) ?? { mode: 0o100644, ino: inode++ };
      node.data = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
      nodes.set(path, node);
    },
    readFile(path) { return new Uint8Array(find(path).data); },
    chmod(path, mode) { const node = find(path); node.mode = (node.mode & 0o170000) | mode; },
    symlink(target, path) { nodes.set(path, { mode: 0o120777, ino: inode++, target }); },
    readlink(path) { return find(path).target; },
    link(source, target) { nodes.set(target, find(source)); },
    lstat(path) { const node = find(path); return { mode: node.mode, ino: node.ino }; },
    readdir(path) {
      const prefix = path === '/' ? '/' : `${path}/`;
      return ['.', '..', ...[...nodes.keys()].filter((name) => name !== path && name.startsWith(prefix) && !name.slice(prefix.length).includes('/')).map((name) => name.slice(prefix.length))];
    },
    init(input, stdout, stderr) { this.stdout = stdout; this.stderr = stderr; },
    chdir(path) { find(path); this.cwd = path; },
    unlink(path) { find(path); nodes.delete(path); },
    rmdir(path) { find(path); nodes.delete(path); },
  };
}

export async function developmentAssets(test) {
  const directory = await isolatedDirectory(test);
  const base = new URL('../../dist/blink/', import.meta.url);
  const loader = await readFile(new URL('blink.mjs', base));
  const wasm = await readFile(new URL('blink.wasm', base));
  const buildInfo = JSON.parse(await readFile(new URL('build-info.json', base), 'utf8'));
  const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
  buildInfo.assetDigests = { loaderSha256: hash(loader), wasmSha256: hash(wasm) };
  const infoPath = join(directory, 'build-info.json');
  await writeFile(infoPath, JSON.stringify(buildInfo));
  return { loaderURL: new URL('blink.mjs', base), wasmURL: new URL('blink.wasm', base), buildInfoURL: pathToFileURL(infoPath), workerURL: new URL('../../runtime/node/package-worker.mjs', import.meta.url) };
}

/** Explicit localhost server; each test owns its port and isolation headers. */
export async function serveDirectory(root, { isolated = true, extraFiles = {}, csp } = {}) {
  const server = createServer(async (request, response) => {
    if (isolated) {
      response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    }
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    if (csp) response.setHeader('Content-Security-Policy', csp);
    try {
      const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (path.split('/').includes('..') || path.includes('\0')) throw new Error('invalid path');
      const extra = extraFiles[path];
      const content = (typeof extra === 'function' ? await extra(request) : extra) ?? (path === '/' ? '<!doctype html><title>U1 consumer</title>' : await readFile(join(root, path)));
      response.setHeader('Content-Type', path.endsWith('.mjs') ? 'text/javascript' : path.endsWith('.wasm') ? 'application/wasm' : path === '/' ? 'text/html' : 'application/octet-stream');
      response.end(content);
    } catch { response.statusCode = 404; response.end('missing'); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) };
}
