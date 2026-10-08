import { createHash } from 'node:crypto';
import { readFile, readdir, lstat, realpath } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { PACKAGE_FILES } from '../package/stage-package.mjs';

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export async function directoryIdentity(directory) {
  const root = await realpath(directory), files = [];
  async function walk(current, prefix = '') {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(join(current, entry.name), relative);
      else if (entry.isFile()) {
        const bytes = await readFile(join(current, entry.name));
        files.push({ path: relative, size: bytes.length, sha256: sha256(bytes) });
      } else throw new Error(`candidate special file refused: ${relative}`);
    }
  }
  await walk(root); files.sort((a, b) => a.path.localeCompare(b.path));
  return { root, files, sha256: sha256(JSON.stringify(files)) };
}

export async function verifyInstalledPackage({ packageRoot, manifestPath, tarballPath }) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.package !== '@aletheia-works/formicarium' || manifest.blinkSourceDirty !== false) throw new Error('package identity invalid');
  if (!Array.isArray(manifest.files) || manifest.files.length !== PACKAGE_FILES.length ||
      new Set(manifest.files.map((file) => file.path)).size !== PACKAGE_FILES.length ||
      !manifest.files.every((file) => PACKAGE_FILES.includes(file.path))) throw new Error('fixed package inventory differs');
  for (const entry of manifest.files) {
    const target = resolve(packageRoot, entry.path);
    if (!target.startsWith(`${resolve(packageRoot)}${sep}`) || !(await lstat(target)).isFile() || sha256(await readFile(target)) !== entry.sha256) {
      throw new Error(`installed package changed: ${entry.path}`);
    }
  }
  return { version: manifest.version, files: manifest.files, manifestSha256: sha256(await readFile(manifestPath)),
    tarballSha256: sha256(await readFile(tarballPath)), status: 'local-pack; published RC acceptance unverified' };
}

/** Bind a main-observed result to identities; this function does not run checks. */
export function resultEvidence({ command, exitCode, sourceIdentity, candidateIdentity, stdout, stderr, status }) {
  if (typeof command !== 'string' || !command.trim() || !Number.isInteger(exitCode) ||
      !/^[a-f0-9]{64}$/.test(sourceIdentity) || !/^[a-f0-9]{64}$/.test(candidateIdentity)) throw new Error('invalid observed result identity');
  if (status !== 'observed') throw new Error('unobserved result must not be called successful');
  return { command, exitCode, sourceIdentity, candidateIdentity,
    stdoutSha256: sha256(stdout ?? ''), stderrSha256: sha256(stderr ?? ''), status };
}
