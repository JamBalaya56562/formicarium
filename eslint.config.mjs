export default [{
  files: ['runtime/**/*.mjs', 'scripts/package/*.mjs'],
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: Object.fromEntries(['URL','Uint8Array','DataView','TextEncoder','TextDecoder','AbortController','SharedArrayBuffer','Worker','Atomics','crypto','performance','fetch','process','console','self','setTimeout','clearTimeout','globalThis','EventTarget','Event','MessageEvent','structuredClone','Blob','location'].map((name) => [name, 'readonly'])) },
  rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }], 'no-undef': 'error', 'eqeqeq': 'error' },
}];
