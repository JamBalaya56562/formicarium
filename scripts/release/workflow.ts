import { requireCondition } from './evidence.js';
import { validatePublicationIdentity } from './publication.js';
import type { PublicationIdentity } from './publication.js';

export interface PublicationContext { event: string; repository: string; ref: string; sha: string; }
export function assertPublicationContext(i: PublicationIdentity, c: PublicationContext) {
  validatePublicationIdentity(i);
  requireCondition(c.event === 'push' && c.repository === i.repository && c.ref === `refs/tags/${i.tag}` && c.sha === i.sourceCommit, 'untrusted publication context');
}
/** The workflow uses JSON, a YAML subset, so its actual structure is parsed. */
export function validatePublishWorkflow(text: string) {
  const w = JSON.parse(text);
  requireCondition(JSON.stringify(w.on) === JSON.stringify({ push: { tags: ['v0.1.0-rc.1', 'v0.1.0'] } }), 'publication triggers differ');
  requireCondition(JSON.stringify(w.permissions) === JSON.stringify({ contents: 'read' }), 'global publication permissions differ');
  requireCondition(JSON.stringify(Object.keys(w.jobs).sort()) === JSON.stringify(['publish', 'release', 'verify']), 'publication jobs differ');
  for (const [name, job] of Object.entries(w.jobs) as [string, any][]) {
    requireCondition(job['runs-on'] === 'ubuntu-24.04', 'publication must use GitHub hosted runner');
    const expected = name === 'publish' ? { contents: 'read', 'id-token': 'write' } : name === 'release' ? { contents: 'write' } : { contents: 'read' };
    requireCondition(JSON.stringify(job.permissions) === JSON.stringify(expected), 'job permissions differ');
    requireCondition(job.if === "github.event_name == 'push' && github.repository == 'aletheia-works/formicarium' && (github.ref == 'refs/tags/v0.1.0-rc.1' || github.ref == 'refs/tags/v0.1.0')", 'job origin gate differs');
    if (name !== 'verify') requireCondition(job.environment === 'release' && (name === 'publish' ? job.needs === 'verify' : job.needs === 'publish'), 'publication environment/dependency differs');
    for (const step of job.steps) {
      if (step.uses) requireCondition(/^[^\s]+@[a-f0-9]{40}$/.test(step.uses), 'action not pinned');
      requireCondition(!JSON.stringify(step).match(/NODE_AUTH_TOKEN|NPM_TOKEN|_authToken|secrets\./), 'token fallback refused');
    }
    const runs = job.steps.filter((s: any) => s.run).map((s: any) => s.run);
    requireCondition(runs.includes('node scripts/release/publication-cli.js gate .artifacts/publication'), 'publication gate missing');
    if (name === 'publish') {
      const lastGate = runs.lastIndexOf('node scripts/release/publication-cli.js gate .artifacts/publication');
      requireCondition(lastGate === runs.length - 2, 'publication gate must immediately precede publish');
      requireCondition(runs[runs.length - 1] === 'node scripts/release/publication-cli.js publish .artifacts/publication', 'unvalidated publication command');
    } else requireCondition(!runs.some((r: string) => /npm publish|publication-cli.js publish/.test(r)), 'publish outside isolated job');
  }
  return w;
}
