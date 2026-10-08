import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { elfHeader, isolatedDirectory } from './fixtures.mjs';

test('U1 runner supports ESM, assertions and isolated cleanup on Node >=24', async (t) => {
  assert.ok(Number(process.versions.node.split('.')[0]) >= 24);
  const directory = await isolatedDirectory(t);
  assert.ok(directory.includes('formicarium-u1-'));
  assert.deepEqual([...elfHeader().slice(0, 4)], [127, 69, 76, 70]);
});

test('U1 tool dependencies are installed at the approved exact versions', async () => {
  const dependencies = {
    '@playwright/test': '1.55.0', typescript: '5.9.3', eslint: '9.36.0',
    'istanbul-lib-instrument': '6.0.3', 'istanbul-lib-coverage': '3.2.2',
  };
  for (const [name, version] of Object.entries(dependencies)) {
    const metadata = JSON.parse(await readFile(new URL(`../../node_modules/${name}/package.json`, import.meta.url), 'utf8'));
    assert.equal(metadata.version, version, name);
  }
});

test('U1 browser configuration keeps all three browsers, one worker and no retries', async () => {
  const { default: config } = await import('./playwright.config.mjs');
  assert.deepEqual(config.projects.map(({ name }) => name), ['chromium', 'firefox', 'webkit']);
  assert.equal(config.workers, 1);
  assert.equal(config.retries, 0);
});
