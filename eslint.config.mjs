import js from '@eslint/js';
import tsEslint from 'typescript-eslint';
import jestEslint from 'eslint-plugin-jest';

export default [
  js.configs.recommended,
  ...tsEslint.configs.recommended,
  {
    files: ['**/*.test.js', '**/*.spec.js'],
    plugins: {
      jest: jestEslint,
    },
    languageOptions: {
      globals: {
        ...jestEslint.environments.globals.globals,
      },
    },
    rules: {
      ...jestEslint.configs.recommended.rules,
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'public/'],
  },
];
