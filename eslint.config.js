import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import svelte from 'eslint-plugin-svelte'
import svelteParser from 'svelte-eslint-parser'

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.vite/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/*.tsbuildinfo',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    files: ['**/*.cjs', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        module: 'writable',
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        console: 'readonly',
      },
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.svelte'],
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
          message:
            'Cor hexadecimal fora de renderer/theme.ts e core/model/roomPalette.ts. Ver CLAUDE.md § Convenções de código.',
        },
      ],
    },
  },
  {
    // theme.ts é dono dos tokens de apresentação; roomPalette.ts é dono da cor
    // de cômodo, que é dado de documento e vai para o arquivo salvo
    // (specs/04-renderizacao.md § Cor de cômodo não é token de tema).
    files: ['packages/renderer/src/theme.ts', 'packages/core/src/model/roomPalette.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
)
