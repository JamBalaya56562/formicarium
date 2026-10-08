export const ERROR_CODES = Object.freeze([
  'INVALID_INPUT', 'ASSET_LOAD', 'UNSUPPORTED_ENV', 'CORE_INIT', 'EXECUTION',
  'SNAPSHOT', 'TIMEOUT', 'ABORTED', 'BUSY', 'DISPOSED', 'NOT_FOUND', 'NOT_FILE',
]);

/** Public failures preserve received bytes without serializing caller secrets. */
export class ExecutionError extends Error {
  constructor(code, message = code, { runId, stdout, stderr, cause } = {}) {
    if (!ERROR_CODES.includes(code)) throw new TypeError('unknown execution error code');
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'ExecutionError';
    this.code = code;
    if (runId !== undefined) this.runId = runId;
    this.stdout = new Uint8Array(stdout ?? 0);
    this.stderr = new Uint8Array(stderr ?? 0);
  }
}

export function failure(code, message, details) {
  return new ExecutionError(code, message, details);
}

export function invalid(condition, message) {
  if (!condition) throw failure('INVALID_INPUT', message);
}

/** Only code and fixed description cross the Worker diagnostic boundary. */
export function safeCause(code) {
  return Object.freeze({ code: ERROR_CODES.includes(code) ? code : 'EXECUTION', message: 'Run failed before cleanup completed' });
}
