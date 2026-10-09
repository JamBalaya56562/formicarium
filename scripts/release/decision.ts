import { randomUUID } from 'node:crypto';
import { sha256 } from '../terrarium/evidence.js';
import type { EvidenceIndex } from './evidence.js';
import {
  artifactBytes,
  hex,
  requireCondition,
  resolveEvidence,
  unique,
} from './evidence.js';
import type {
  CandidateIdentity,
  ReleaseApproval,
  ReleaseDecision,
  ReleaseEvidence,
} from './types.js';

export const RC_CHECKS = Object.freeze([
  'pack',
  'assets',
  'types',
  'consumer-node',
  'consumer-chromium',
  'consumer-firefox',
  'consumer-webkit',
  'public-source',
  'supply-chain',
  'trusted-publisher',
]);
export const REGRESSION_CHECKS = Object.freeze([
  'native-baseline',
  'probe-node',
  'probe-chromium',
  'probe-firefox',
  'probe-webkit',
  'aube-node',
  'aube-chromium',
  'aube-firefox',
  'aube-webkit',
  'pitchfork-node',
  'pitchfork-chromium',
  'pitchfork-firefox',
  'pitchfork-webkit',
  'integration-ci',
]);
export const ADOPTION_CHECKS = Object.freeze([
  'terrarium-node',
  'terrarium-chromium',
  'terrarium-firefox',
  'terrarium-webkit',
  'iframe-chromium',
  'iframe-firefox',
  'iframe-webkit',
]);
export const DIFF_CHECKS = Object.freeze([
  'stable-pack',
  'stable-types',
  'stable-consumer-node',
  'stable-consumer-chromium',
  'stable-consumer-firefox',
  'stable-consumer-webkit',
  'stable-diff',
]);
function exact(a: readonly string[], b: readonly string[]) {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}
function checkPassed(e: ReleaseEvidence, id: string) {
  const row = e.checks.find((c) => c.checkId === id);
  return (
    row?.status === 'passed' &&
    row.exitCode === 0 &&
    row.termination === 'exit' &&
    row.unverified.length === 0
  );
}
function required(
  checks: readonly string[],
  envelopes: ReleaseEvidence[],
  missing: string[],
) {
  for (const id of checks) {
    const rows = envelopes.flatMap((e) =>
      e.checks.filter((c) => c.checkId === id),
    );
    if (
      !rows.length ||
      rows.some(
        (c) =>
          c.status !== 'passed' ||
          c.exitCode !== 0 ||
          c.termination !== 'exit' ||
          c.unverified.length > 0,
      )
    )
      missing.push(`check:${id}`);
  }
}
function coveragePassed(e: ReleaseEvidence) {
  const c = e.coverage;
  if (!c) return false;
  let total = 0,
    covered = 0;
  for (const f of c.files) {
    if (
      f.collection === 'missing' ||
      (f.collection === 'measured' && f.realms.length === 0)
    )
      return false;
    total += f.totalLines;
    covered += f.coveredLines;
  }
  return (
    total > 0 && covered / total >= 0.8 && Boolean(c.binding?.executionIdentity)
  );
}
async function adoption(
  root: string,
  index: EvidenceIndex,
  e: ReleaseEvidence,
) {
  const a = e.rcAdoption;
  requireCondition(
    a?.status === 'passed' && e.candidate.version === '0.1.0',
    'RC adoption missing',
  );
  requireCondition(
    a.stable.candidateId === e.candidate.candidateId &&
      a.stable.version === '0.1.0' &&
      a.stable.tarballSha256 === e.candidate.tarballSha256,
    'stable adoption differs',
  );
  const entry = index.entries.find((row) => row.evidenceId === a.rc.evidenceId);
  requireCondition(
    entry?.sha256 === a.rc.evidenceSha256,
    'RC envelope digest differs',
  );
  const rc = await resolveEvidence(root, index, a.rc.evidenceId);
  requireCondition(
    !rc.rcAdoption &&
      rc.candidate.version === '0.1.0-rc.1' &&
      rc.candidate.candidateId === a.rc.candidateId &&
      rc.candidate.tarballSha256 === a.rc.tarballSha256 &&
      a.rc.version === '0.1.0-rc.1',
    'RC identity/cycle differs',
  );
  requireCondition(
    a.rc.publishedPackage.version === '0.1.0-rc.1' &&
      a.rc.publishedPackage.tarballSha256 === rc.candidate.tarballSha256 &&
      /^sha512-[A-Za-z0-9+/]+={0,2}$/.test(
        a.rc.publishedPackage.registryIntegrity,
      ),
    'published RC differs',
  );
  requireCondition(
    exact(a.rc.requiredAcceptanceCheckIds, ADOPTION_CHECKS) &&
      exact(a.diff.validationCheckIds, DIFF_CHECKS),
    'adoption required set differs',
  );
  for (const id of ADOPTION_CHECKS) {
    const c = rc.checks.find((row) => row.checkId === id);
    requireCondition(
      checkPassed(rc, id) &&
        c?.terrarium?.installedVersion === '0.1.0-rc.1' &&
        c.terrarium.baselineCommit &&
        c.terrarium.integrationCommit &&
        hex(c.terrarium.diffSha256) &&
        c.artifactDigests[c.terrarium.diffArtifact] ===
          c.terrarium.diffSha256 &&
        c.guestBuilds.length > 0 &&
        (id === 'terrarium-node' || c.browser),
      'RC acceptance incomplete',
    );
  }
  for (const id of DIFF_CHECKS)
    requireCondition(checkPassed(e, id), 'stable diff check incomplete');
  const bytes = await artifactBytes(root, a.diff.artifact);
  requireCondition(sha256(bytes) === a.diff.sha256, 'diff digest differs');
  const diff = JSON.parse(bytes.toString());
  requireCondition(
    diff.rcCandidateId === rc.candidate.candidateId &&
      diff.rcTarballSha256 === rc.candidate.tarballSha256 &&
      diff.stableCandidateId === e.candidate.candidateId &&
      diff.stableTarballSha256 === e.candidate.tarballSha256 &&
      Array.isArray(diff.changed) &&
      Array.isArray(diff.unchanged),
    'diff candidate binding differs',
  );
}
/** Pure adjudication plus digest-checked reads. Never executes publication. */
export async function decideRelease({
  root,
  index,
  candidate,
  evidenceIds,
  approvals,
  target,
  channel,
}: {
  root: string;
  index: EvidenceIndex;
  candidate: CandidateIdentity;
  evidenceIds: readonly string[];
  approvals: readonly ReleaseApproval[];
  target: string;
  channel: 'rc' | 'stable';
}): Promise<ReleaseDecision> {
  const version = channel === 'rc' ? '0.1.0-rc.1' : '0.1.0',
    missing: string[] = [],
    envelopes: ReleaseEvidence[] = [];
  try {
    unique(evidenceIds, 'decision evidenceId');
    unique(
      approvals.map((a) => a.approvalId),
      'approvalId',
    );
    if (evidenceIds.length === 0) missing.push('evidence:empty');
    for (const id of evidenceIds) {
      const e = await resolveEvidence(root, index, id);
      requireCondition(
        JSON.stringify(e.candidate) === JSON.stringify(candidate) &&
          e.candidate.version === version,
        'direct candidate differs',
      );
      envelopes.push(e);
    }
    required(RC_CHECKS, envelopes, missing);
    if (channel === 'stable') {
      required(REGRESSION_CHECKS, envelopes, missing);
      required(DIFF_CHECKS, envelopes, missing);
      if (!envelopes.length || envelopes.some((e) => !coveragePassed(e)))
        missing.push('coverage:fixed-80%-realms');
      const adopters = envelopes.filter((e) => e.rcAdoption);
      requireCondition(adopters.length > 0, 'RC adoption missing');
      for (const e of adopters) await adoption(root, index, e);
    }
  } catch (error) {
    missing.push(`evidence:${(error as Error).message}`);
  }
  if (candidate.version !== version) missing.push('version');
  const operation = channel === 'rc' ? 'publish-rc' : 'publish-stable';
  const accepted = approvals.filter(
    (a) =>
      a.operation === operation &&
      a.target === target &&
      a.candidateId === candidate.candidateId &&
      a.version === version &&
      a.sourceCommit === candidate.sourceCommit &&
      a.humanInput.trim() &&
      Number.isFinite(Date.parse(a.approvedAt)),
  );
  if (!target || !accepted.length) missing.push(`approval:${operation}`);
  return {
    schemaVersion: 1,
    decisionId: randomUUID(),
    candidateId: candidate.candidateId,
    approvalIds: accepted.map((a) => a.approvalId),
    evidenceIds: [...evidenceIds],
    version,
    tag: `v${version}`,
    distTag: channel === 'rc' ? 'next' : 'latest',
    channel,
    allowed: missing.length === 0,
    missing,
    outcome: missing.length ? 'blocked' : 'not-run',
  };
}
