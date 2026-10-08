import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { elfHeader, isolatedDirectory } from './fixtures.js';

test('U1 runner supports ESM, assertions and isolated cleanup on Node >=24', async (t) => {
  assert.ok(Number(process.versions.node.split('.')[0]) >= 24);
  const directory = await isolatedDirectory(t);
  assert.ok(directory.includes('formicarium-u1-'));
  assert.deepEqual([...elfHeader().slice(0, 4)], [127, 69, 76, 70]);
});

test('U1 tool dependencies match the lockfile', async () => {
  const lock: { packages: Record<string, { version: string }> } = JSON.parse(
    await readFile(new URL('../../package-lock.json', import.meta.url), 'utf8'),
  );
  const dependencies = [
    '@playwright/test',
    'typescript',
    '@biomejs/biome',
    'istanbul-lib-instrument',
    'istanbul-lib-coverage',
  ];
  for (const name of dependencies) {
    const metadata = JSON.parse(
      await readFile(
        new URL(`../../node_modules/${name}/package.json`, import.meta.url),
        'utf8',
      ),
    );
    assert.equal(
      metadata.version,
      lock.packages[`node_modules/${name}`]!.version,
      name,
    );
  }
});

test('U1 browser configuration keeps all three browsers, one worker and no retries', async () => {
  const { default: config } = await import('./playwright.config.ts');
  assert.deepEqual(
    config.projects?.map(({ name }) => name),
    ['chromium', 'firefox', 'webkit'],
  );
  assert.equal(config.workers, 1);
  assert.equal(config.retries, 0);
});
