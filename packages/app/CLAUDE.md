# CLAUDE.md — app

Svelte 5 + Vite. Chrome de UI, roteamento de eventos, ferramentas, persistência. Depende de `core`, `catalog` e `renderer`.

Nenhum `.svelte` contém regra de negócio — `canvasInput.ts` e `scheduler.ts` concentram toda a lógica de câmera/entrada em funções puras testáveis; `App.svelte` só liga eventos DOM a elas. Não há teste de componente Svelte (`specs/10-testes.md`).

`typecheck` deste pacote roda via `svelte-check`, não `tsc` puro — `tsc --build` não entende `.svelte`.

M0 só tem canvas e câmera. `tools/`, `components/`, `stores/` e `persistence/` chegam com o domínio, a partir do M1.
