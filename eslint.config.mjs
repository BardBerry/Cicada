import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import typescriptEslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['dist/**', 'src-tauri/**'],
  },

  {
    files: ['**/*.{js,mjs,cjs,ts,vue}'],

    extends: [
      eslint.configs.recommended,
      typescriptEslint.configs.recommended,
      eslintPluginVue.configs['flat/recommended'],
    ],

    rules: {
      'prefer-const': 'error',
      'vue/multi-word-component-names': 'off',
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
