import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from '../package/stage-package.js';
import { artifactBytes, hex, requireCondition } from './evidence.js';
import { planPublication, preparePublication, validatePublication } from './publication.js';
import type { PublicationIdentity, PublicationCandidate, PublicationRequest } from './publication.js';
import { assertPublicationContext, validatePublishWorkflow } from './workflow.js';

const json = async (path: string) => JSON.parse(await readFile(path, 'utf8'));
export async function gatePublication(root: string) {
  const request = JSON.parse((await artifactBytes(root, 'request.json')).toString()) as PublicationRequest;
  const manifest = JSON.parse((await artifactBytes(root, 'publication.json')).toString()) as PublicationCandidate;
  requireCondition(manifest.tarball?.path === 'candidate.tgz', 'publication tarball path differs');
  const archive = await validatePublication(manifest, request.identity, join(root, 'candidate.tgz'));
  requireCondition(request.candidate.tarballSha256 === archive.tarball.sha256, 'request tarball differs');
  // Also pins every fixed first-party source in the request to actual archive bytes.
  for (const source of request.candidate.firstPartyJs) {
    const packed = manifest.files.find(row => row.path === source.path);
    const actual = packed?.sha256 ?? sha256(await artifactBytes(root, `sources/${source.path}`));
    requireCondition(actual === source.sha256, 'request first-party source differs');
  }
  const buildInfoBytes = execFileSync('tar', ['-xOzf', join(root, 'candidate.tgz'), 'package/assets/build-info.json']);
  const buildInfo = JSON.parse(buildInfoBytes.toString());
  requireCondition(sha256(buildInfoBytes) === request.candidate.core.buildInfoSha256 && buildInfo.blinkSourceDirty === false && buildInfo.blinkCommit === request.candidate.core.sourceCommit, 'request core provenance differs');
  assertPublicationContext(request.identity, { event: process.env.GITHUB_EVENT_NAME ?? '', repository: process.env.GITHUB_REPOSITORY ?? '', ref: process.env.GITHUB_REF ?? '', sha: process.env.GITHUB_SHA ?? '' });
  requireCondition(request.identity.repository === 'aletheia-works/formicarium' && request.identity.environment === 'release', 'publication target tuple differs');
  validatePublishWorkflow(await readFile('.github/workflows/publish.yml', 'utf8'));
  const decision = await planPublication(root, request);
  requireCondition(decision.allowed, `publication blocked: ${decision.missing.join(',')}`);
  return { request, decision, archive };
}
/** Download an externally approved, SHA-pinned input bundle. No credentials. */
async function fetchBundle(out: string) {
  const url = process.env.FORMICARIUM_RELEASE_INPUT_URL ?? '', digest = process.env.FORMICARIUM_RELEASE_INPUT_SHA256;
  requireCondition(new URL(url).protocol === 'https:' && hex(digest), 'reviewed release inputs missing');
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(120_000) });
  requireCondition(response.ok, 'release input download failed');
  const bytes = Buffer.from(await response.arrayBuffer());
  requireCondition(bytes.length < 256 * 1024 * 1024 && sha256(bytes) === digest, 'release input digest differs');
  const path = `${resolve(out)}.tgz`;
  await mkdir(dirname(resolve(out)), { recursive: true });
  await mkdir(resolve(out), { recursive: false });
  await writeFile(path, bytes, { flag: 'wx' });
  const rows = execFileSync('tar', ['-tzvf', path], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim().split('\n');
  requireCondition(rows.every(row => row[0] === '-' || row[0] === 'd'), 'release bundle links refused');
  const members = execFileSync('tar', ['-tzf', path], { encoding: 'utf8' }).trim().split('\n');
  requireCondition(members.every(member => /^[A-Za-z0-9_.\/-]+$/.test(member) && !member.startsWith('/') && !member.split('/').includes('..') && !member.split('/').includes('.') && !member.split('/').includes('.npmrc')), 'release bundle path unsafe');
  requireCondition(new Set(members).size === members.length, 'release bundle duplicate path');
  execFileSync('tar', ['-xzf', path, '-C', resolve(out)]);
}
export async function publicationCli(args: string[]) {
  const [command, ...paths] = args;
  if (command === 'prepare' && paths.length === 4) return preparePublication({ originalManifestPath: paths[0]!, originalTarballPath: paths[1]!, out: paths[2]!, identity: await json(paths[3]!) as PublicationIdentity });
  if (command === 'validate' && paths.length === 3) return validatePublication(await json(paths[0]!), await json(paths[1]!), paths[2]!);
  if (command === 'plan' && paths.length === 2) return planPublication(paths[0]!, await json(paths[1]!));
  if (command === 'fetch' && paths.length === 1) { await fetchBundle(paths[0]!); return { outcome: 'downloaded-not-published' }; }
  if (['gate', 'publish', 'release'].includes(command ?? '') && paths.length === 1) {
    const result = await gatePublication(paths[0]!);
    if (command === 'gate') return result.decision;
    if (command === 'publish') {
      requireCondition(process.env.AIDLC_RELEASE_OPERATION === 'publish' && Boolean(process.env.ACTIONS_ID_TOKEN_REQUEST_URL) && !process.env.NODE_AUTH_TOKEN && !process.env.NPM_TOKEN, 'isolated OIDC publish job required');
      const npmConfig = `${resolve(paths[0]!)}.empty-npmrc`;
      await writeFile(npmConfig, '', { flag: 'wx' });
      const cleanEnvironment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(npm_config_|node_auth_token$|npm_token$)/i.test(key)));
      execFileSync('npm', ['publish', join(resolve(paths[0]!), 'candidate.tgz'), '--access', 'public', '--registry', 'https://registry.npmjs.org/', '--tag', result.request.identity.distTag, '--ignore-scripts'], { cwd: resolve(paths[0]!), stdio: 'inherit', env: { ...cleanEnvironment, NPM_CONFIG_USERCONFIG: npmConfig, NPM_CONFIG_GLOBALCONFIG: '/dev/null', NPM_CONFIG_PROVENANCE: 'true' } });
      return { outcome: 'publish-command-completed-readback-required' };
    }
    requireCondition(process.env.AIDLC_RELEASE_OPERATION === 'release', 'isolated release job required');
    requireCondition(result.request.approvals.some(a => a.operation === 'create-github-release' && a.target === result.request.identity.repository && a.candidateId === result.request.candidate.candidateId && a.version === result.request.identity.version && a.sourceCommit === result.request.identity.sourceCommit && a.humanInput.trim() && Number.isFinite(Date.parse(a.approvedAt))), 'GitHub Release approval missing');
    execFileSync('gh', ['release', 'create', result.request.identity.tag, join(resolve(paths[0]!), 'candidate.tgz'), '--repo', result.request.identity.repository, '--verify-tag', '--title', `formicarium ${result.request.identity.version}`, '--notes', `Reviewed package SHA256: ${result.archive.tarball.sha256}`, ...(result.request.identity.distTag === 'next' ? ['--prerelease'] : [])], { stdio: 'inherit' });
    return { outcome: 'release-command-completed-readback-required' };
  }
  throw new Error('usage: prepare <old-manifest> <old.tgz> <new-out> <identity>; validate <publication-manifest> <identity> <tgz>; plan <evidence-root> <request>; fetch|gate|publish|release <bundle-root>');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await publicationCli(process.argv.slice(2)), null, 2));
