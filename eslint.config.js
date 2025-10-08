import react from 'eslint-plugin-react';
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import importPlugin from 'eslint-plugin-import';
import sonarjs from 'eslint-plugin-sonarjs';
import reactx from 'eslint-plugin-react-x';
import reactCompiler from 'eslint-plugin-react-compiler';

export default tseslint.config(
  { ignores: ['dist', 'vite.config.ts', '**/env.d.ts', '**/vite-env.d.ts', '**/schemas.d.ts'] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      {
        languageOptions: {
          parserOptions: {
            projectService: true,
            tsconfigRootDir: import.meta.dirname,
          },
        },
      },
      importPlugin.flatConfigs.recommended,
      sonarjs.configs.recommended,
    ],
    settings: {
      react: {
        version: 'detect',
      },

      'import/resolver': {
        typescript: {},
      },
    },
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-compiler': reactCompiler,
      'react-refresh': reactRefresh,
      'simple-import-sort': simpleImportSort,
      'react-x': reactx,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-compiler/react-compiler': 'error',

      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off', // Disable prop-types since we use TypeScript
      camelcase: 'off',
      'spaced-comment': 'error',
      quotes: ['error', 'single', { avoidEscape: true }],
      'no-duplicate-imports': 'error',
      'no-empty-function': 'off',
      '@typescript-eslint/no-empty-function': 'warn',
      'sort-imports': 'off',
      'import/order': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'import/first': 'error',
      'import/newline-after-import': 'off',
      'import/no-duplicates': 'error',
      '@next/next/no-img-element': 'off',
      'brace-style': ['error', '1tbs'],
      curly: ['error', 'all'],

      'react/jsx-curly-brace-presence': [
        'error',
        {
          props: 'never',
        },
      ],

      'object-shorthand': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      'prefer-arrow-callback': 'error',
      'react/function-component-definition': [
        2,
        { namedComponents: 'function-declaration', unnamedComponents: 'arrow-function' },
      ],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-irregular-whitespace': 'off',
      'import/no-unresolved': ['error', { ignore: ['^virtual:'] }],
      'sonarjs/prefer-read-only-props': 'off',
      'sonarjs/deprecation': 'warn',
      'react-x/no-leaked-conditional-rendering': 'error',
      'sonarjs/todo-tag': 'off',
    },
  },
);
