import { defineConfig } from 'vitest/config'

/**
 * Configuração própria, fora dos projetos de `vitest.config.ts`.
 *
 * O bench não roda em `pnpm test`: `10-testes.md` § Testes de performance o
 * restringe a PR com label `perf`, porque a variância de runner compartilhado
 * gera falso positivo. Rodar por `pnpm bench`.
 */
export default defineConfig({
  test: {
    name: 'bench',
    environment: 'node',
    include: ['bench/**/*.bench.ts'],
  },
})
