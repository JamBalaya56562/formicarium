import test from 'node:test';
import assert from 'node:assert/strict';
import { ERROR_CODES, ExecutionError, failure, invalid, safeCause } from '../../runtime/errors.mjs';

test('public ExecutionError retains its code and Error identity', () => {
  const error = new ExecutionError('TIMEOUT', 'Run timed out');
  assert.ok(error instanceof Error);
  assert.equal(error.name, 'ExecutionError');
  assert.equal(error.code, 'TIMEOUT');
});
test('ExecutionError copies stdout and stderr independently', () => {
  const bytes = Uint8Array.of(255);
  const error = failure('EXECUTION', 'failed', { stdout: bytes, stderr: bytes, runId: 'r1' });
  bytes[0] = 0;
  error.stdout[0] = 1;
  assert.deepEqual(error.stderr, Uint8Array.of(255));
  assert.equal(error.runId, 'r1');
});
test('missing error output is represented by empty byte arrays', () => {
  const error = failure('BUSY');
  assert.equal(error.stdout.length, 0);
  assert.equal(error.stderr.length, 0);
  assert.equal(Object.hasOwn(error, 'runId'), false);
});
test('unknown error code is rejected and published code inventory is immutable', () => {
  assert.throws(() => failure('OTHER'), TypeError);
  assert.equal(ERROR_CODES.length, 12);
  assert.throws(() => ERROR_CODES.push('OTHER'), TypeError);
});
test('local cause is preserved without automatic serialization', () => {
  const cause = { code: 'TIMEOUT' };
  assert.equal(failure('EXECUTION', 'cleanup failed', { cause }).cause, cause);
});
test('validation and safe causes contain fixed explanations', () => {
  assert.doesNotThrow(() => invalid(true, 'unused'));
  assert.throws(() => invalid(false, 'invalid'), { code: 'INVALID_INPUT' });
  assert.equal(safeCause('TIMEOUT').code, 'TIMEOUT');
  assert.equal(safeCause('secret env value').code, 'EXECUTION');
  assert.equal(JSON.stringify(safeCause('secret env value')).includes('secret'), false);
});
