import js from '@eslint/js';
import tsEslint from 'typescript-eslint';
import jestEslint from 'eslint-plugin-jest';
import globals from 'globals';

export default [
  js.configs.recommended,
  ...tsEslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
  {
    files: ['**/*.test.js', '**/*.spec.js'],
    plugins: {
      jest: jestEslint,
    },
    languageOptions: {
      globals: {
        ...jestEslint.environments.globals.globals,
        ...globals.jest,
      },
    },
    rules: {
      ...jestEslint.configs.recommended.rules,
      'jest/expect-expect': 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'public/', '.github/workflows/*.yml', '.github/dependabot.yml'],
  },
];
