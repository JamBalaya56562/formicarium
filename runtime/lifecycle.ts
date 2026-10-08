import type {
  Assets,
  ErrorCode,
  FsEntry,
  RunOptions,
  RunResult,
  Session,
} from '../types/index.js';
import type {
  Identity,
  RunRequest,
  SpawnWorker,
  Streams,
  WorkerHandle,
} from './contracts.js';
import { errorCode } from './contracts.js';
import type { SessionState } from './state.js';

interface Decision {
  error?: ExecutionError;
  snapshot?: FsEntry[];
  result?: RunResult;
}
interface ActiveRun extends Identity {
  input: ReturnType<typeof validateRun>;
  phase: 'preparing' | 'running' | 'terminating' | 'settled';
  startedAt: number;
  deadline: number;
  sequence: number;
  streams: Streams;
  decision: Decision;
  deadlineTimer?: ReturnType<typeof setTimeout>;
  worker?: WorkerHandle;
  resolve(result: RunResult): void;
  reject(error: unknown): void;
  abort(): void;
  disposeResolve?: () => void;
  disposeReject?: (error: unknown) => void;
}
interface LifecycleOptions {
  spawn: SpawnWorker;
  assets?: Assets;
  clock?: () => number;
  timers?: Pick<typeof globalThis, 'setTimeout' | 'clearTimeout'>;
  cleanupTimeoutMs?: number;
  sessionId?: string;
}
function spawnErrorCode(error: unknown): ErrorCode {
  const code = errorCode(error);
  return code === 'UNSUPPORTED_ENV' || code === 'ASSET_LOAD'
    ? code
    : 'EXECUTION';
}

import type { ExecutionError } from './errors.js';
import { failure, safeCause } from './errors.js';
import { identity, inspectMessage, joinBytes } from './protocol.js';
import { validateRun } from './validation.js';

let nextSessionId = 0;
const defaultClock = () => globalThis.performance?.now() ?? Date.now();

/** Adapter injection is internal; public package exports only environment APIs. */
export function createLifecycle(
  state: SessionState,
  {
    spawn,
    assets = { loaderURL: '', wasmURL: '', workerURL: '', buildInfoURL: '' },
    clock = defaultClock,
    timers = globalThis,
    cleanupTimeoutMs = 1000,
    sessionId = `session-${++nextSessionId}`,
  }: LifecycleOptions,
): Session {
  let active: ActiveRun | null = null;
  let generation = 0;
  let disposed = false;
  let disposal: Promise<void> | null = null;

  const received = (run: ActiveRun) => ({
    runId: run.runId,
    stdout: joinBytes(run.streams.stdout),
    stderr: joinBytes(run.streams.stderr),
  });
  const runFailure = (run: ActiveRun, code: ErrorCode) =>
    failure(code, `Run failed: ${code}`, received(run));
  const stopDeadline = (run: ActiveRun) =>
    timers.clearTimeout(run.deadlineTimer);

  function scheduleDeadline(run: ActiveRun) {
    const remaining = run.deadline - clock();
    if (remaining <= 0) {
      terminate(run, { error: runFailure(run, 'TIMEOUT') });
      return;
    }
    run.deadlineTimer = timers.setTimeout(
      () => scheduleDeadline(run),
      Math.min(remaining, 2_147_483_647),
    );
  }

  function finish(run: ActiveRun, cleanupError: boolean) {
    stopDeadline(run);
    run.input.signal?.removeEventListener('abort', run.abort);
    let error = run.decision.error;
    if (cleanupError) {
      error = failure('EXECUTION', 'Worker cleanup could not be confirmed', {
        ...received(run),
        cause: safeCause(error?.code ?? 'EXECUTION'),
      });
      disposed = true;
    }
    if (disposed) state.dispose();
    else if (!error) {
      try {
        state.commit(run.decision.snapshot);
      } catch (cause) {
        error = runFailure(
          run,
          errorCode(cause) === 'SNAPSHOT' ? 'SNAPSHOT' : 'EXECUTION',
        );
      }
    }
    state.release();
    active = null;
    run.phase = 'settled';
    if (error) run.reject(error);
    else
      run.resolve({
        ...run.decision.result!,
        elapsedMs: Math.max(0, clock() - run.startedAt),
      });
    if (run.disposeResolve) {
      if (cleanupError) run.disposeReject?.(error);
      else run.disposeResolve();
    }
  }

  function terminate(run: ActiveRun, decision: Decision) {
    if (run.phase === 'settled') return;
    if (run.phase === 'terminating') {
      // Abort/dispose can invalidate a validated done candidate during cleanup.
      if (decision.error?.code === 'ABORTED' && !run.decision.error)
        run.decision = decision;
      if (disposed) run.decision = { error: runFailure(run, 'ABORTED') };
      return;
    }
    run.phase = 'terminating';
    run.decision = decision;
    stopDeadline(run);
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise((_, reject) => {
      watchdog = timers.setTimeout(
        () => reject(new Error('cleanup deadline')),
        cleanupTimeoutMs,
      );
    });
    const cleanup = Promise.resolve().then(() => {
      run.worker?.detach?.();
      return run.worker?.terminate();
    });
    Promise.race([cleanup, deadline]).then(
      () => {
        timers.clearTimeout(watchdog);
        finish(run, false);
      },
      () => {
        timers.clearTimeout(watchdog);
        finish(run, true);
      },
    );
  }

  function message(run: ActiveRun, value: unknown) {
    if (run.phase === 'terminating' || run.phase === 'settled') return;
    if (clock() >= run.deadline) {
      terminate(run, { error: runFailure(run, 'TIMEOUT') });
      return;
    }
    if (run.input.signal?.aborted || disposed) {
      terminate(run, { error: runFailure(run, 'ABORTED') });
      return;
    }
    try {
      const parsed = inspectMessage(value, run, run.streams);
      if (!parsed) return;
      if (parsed.type === 'output') {
        run.sequence++;
        run.streams[parsed.chunk.stream].push(
          new Uint8Array(parsed.chunk.bytes),
        );
        run.input.onOutput?.({
          ...parsed.chunk,
          bytes: new Uint8Array(parsed.chunk.bytes),
        });
      } else if (parsed.type === 'error')
        terminate(run, { error: runFailure(run, parsed.code) });
      else {
        const snapshot = state.validateSnapshot(parsed.snapshot);
        terminate(run, { snapshot, result: parsed.result });
      }
    } catch (error) {
      terminate(run, {
        error: runFailure(
          run,
          errorCode(error) === 'SNAPSHOT' ? 'SNAPSHOT' : 'EXECUTION',
        ),
      });
    }
  }

  function run(options: RunOptions): Promise<RunResult> {
    let input: ReturnType<typeof validateRun>;
    let entries: FsEntry[];
    try {
      state.assertIdle();
      input = validateRun(options, state.home);
      entries = state.reserve();
    } catch (error) {
      return Promise.reject(error);
    }
    generation++;
    const startedAt = clock();
    const handle: ActiveRun = {
      sessionId,
      runId: `${sessionId}:${generation}`,
      generation,
      input,
      phase: 'preparing',
      startedAt,
      deadline: startedAt + input.timeoutMs,
      sequence: 0,
      streams: { stdout: [], stderr: [] },
      decision: {},
      resolve: () => {},
      reject: () => {},
      abort: () => {},
    };
    active = handle;
    const result = new Promise<RunResult>((resolve, reject) => {
      handle.resolve = resolve;
      handle.reject = reject;
    });
    handle.abort = () =>
      terminate(handle, { error: runFailure(handle, 'ABORTED') });
    input.signal?.addEventListener('abort', handle.abort, { once: true });
    scheduleDeadline(handle);
    try {
      const request: RunRequest = {
        ...identity(handle),
        type: 'run',
        assets: { ...assets },
        guest: input.guest,
        args: input.args,
        env: input.env,
        cwd: state.cwd,
        home: state.home,
        entries,
        snapshotRoots: [...state.roots],
      };
      handle.worker = spawn(request, {
        message: (value) => message(handle, value),
        error: (error) =>
          terminate(handle, {
            error: runFailure(handle, spawnErrorCode(error)),
          }),
        exit: () => {
          if (handle.phase !== 'terminating' && handle.phase !== 'settled')
            terminate(handle, { error: runFailure(handle, 'EXECUTION') });
        },
      });
      handle.phase = handle.phase === 'preparing' ? 'running' : handle.phase;
    } catch (error) {
      const code = spawnErrorCode(error);
      terminate(handle, { error: runFailure(handle, code) });
    }
    return result;
  }

  function dispose(): Promise<void> {
    if (disposal && active) return disposal;
    if (disposed && !active) return Promise.resolve();
    disposed = true;
    state.dispose();
    if (!active) return Promise.resolve();
    disposal = new Promise((resolve, reject) => {
      active!.disposeResolve = resolve;
      active!.disposeReject = reject;
    });
    terminate(active, { error: runFailure(active, 'ABORTED') });
    return disposal;
  }

  const operation =
    <A extends unknown[], R>(fn: (...args: A) => R) =>
    (...args: A): Promise<R> => {
      try {
        return Promise.resolve(fn(...args));
      } catch (error) {
        return Promise.reject(error);
      }
    };
  return Object.freeze({
    run,
    dispose,
    readFile: operation(state.readFile.bind(state)),
    remove: operation(state.remove.bind(state)),
    listEntries: operation(state.listEntries.bind(state)),
    setCwd: operation(state.setCwd.bind(state)),
    reset: operation(state.reset.bind(state)),
  });
}
