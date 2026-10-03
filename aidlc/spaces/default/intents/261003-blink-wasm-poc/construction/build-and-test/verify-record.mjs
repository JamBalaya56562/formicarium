import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { validateTimings } from '../../../../../../../scripts/lib/timings.mjs';

const record = 'aidlc/spaces/default/intents/261003-blink-wasm-poc';
const requirements = readFileSync(`${record}/inception/requirements-analysis/requirements.md`, 'utf8');
const ids = [...requirements.matchAll(/\*\*((?:FR\d+\.\d+|NFR\d+))\b/g)].map(match => match[1]);
const trace = JSON.parse(readFileSync(`${record}/construction/code-generation/traceability.json`, 'utf8'));
assert.equal(new Set(ids).size, 17);
for (const id of ids) {
  const entry = trace.coverage.find(row => row.id === id && row.status === 'OK');
  assert.ok(entry, `${id}: coverage missing`);
  assert.ok(existsSync(entry.target), `${id}: target missing: ${entry.target}`);
}
console.log(`TRACEABILITY: ${ids.length}/${ids.length} OK entries with existing targets (not a behavior verdict)`);
const timings = JSON.parse(readFileSync('docs/results/aube-timings.json', 'utf8'));
assert.deepEqual(validateTimings(timings), []);
assert.equal(timings.runs.length, 12);
for (const kind of ['node', 'chromium', 'firefox', 'webkit']) {
  const runs = timings.runs.filter(run => run.environment.kind === kind || run.environment.name.toLowerCase() === kind);
  assert.equal(runs.length, 3, `${kind}: expected 3 timing trials`);
  for (const run of runs) assert.ok(Object.values(run.exitCodes).every(code => code === 0));
}
console.log('TIMINGS: 4 environments x 3 trials, valid metadata, all recorded exit codes 0 (existing data only)');
