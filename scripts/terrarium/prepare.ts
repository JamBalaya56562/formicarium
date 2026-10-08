import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  directoryIdentity,
  sha256,
  verifyInstalledPackage,
} from './evidence.js';

/** Inventory-only preparation; stage/build/test commands remain main-owned. */
export async function prepareIntegration({
  out,
  site,
  terrarium,
  packageManifest,
  tarball,
}: {
  out: string;
  site: string;
  terrarium: string;
  packageManifest: string;
  tarball: string;
}) {
  const packageRoot = join(
    terrarium,
    'packages/terrarium/node_modules/@aletheia-works/formicarium',
  );
  const pack = await verifyInstalledPackage({
    packageRoot,
    manifestPath: packageManifest,
    tarballPath: tarball,
  });
  const candidate = await directoryIdentity(site);
  const sourcePaths = [
    'packages/terrarium/src/formicarium-session.ts',
    'packages/terrarium/src/catalog.ts',
    'packages/terrarium/src/terminal.ts',
    'web/terminal.mjs',
  ];
  const source = [];
  for (const path of sourcePaths)
    source.push({
      path,
      sha256: sha256(await readFile(join(terrarium, path))),
    });
  const identity = {
    schemaVersion: 1,
    pack,
    candidate,
    source,
    sourceIdentity: sha256(JSON.stringify(source)),
    baselineCommit: '60dd0dc448f3a67d226dc8a3c6b3afcf4709823d',
    scope: 'existing terrarium adoption; no emulator-specific consumer code',
    unverified: [
      'published RC acceptance',
      'real GitHub Pages',
      'real Safari',
      'combined CI',
    ],
  };
  await mkdir(resolve(out));
  await writeFile(
    join(out, 'identity.json'),
    `${JSON.stringify(identity, null, 2)}\n`,
  );
  return identity;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const [inputPath] = process.argv.slice(2);
  if (!inputPath) throw new Error('usage: prepare.js <input-json>');
  console.log(
    JSON.stringify(
      await prepareIntegration(JSON.parse(await readFile(inputPath, 'utf8'))),
    ),
  );
}
