import type {
  CoreLoadOptions,
  ModuleFactory,
  RunRequest,
  Streams,
} from './contracts.js';
import { errorCode } from './contracts.js';
import { type blinkCore, loadPackageCore } from './core.js';
import { runGuest } from './guest-io.js';
import { identity, workerErrorMessage } from './protocol.js';

/** One request owns one fresh core and never owns the persistent session state. */
export async function executeWorkerRequest(
  request: RunRequest,
  {
    post,
    readBytes = async () => {
      throw new Error('Asset reader is unavailable');
    },
    childWorkers,
    resources,
    loadCore = loadPackageCore,
    clock = () => performance.now(),
  }: Partial<Omit<CoreLoadOptions, 'assets'>> & {
    post(message: object): void;
    loadCore?: (options: CoreLoadOptions) => Promise<{
      core: typeof blinkCore & { cleanup?(): void };
      createModule: ModuleFactory;
    }>;
    clock?: () => number;
  },
) {
  const streams: Streams = { stdout: [], stderr: [] };
  let sequence = 0;
  let adapter: Awaited<ReturnType<typeof loadCore>> | undefined;
  const output = (stream: keyof Streams) => (bytes: Uint8Array) => {
    const copy = new Uint8Array(bytes);
    streams[stream].push(copy);
    post({
      ...identity(request),
      type: 'output',
      chunk: {
        runId: request.runId,
        sequence: sequence++,
        stream,
        bytes: copy,
      },
    });
  };
  try {
    adapter = await loadCore({
      assets: request.assets,
      readBytes,
      childWorkers,
      resources,
    });
    const started = clock();
    const result = await runGuest({
      createModule: adapter.createModule,
      core: adapter.core,
      guestPath: '/guest/program',
      entries: [
        ...request.entries,
        {
          path: '/guest/program',
          type: 'file',
          data: new Uint8Array(request.guest),
          mode: 0o755,
        },
      ],
      args: request.args,
      env: request.env,
      cwd: request.cwd,
      snapshotRoots: request.snapshotRoots,
      onStdout: output('stdout'),
      onStderr: output('stderr'),
    });
    if (!Array.isArray(result.snapshot))
      throw Object.assign(new Error('Missing snapshot'), { code: 'SNAPSHOT' });
    await adapter.core.cleanup?.();
    post({
      ...identity(request),
      type: 'done',
      result: {
        runId: request.runId,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        elapsedMs: Math.max(0, clock() - started),
      },
      snapshot: result.snapshot,
    });
  } catch (error) {
    let failure = error;
    try {
      await adapter?.core.cleanup?.();
    } catch {
      failure = { code: 'EXECUTION' };
    }
    post(
      workerErrorMessage(
        request,
        errorCode(failure) ??
          (failure instanceof Error ? errorCode(failure.cause) : undefined) ??
          'EXECUTION',
        streams,
      ),
    );
  }
}
