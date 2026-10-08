export { ERROR_CODES, ExecutionError } from './errors.js';

/** Display helper only: RunResult's byte streams remain the authoritative output. */
export function decodeUtf8(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array))
    throw new TypeError('decodeUtf8 requires Uint8Array');
  return new TextDecoder().decode(bytes);
}
