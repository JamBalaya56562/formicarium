import { failure, ERROR_CODES } from './errors.mjs';
import { equalBytes } from './validation.mjs';

export const PROTOCOL_VERSION = 1;
export const identity = (run) => ({ protocolVersion: PROTOCOL_VERSION, sessionId: run.sessionId, runId: run.runId, generation: run.generation });
export const joinBytes = (chunks) => {
  const bytes = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
};
const requireMessage = (condition) => { if (!condition) throw failure('EXECUTION', 'Worker sent an invalid current-run message'); };

/** Return null for old identities; reject malformed payloads from the active run. */
export function inspectMessage(message, run, streams) {
  requireMessage(message && typeof message === 'object');
  if (message.sessionId !== run.sessionId || message.runId !== run.runId || message.generation !== run.generation) return null;
  requireMessage(message.protocolVersion === PROTOCOL_VERSION);
  if (message.type === 'output') {
    const chunk = message.chunk;
    requireMessage(chunk?.runId === run.runId && chunk.sequence === run.sequence && ['stdout', 'stderr'].includes(chunk.stream) && chunk.bytes instanceof Uint8Array);
    return { type: 'output', chunk: { ...chunk, bytes: new Uint8Array(chunk.bytes) } };
  }
  if (message.type === 'done') {
    const result = message.result;
    requireMessage(result?.runId === run.runId && Number.isInteger(result.exitCode) && result.exitCode >= 0 && result.exitCode <= 255);
    requireMessage(Number.isFinite(result.elapsedMs) && result.elapsedMs >= 0 && result.stdout instanceof Uint8Array && result.stderr instanceof Uint8Array);
    requireMessage(equalBytes(result.stdout, joinBytes(streams.stdout)) && equalBytes(result.stderr, joinBytes(streams.stderr)));
    if (!Array.isArray(message.snapshot)) throw failure('SNAPSHOT', 'Worker did not provide a complete snapshot');
    return { type: 'done', result: { ...result, stdout: new Uint8Array(result.stdout), stderr: new Uint8Array(result.stderr) }, snapshot: message.snapshot };
  }
  if (message.type === 'error') {
    requireMessage(ERROR_CODES.includes(message.code) && typeof message.message === 'string' && message.stdout instanceof Uint8Array && message.stderr instanceof Uint8Array);
    // Worker-provided diagnostics are deliberately not copied into public messages.
    return { type: 'error', code: message.code };
  }
  throw failure('EXECUTION', 'Worker sent an unknown current-run message');
}

export function workerErrorMessage(run, code, streams) {
  return { ...identity(run), type: 'error', code: ERROR_CODES.includes(code) ? code : 'EXECUTION', message: 'Guest execution failed', stdout: joinBytes(streams.stdout), stderr: joinBytes(streams.stderr) };
}
