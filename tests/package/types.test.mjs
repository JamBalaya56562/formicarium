import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const tsc = new URL('../../node_modules/typescript/bin/tsc', import.meta.url);
test('public declaration consumer compiles with strict NodeNext resolution', () => {
  const result = spawnSync(process.execPath, [tsc.pathname, '--project', 'tests/package/tsconfig.json'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
test('invalid declaration consumer rejects missing inode, guest text, bad code and wrong public import', () => {
  const result = spawnSync(process.execPath, [tsc.pathname, '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--strict', '--noEmit', 'tests/package/types-invalid.ts'], { encoding: 'utf8' });
  assert.equal(result.status, 2, result.stdout + result.stderr);
  for (const expected of ['no exported member', 'inodeId', 'Promise<Session>', 'Uint8Array', 'UNKNOWN']) assert.ok(result.stdout.includes(expected), result.stdout);
});
