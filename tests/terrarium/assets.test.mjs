import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { directoryIdentity, verifyInstalledPackage, sha256 } from '../../scripts/terrarium/evidence.mjs';
import { PACKAGE_FILES } from '../../scripts/package/stage-package.mjs';
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'u3-assets-')); t.after(() => rm(root, { recursive: true, force: true }));
  const packageRoot = join(root, 'package'); await mkdir(packageRoot);
  for (const path of PACKAGE_FILES) {
    const filename = join(packageRoot, path); await mkdir(join(filename, '..'), { recursive: true });
    await writeFile(filename, 'export {};');
  }
  const manifestPath = join(root, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify({ package: '@aletheia-works/formicarium', version: '0.1.0-rc.1', blinkSourceDirty: false, files: PACKAGE_FILES.map((path) => ({ path, sha256: sha256('export {};') })) }));
  const tarballPath = join(root, 'pack.tgz'); await writeFile(tarballPath, 'pack');
  return { root, packageRoot, manifestPath, tarballPath };
}
test('installed bytes and tarball identity remain local pack evidence', async (t) => {
  const f = await fixture(t), identity = await verifyInstalledPackage(f);
  assert.equal(identity.tarballSha256, sha256('pack')); assert.match(identity.status, /published RC acceptance unverified/);
});
test('changed installed file fails exact supply digest', async (t) => {
  const f = await fixture(t); await writeFile(join(f.packageRoot, 'runtime/web/package-worker.mjs'), 'changed');
  await assert.rejects(verifyInstalledPackage(f), /installed package changed/);
});
test('candidate identity contains every file and changes for same-length replacement', async (t) => {
  const f = await fixture(t); const before = await directoryIdentity(f.packageRoot);
  await writeFile(join(f.packageRoot, 'runtime/web/package-worker.mjs'), 'export{ };');
  const after = await directoryIdentity(f.packageRoot); assert.notEqual(before.sha256, after.sha256);
  assert.equal(before.files.length, 23);
});
test('candidate symlinks cannot hide bytes outside the supply root', async (t) => {
  const f = await fixture(t); await symlink(f.tarballPath, join(f.packageRoot, 'alias'));
  await assert.rejects(directoryIdentity(f.packageRoot), /special file refused/);
});
test('missing installed worker fails rather than producing success evidence', async (t) => {
  const f = await fixture(t); await rm(join(f.packageRoot, 'runtime/web/package-worker.mjs'));
  await assert.rejects(verifyInstalledPackage(f), { code: 'ENOENT' });
});
