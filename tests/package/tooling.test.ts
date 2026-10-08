import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';
import { Script } from 'node:vm';
import { compiledTestConfig } from '../../scripts/playwright-build-config.js';

for (const suite of ['package', 'guest-distribution'])
  test(
    suite +
      ' coverage selects instrumented JavaScript with valid TypeScript configuration',
    async () => {
      const source = await readFile(
        new URL(`../${suite}/playwright.config.ts`, import.meta.url),
        'utf8',
      );
      const config = compiledTestConfig(source, '/tmp/browser-results');
      assert.match(config, /testMatch:\s*['"][^'"]*\.spec\.js['"]/);
      assert.match(config, /outputDir:/);
      assert.doesNotThrow(() => stripTypeScriptTypes(config));
    },
  );
test('coverage refuses a missing test selector', () => {
  assert.throws(() => compiledTestConfig('export default {};'), /testMatch/);
});
test('emitted isolation worker remains a classic script and installs all handlers', async () => {
  const handlers: string[] = [];
  const source = await readFile(
    new URL('../../runtime/web/coi-sw.js', import.meta.url),
    'utf8',
  );
  const script = new Script(source);
  script.runInNewContext({
    self: {
      addEventListener(name: string) {
        handlers.push(name);
      },
    },
    Headers,
    Response,
    fetch,
    console,
  });
  assert.deepEqual(handlers, ['install', 'activate', 'fetch']);
});
