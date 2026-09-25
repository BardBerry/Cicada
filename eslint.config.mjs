import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginBoundaries from 'eslint-plugin-boundaries';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import eslintPluginVue from 'eslint-plugin-vue';
import eslintPluginVueScopedCss from 'eslint-plugin-vue-scoped-css';
import globals from 'globals';
import typescriptEslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['dist/**', 'src-tauri/**'],
  },

  ...eslintPluginVueScopedCss.configs['base'],

  {
    files: ['**/*.{js,mjs,cjs,ts,vue}'],

    extends: [
      eslint.configs.recommended,
      typescriptEslint.configs.recommended,
      eslintPluginVue.configs['flat/recommended'],
    ],

    plugins: {
      boundaries: eslintPluginBoundaries,
      'simple-import-sort': simpleImportSort,
    },

    settings: {
      'boundaries/include': ['src/**/*'],
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app', partialMatch: false },
        { type: 'pages', pattern: 'src/pages', partialMatch: false },
        { type: 'features', pattern: 'src/features', partialMatch: false },
        { type: 'shared', pattern: 'src/shared', partialMatch: false },
      ],
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },

    rules: {
      'prefer-const': 'error',
      'vue/multi-word-component-names': 'off',
      'vue/no-undef-components': 'error',
      'vue-scoped-css/no-unused-selector': 'error',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { type: 'shared' } },
              allow: { to: { element: { type: 'shared' } } },
            },
            {
              from: { element: { type: 'features' } },
              allow: {
                to: { element: { type: ['features', 'shared'] } },
              },
            },
            {
              from: { element: { type: 'pages' } },
              allow: {
                to: {
                  element: {
                    type: ['pages', 'features', 'shared', 'app'],
                  },
                },
              },
            },
            {
              from: { element: { type: 'app' } },
              allow: {
                to: {
                  element: {
                    type: ['app', 'pages', 'features', 'shared'],
                  },
                },
              },
            },
          ],
        },
      ],
    },

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',

      globals: {
        ...globals.browser,
      },

      parserOptions: {
        parser: typescriptEslint.parser,
      },
    },
  },

  eslintConfigPrettier,
);
