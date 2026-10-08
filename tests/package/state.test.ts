import assert from 'node:assert/strict';
import test from 'node:test';
import { SessionState } from '../../runtime/state.js';
import { fileEntry } from './fixtures.js';

const create = (
  entries: import('../../types/index.js').FsEntry[] = [fileEntry()],
) => new SessionState({ entries });
test('state owns copied seed and returns read/list copies', () => {
  const entry = fileEntry();
  const state = create([entry]);
  entry.data[0] = 99;
  const bytes = state.readFile(entry.path);
  bytes[0] = 77;
  const list = state.listEntries('/work');
  assert.ok(list[0].type === 'file');
  list[0].data[0] = 88;
  assert.deepEqual(state.readFile(entry.path), Uint8Array.of(1, 2));
});
test('listEntries sorts direct children and does not follow files or symlinks', () => {
  const state = create([
    fileEntry('/work/z'),
    fileEntry('/work/a/deep'),
    { path: '/work/link', type: 'symlink' as const, target: './a' },
  ]);
  assert.deepEqual(
    state.listEntries('/work').map(({ path }) => path),
    ['/work/a', '/work/link', '/work/z'],
  );
  assert.deepEqual(state.listEntries('/work/z'), []);
  assert.deepEqual(state.listEntries('/work/link'), []);
});
test('read distinguishes missing, directories and symlinks', () => {
  const state = create([
    { path: '/work/link', type: 'symlink' as const, target: '/work/input' },
  ]);
  assert.throws(() => state.readFile('/work/missing'), { code: 'NOT_FOUND' });
  for (const path of ['/work', '/work/link'])
    assert.throws(() => state.readFile(path), { code: 'NOT_FILE' });
});
test('all public paths reject escapes and intermediate symlinks before mutation', () => {
  const state = create([
    fileEntry(),
    { path: '/work/link', type: 'symlink' as const, target: '/work' },
  ]);
  for (const operation of [
    'readFile',
    'remove',
    'listEntries',
    'setCwd',
  ] as const) {
    for (const path of ['/worker/input', '/work/../root', '/work/link/input'])
      assert.throws(() => state[operation](path), { code: 'INVALID_INPUT' });
  }
  assert.equal(state.readFile('/work/input')[0], 1);
});
test('remove is recursive, idempotent and does not remove hard-link peer', () => {
  const file = fileEntry('/work/nested/input');
  const state = create([file, { ...file, path: '/work/peer' }]);
  state.remove('/work/nested');
  state.remove('/work/nested');
  assert.equal(state.readFile('/work/peer')[0], 1);
  assert.throws(() => state.readFile(file.path), { code: 'NOT_FOUND' });
  assert.throws(() => state.remove('/work'), { code: 'INVALID_INPUT' });
});
test('removing a symlink leaves its target and setCwd enforces directory existence', () => {
  const state = create([
    fileEntry('/work/dir/input'),
    { path: '/work/link', type: 'symlink' as const, target: './dir' },
  ]);
  state.remove('/work/link');
  assert.equal(state.readFile('/work/dir/input')[0], 1);
  state.setCwd('/work/dir');
  assert.equal(state.listEntries()[0].path, '/work/dir/input');
  assert.throws(() => state.setCwd('/work/missing'), { code: 'NOT_FOUND' });
  assert.throws(() => state.setCwd('/work/dir/input'), { code: 'NOT_FILE' });
});
test('reset restores copied seed, cwd and keeps independent sessions independent', () => {
  const entry = fileEntry('/work/dir/input');
  const first = create([entry]);
  const second = create([entry]);
  first.setCwd('/work/dir');
  first.remove(entry.path);
  first.reset();
  assert.equal(first.cwd, '/work');
  assert.equal(first.readFile(entry.path)[0], 1);
  assert.equal(second.readFile(entry.path)[0], 1);
});
test('synchronous reservation blocks run and every public state operation', () => {
  const state = create();
  const copy = state.reserve();
  copy.find((entry) => entry.type === 'file')!.data[0] = 99;
  for (const operation of [
    () => state.reserve(),
    () => state.readFile('/work/input'),
    () => state.remove('/work/input'),
    () => state.listEntries(),
    () => state.reset(),
    () => state.setCwd('/work'),
  ])
    assert.throws(operation, { code: 'BUSY' });
  state.release();
  assert.equal(state.readFile('/work/input')[0], 1);
});
test('snapshot validation and commit are atomic and preserve deletion', () => {
  const state = create();
  state.reserve();
  assert.throws(() => state.commit([fileEntry('/outside/input')]), {
    code: 'SNAPSHOT',
  });
  state.release();
  assert.equal(state.readFile('/work/input')[0], 1);
  state.reserve();
  state.commit([]);
  state.release();
  assert.throws(() => state.listEntries(), { code: 'NOT_FOUND' });
  state.reset();
  assert.equal(state.readFile('/work/input')[0], 1);
});
test('dispose is irreversible and takes precedence over busy', () => {
  const state = create();
  state.reserve();
  state.dispose();
  state.dispose();
  for (const operation of [
    () => state.reserve(),
    () => state.readFile('/work/input'),
    () => state.reset(),
    () => state.commit([]),
  ])
    assert.throws(operation, { code: 'DISPOSED' });
});
