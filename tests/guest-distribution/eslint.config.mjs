export default [{
  files: ['integration/terrarium/guest-distribution/*.mjs', 'scripts/guest-distribution/*.mjs'],
  languageOptions: {
    ecmaVersion: 'latest', sourceType: 'module',
    globals: Object.fromEntries(['URL','Uint8Array','DataView','TextEncoder','TextDecoder',
      'crypto','fetch','process','console','globalThis','structuredClone','Buffer'].map((name)=>[name,'readonly'])),
  },
  rules: { 'no-unused-vars': ['error',{argsIgnorePattern:'^_',caughtErrors:'none'}], 'no-undef':'error', 'eqeqeq':'error' },
}];
