import test from 'node:test';
import assert from 'node:assert/strict';
import { populateFs, snapshotFs, createOutputCollector, removeTree } from '../../runtime/guest-io.mjs';
import { memoryFs, fileEntry } from './fixtures.mjs';

test('snapshot preserves same-inode hardlinks instead of expanding independent files', () => {
  const FS = memoryFs(); FS.mkdir('/work'); FS.writeFile('/work/a', Uint8Array.of(1)); FS.link('/work/a', '/work/b');
  const snapshot = snapshotFs(FS, '/work');
  const a = snapshot.find(({ path }) => path === '/work/a'); const b = snapshot.find(({ path }) => path === '/work/b');
  assert.equal(typeof a.inodeId, 'string'); assert.ok(a.inodeId.length > 0);
  assert.equal(a.inodeId, b.inodeId);
});
test('snapshot lstat preserves symlink and mode without following target', () => {
  const FS = memoryFs(); FS.mkdir('/work', 0o700); FS.symlink('./missing', '/work/link');
  assert.deepEqual(snapshotFs(FS, '/work'), [{ path: '/work', type: 'dir', mode: 0o700 }, { path: '/work/link', type: 'symlink', target: './missing' }]);
  assert.deepEqual(snapshotFs(FS, '/absent'), []);
});
test('output collector preserves separate byte streams and flushes tails and size boundary', () => {
  const chunks = []; const output = createOutputCollector({ onStdout: (bytes) => chunks.push(bytes) });
  for (let index = 0; index < 4096; index++) output.stdout.byte(255);
  output.stderr.byte(128); output.stdout.byte(0); output.stdout.byte(null);
  assert.equal(chunks.length, 1); assert.equal(chunks[0].length, 4096);
  assert.equal(output.stdout.bytes().length, 4097);
  assert.deepEqual(output.stderr.bytes(), Uint8Array.of(128));
});
test('recursive remove deletes directory children but never follows symlink target', () => {
  const FS = memoryFs(); populateFs(FS, [fileEntry('/work/dir/input'), fileEntry('/work/target'), { path: '/work/link', type: 'symlink', target: './target' }]);
  removeTree(FS, '/work/dir'); removeTree(FS, '/work/link'); removeTree(FS, '/absent');
  assert.equal(FS.analyzePath('/work/dir').exists, false); assert.equal(FS.readFile('/work/target')[0], 1);
});
test('legacy entries without inodeId remain compatible independent files', () => {
  const FS = memoryFs(); populateFs(FS, [{ path: '/work/a', data: 'one' }, { path: '/work/b', data: 'two' }]);
  assert.notEqual(FS.lstat('/work/a').ino, FS.lstat('/work/b').ino);
  assert.equal(new TextDecoder().decode(FS.readFile('/work/a')), 'one');
});
test('restore materializes a shared inode once and recreates hardlinks', () => {
  const FS = memoryFs(); const file = fileEntry('/work/a');
  populateFs(FS, [file, { ...file, path: '/work/b' }]);
  assert.equal(FS.lstat('/work/a').ino, FS.lstat('/work/b').ino);
  FS.writeFile('/work/a', Uint8Array.of(9)); assert.equal(FS.readFile('/work/b')[0], 9);
});
test('restore applies explicit directory mode last regardless of entry ordering', () => {
  const FS = memoryFs();
  populateFs(FS, [fileEntry('/work/dir/input'), { path: '/work/dir', type: 'dir', mode: 0o700 }]);
  assert.equal(FS.lstat('/work/dir').mode & 0o7777, 0o700);
});
test('snapshot refuses unknown special files rather than silently omitting them', () => {
  const FS = memoryFs(); FS.mkdir('/work'); FS.nodes.set('/work/fifo', { mode: 0o10644, ino: 100 });
  assert.throws(() => snapshotFs(FS, '/work'), /snapshot|special/i);
});

test('removed nested cwd recreates every missing ancestor before chdir', async () => {
  const { runGuest } = await import('../../runtime/guest-io.mjs');
  const { blinkCore } = await import('../../runtime/core.mjs');
  const FS = memoryFs();
  const result = await runGuest({ core:blinkCore, guestPath:'/guest/program',entries:[fileEntry('/guest/program')],cwd:'/work/project/sub',snapshotRoots:['/work'],
    createModule: async options => { const module = {FS,ENV:{}}; for(const hook of options.preRun) hook(module); options.onExit(0); return module; },
  });
  assert.equal(result.exitCode,0); assert.equal(FS.cwd,'/work/project/sub');
  for(const path of ['/work','/work/project','/work/project/sub']) assert.equal(FS.lstat(path).mode & 0o777,0o755);
});

test('cwd ancestor recreation preserves explicit modes and refuses file or symlink collisions', async () => {
  const { runGuest } = await import('../../runtime/guest-io.mjs'); const {blinkCore} = await import('../../runtime/core.mjs');
  const execute = entries => {
    const FS = memoryFs();
    return runGuest({core:blinkCore,guestPath:'/guest/program',entries:[fileEntry('/guest/program'),...entries],cwd:'/work/project/sub',snapshotRoots:['/work'],
      createModule:async options => {const module = {FS,ENV:{}}; for(const hook of options.preRun) hook(module); options.onExit(0); return module;},
    });
  };
  const result = await execute([{path:'/work',type:'dir',mode:0o700},{path:'/work/project',type:'dir',mode:0o710}]);
  assert.equal(result.snapshot.find(entry => entry.path === '/work').mode,0o700);
  assert.equal(result.snapshot.find(entry => entry.path === '/work/project').mode,0o710);
  assert.equal(result.snapshot.find(entry => entry.path === '/work/project/sub').mode,0o755);
  await assert.rejects(execute([fileEntry('/work/project')]),/non-directory/);
  await assert.rejects(execute([{path:'/work/target',type:'dir',mode:0o755},{path:'/work/project',type:'symlink',target:'target'}]),/non-directory/);
});
