import { failure, safeCause } from './errors.mjs';
import { validateRun } from './validation.mjs';
import { identity, inspectMessage, joinBytes } from './protocol.mjs';

let nextSessionId = 0;
const defaultClock = () => globalThis.performance?.now() ?? Date.now();

/** Adapter injection is internal; public package exports only environment APIs. */
export function createLifecycle(state, {
  spawn, assets, clock = defaultClock, timers = globalThis,
  cleanupTimeoutMs = 1000, sessionId = `session-${++nextSessionId}`,
} = {}) {
  let active = null;
  let generation = 0;
  let disposed = false;
  let disposal = null;

  const received = (run) => ({ runId: run.runId, stdout: joinBytes(run.streams.stdout), stderr: joinBytes(run.streams.stderr) });
  const runFailure = (run, code) => failure(code, `Run failed: ${code}`, received(run));
  const stopDeadline = (run) => timers.clearTimeout(run.deadlineTimer);

  function scheduleDeadline(run) {
    const remaining = run.deadline - clock();
    if (remaining <= 0) { terminate(run, { error: runFailure(run, 'TIMEOUT') }); return; }
    run.deadlineTimer = timers.setTimeout(() => scheduleDeadline(run), Math.min(remaining, 2_147_483_647));
  }

  function finish(run, cleanupError) {
    stopDeadline(run);
    run.input.signal?.removeEventListener('abort', run.abort);
    let error = run.decision.error;
    if (cleanupError) {
      error = failure('EXECUTION', 'Worker cleanup could not be confirmed', { ...received(run), cause: safeCause(error?.code ?? 'EXECUTION') });
      disposed = true;
    }
    if (disposed) state.dispose();
    else if (!error) {
      try { state.commit(run.decision.snapshot); }
      catch (cause) { error = runFailure(run, cause.code === 'SNAPSHOT' ? 'SNAPSHOT' : 'EXECUTION'); }
    }
    state.release();
    active = null;
    run.phase = 'settled';
    if (error) run.reject(error);
    else run.resolve({ ...run.decision.result, elapsedMs: Math.max(0, clock() - run.startedAt) });
    if (run.disposeResolve) {
      if (cleanupError) run.disposeReject(error);
      else run.disposeResolve();
    }
  }

  function terminate(run, decision) {
    if (run.phase === 'settled') return;
    if (run.phase === 'terminating') {
      // Abort/dispose can invalidate a validated done candidate during cleanup.
      if (decision.error?.code === 'ABORTED' && !run.decision.error) run.decision = decision;
      if (disposed) run.decision = { error: runFailure(run, 'ABORTED') };
      return;
    }
    run.phase = 'terminating';
    run.decision = decision;
    stopDeadline(run);
    let watchdog;
    const deadline = new Promise((_, reject) => {
      watchdog = timers.setTimeout(() => reject(new Error('cleanup deadline')), cleanupTimeoutMs);
    });
    const cleanup = Promise.resolve().then(() => {
      run.worker?.detach?.();
      return run.worker?.terminate();
    });
    Promise.race([cleanup, deadline]).then(
      () => { timers.clearTimeout(watchdog); finish(run, false); },
      () => { timers.clearTimeout(watchdog); finish(run, true); },
    );
  }

  function message(run, value) {
    if (run.phase === 'terminating' || run.phase === 'settled') return;
    if (clock() >= run.deadline) { terminate(run, { error: runFailure(run, 'TIMEOUT') }); return; }
    if (run.input.signal?.aborted || disposed) { terminate(run, { error: runFailure(run, 'ABORTED') }); return; }
    try {
      const parsed = inspectMessage(value, run, run.streams);
      if (!parsed) return;
      if (parsed.type === 'output') {
        run.sequence++;
        run.streams[parsed.chunk.stream].push(new Uint8Array(parsed.chunk.bytes));
        run.input.onOutput?.({ ...parsed.chunk, bytes: new Uint8Array(parsed.chunk.bytes) });
      } else if (parsed.type === 'error') terminate(run, { error: runFailure(run, parsed.code) });
      else {
        const snapshot = state.validateSnapshot(parsed.snapshot);
        terminate(run, { snapshot, result: parsed.result });
      }
    } catch (error) { terminate(run, { error: runFailure(run, error.code === 'SNAPSHOT' ? 'SNAPSHOT' : 'EXECUTION') }); }
  }

  function run(options) {
    let input;
    let entries;
    try {
      state.assertIdle();
      input = validateRun(options, state.home);
      entries = state.reserve();
    } catch (error) { return Promise.reject(error); }
    generation++;
    const startedAt = clock();
    const handle = {
      sessionId, runId: `${sessionId}:${generation}`, generation, input,
      phase: 'preparing', startedAt, deadline: startedAt + input.timeoutMs,
      sequence: 0, streams: { stdout: [], stderr: [] },
    };
    active = handle;
    const result = new Promise((resolve, reject) => { handle.resolve = resolve; handle.reject = reject; });
    handle.abort = () => terminate(handle, { error: runFailure(handle, 'ABORTED') });
    input.signal?.addEventListener('abort', handle.abort, { once: true });
    scheduleDeadline(handle);
    try {
      const request = { ...identity(handle), type: 'run', assets: { ...assets }, guest: input.guest, args: input.args, env: input.env, cwd: state.cwd, home: state.home, entries, snapshotRoots: [...state.roots] };
      handle.worker = spawn(request, {
        message: (value) => message(handle, value),
        error: (error) => terminate(handle, { error: runFailure(handle, ['UNSUPPORTED_ENV', 'ASSET_LOAD'].includes(error?.code) ? error.code : 'EXECUTION') }),
        exit: () => { if (handle.phase !== 'terminating' && handle.phase !== 'settled') terminate(handle, { error: runFailure(handle, 'EXECUTION') }); },
      });
      handle.phase = handle.phase === 'preparing' ? 'running' : handle.phase;
    } catch (error) {
      const code = ['UNSUPPORTED_ENV', 'ASSET_LOAD'].includes(error?.code) ? error.code : 'EXECUTION';
      terminate(handle, { error: runFailure(handle, code) });
    }
    return result;
  }

  function dispose() {
    if (disposal && active) return disposal;
    if (disposed && !active) return Promise.resolve();
    disposed = true;
    state.dispose();
    if (!active) return Promise.resolve();
    disposal = new Promise((resolve, reject) => { active.disposeResolve = resolve; active.disposeReject = reject; });
    terminate(active, { error: runFailure(active, 'ABORTED') });
    return disposal;
  }

  const operation = (name) => (...args) => {
    try { return Promise.resolve(state[name](...args)); }
    catch (error) { return Promise.reject(error); }
  };
  return Object.freeze({ run, dispose, readFile: operation('readFile'), remove: operation('remove'), listEntries: operation('listEntries'), setCwd: operation('setCwd'), reset: operation('reset') });
}
