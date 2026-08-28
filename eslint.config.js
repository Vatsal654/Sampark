/**
 * Purpose: Single flat ESLint config covering every TypeScript workspace
 * in the monorepo, so CI can run one `eslint .` instead of per-app setup.
 * Related: .github/workflows/ci.yml.
 */
// @ts-check
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      'apps/mobile/**',
      'infra/**',
      'eslint.config.js',
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
);
