import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },
  {
    files: ['test/live-qa.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        document: 'readonly',
        getComputedStyle: 'readonly',
      },
    },
  },
);
