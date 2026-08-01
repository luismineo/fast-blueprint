import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['packages/*'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**'],
      exclude: ['**/*.test.ts', '**/*.svelte', '**/vite-env.d.ts', 'packages/app/src/main.ts', '**/index.ts'],
      thresholds: {
        'packages/core/src/**': { lines: 90 },
      },
    },
  },
})
