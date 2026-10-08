import assert from 'node:assert/strict';
import test from 'node:test';
import { resultEvidence, sha256 } from '../../scripts/terrarium/evidence.js';

test('main command and raw output are bound to source and candidate identities', () => {
  const evidence = resultEvidence({
    command: 'Bun test formicarium-session.test.ts',
    exitCode: 0,
    sourceIdentity: 'a'.repeat(64),
    candidateIdentity: 'b'.repeat(64),
    stdout: '11 pass',
    stderr: '',
    status: 'observed',
  });
  assert.equal(evidence.stdoutSha256, sha256('11 pass'));
  assert.equal(evidence.exitCode, 0);
});
test('unobserved commands cannot become a success result', () => {
  assert.throws(
    () =>
      resultEvidence({
        command: 'unexecuted',
        exitCode: 0,
        sourceIdentity: 'a'.repeat(64),
        candidateIdentity: 'b'.repeat(64),
        status: 'unverified',
      }),
    /unobserved/,
  );
});
test('nonzero main result remains nonzero evidence', () => {
  const result = resultEvidence({
    command: 'quote reproduction',
    exitCode: 1,
    sourceIdentity: 'a'.repeat(64),
    candidateIdentity: 'b'.repeat(64),
    status: 'observed',
  });
  assert.equal(result.exitCode, 1);
});
test('missing command and malformed digest cannot certify a run', () => {
  // @ts-expect-error Deliberately malformed input exercises the runtime guard.
  assert.throws(() => resultEvidence({ command: '', exitCode: 0 }), /invalid/);
  assert.throws(
    () =>
      resultEvidence({
        command: 'test',
        exitCode: 0,
        sourceIdentity: 'wrong',
        candidateIdentity: 'b'.repeat(64),
        status: 'observed',
      }),
    /invalid/,
  );
});
test('stderr and stdout identities are kept separate', () => {
  const result = resultEvidence({
    command: 'test',
    exitCode: 0,
    sourceIdentity: 'a'.repeat(64),
    candidateIdentity: 'b'.repeat(64),
    stdout: 'out',
    stderr: 'err',
    status: 'observed',
  });
  assert.notEqual(result.stdoutSha256, result.stderrSha256);
});
