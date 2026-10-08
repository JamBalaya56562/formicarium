import { runGuest } from './guest-io.mjs';
import { loadPackageCore } from './core.mjs';
import { identity, workerErrorMessage } from './protocol.mjs';

/** One request owns one fresh core and never owns the persistent session state. */
export async function executeWorkerRequest(request, { post, readBytes, childWorkers, resources, loadCore = loadPackageCore, clock = () => performance.now() }) {
  const streams = { stdout: [], stderr: [] };
  let sequence = 0;
  let adapter;
  const output = (stream) => (bytes) => {
    const copy = new Uint8Array(bytes);
    streams[stream].push(copy);
    post({ ...identity(request), type: 'output', chunk: { runId: request.runId, sequence: sequence++, stream, bytes: copy } });
  };
  try {
    adapter = await loadCore({ assets: request.assets, readBytes, childWorkers, resources });
    const started = clock();
    const result = await runGuest({
      createModule: adapter.createModule, core: adapter.core, guestPath: '/guest/program',
      entries: [...request.entries, { path: '/guest/program', type: 'file', data: new Uint8Array(request.guest), mode: 0o755 }],
      args: request.args, env: request.env, cwd: request.cwd,
      snapshotRoots: request.snapshotRoots,
      onStdout: output('stdout'), onStderr: output('stderr'),
    });
    if (!Array.isArray(result.snapshot)) throw Object.assign(new Error('Missing snapshot'), { code: 'SNAPSHOT' });
    await adapter.core.cleanup?.();
    post({ ...identity(request), type: 'done', result: { runId: request.runId, exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr, elapsedMs: Math.max(0, clock() - started) }, snapshot: result.snapshot });
  } catch (error) {
    try { await adapter?.core.cleanup?.(); }
    catch { error = { code: 'EXECUTION' }; }
    post(workerErrorMessage(request, error?.code ?? error?.cause?.code ?? 'EXECUTION', streams));
  }
}
