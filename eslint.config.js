import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

export default [
  { ignores: ['dist/', '.astro/', 'node_modules/', 'public/pdfjs/', 'tests/e2e/.tmp/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['error', 'warn'] }],
    },
  },
  { files: ['**/*.mjs', 'scripts/**', 'tests/e2e/**'], languageOptions: { globals: { process: 'readonly', console: 'readonly', URL: 'readonly' } }, rules: { 'no-console': 'off' } },
  { files: ['tests/e2e/**'], rules: { 'no-undef': 'off' } }, // page.evaluate callbacks run in the browser; Node globals are used freely
];
