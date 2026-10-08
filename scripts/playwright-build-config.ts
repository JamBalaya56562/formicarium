/** Coverage instruments emitted JavaScript, so its config must select those files. */
export function compiledTestConfig(source: string, outputDir?: string): string {
  let selected = false;
  let config = source.replace(
    /(\btestMatch:\s*)(['"])([^'"]+)\2/,
    (_match: string, prefix: string, quote: string, pattern: string) => {
      if (!pattern.endsWith('.spec.ts'))
        throw new Error('Expected TypeScript Playwright tests');
      selected = true;
      return `${prefix}${quote}${pattern.slice(0, -2)}js${quote}`;
    },
  );
  if (!selected) throw new Error('Playwright testMatch is missing');
  if (outputDir) {
    if (!/defineConfig\(\s*\{/.test(config))
      throw new Error('Playwright defineConfig is missing');
    config = config.replace(
      /defineConfig\(\s*\{/,
      (match) => `${match}\noutputDir: ${JSON.stringify(outputDir)},\n`,
    );
  }
  return config;
}
