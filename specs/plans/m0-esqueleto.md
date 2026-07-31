# M0 — Esqueleto: plano aprovado

Plano de implementação do M0 (`specs/09-roadmap.md`), aprovado antes de qualquer código. Uma tarefa por commit, na ordem abaixo. Antes de cada commit: `pnpm typecheck && pnpm test && pnpm depcruise`.

## Achados na leitura das specs

- **ADR-0004 aponta para o arquivo errado.** Diz que "o critério de round-trip de `specs/10-testes.md` precisa ser reformulado", mas o critério de round-trip vive em `specs/05-formato-de-arquivo.md:142`. `specs/10` só tem um property test de invertibilidade de comando (coisa diferente). Corrigido no ADR (ainda `Status: Proposta`, editável) e aplicado onde o critério realmente está.
- `specs/adr/0004-versionamento.md` já existia no working tree, untracked. Editado e incluído no commit de specs deste plano.
- `docs/prompts/00-scaffold.md` (modificado, não commitado) não é tocado por este plano — é o log do prompt, fora do escopo do M0.

## Decisões de implementação

1. **Wheel zoom vs pan.** `wheel` com `ctrlKey=true` (pinch de trackpad ou Ctrl+scroll) é sempre zoom. Sem `ctrlKey`: `deltaMode` pixel com `deltaX≠0` (típico de trackpad) é pan; `deltaMode` linha ou `deltaY` puro (típico de roda de mouse) é zoom. Heurística confirmada com o usuário.
2. **E2E no M0.** Playwright entra agora, com um único smoke test ("app carrega, canvas visível") — os outros 4 cenários de `specs/10 § E2E` dependem de ferramentas que só existem a partir do M1. Confirmado com o usuário.
3. **Alias `@fixtures`.** Resolvido via `resolve.alias` manual em cada `vite.config.ts`/`vitest.config.ts` (poucos arquivos, uma linha cada) em vez de `vite-tsconfig-paths`, para não introduzir dependência nova por um alias que já vive em `tsconfig.base.json`.
4. **`render()` reduzido no M0.** A assinatura completa de `08-arquitetura.md` é `render(doc, camera, selection, overlays)`. Sem `core/model` (fora de escopo do M0), `doc`/`selection` não existem ainda. M0 implementa `render(ctx: RenderContext)` com `camera, theme, target, profiler, viewport` — estendida quando M1 trouxer o domínio, não reescrita.
5. **`DrawTarget` mínimo.** Interface só com `line()` e `text()`, suficiente para grid + escala gráfica. Cresce quando `roomFills`/`furniture` precisarem de retângulos/polígonos.
6. **Verificação de guard rails.** A regra do dependency-cruiser (core isolado) e os scripts `version:sync`/`version:check` são verificados manualmente: quebro de propósito, rodo o comando, confirmo a falha, desfaço, registro o resultado na mensagem de commit. Não viram teste automatizado permanente — proporcional ao tamanho do guard.
7. **Cobertura 90% em `core`.** Configurada desde já; trivialmente satisfeita no M0 porque `core` só contém `VOLATILE_META_FIELDS`.
8. **`desktop/src-tauri`.** Recebe `Cargo.toml` + `src/main.rs` mínimo (compilável, sem lógica) além de `tauri.conf.json`, só para os scripts de versão terem o que ler e para não deixar um crate incompleto no repo. Não entra em `pnpm-workspace.yaml` (é Rust, não Node) nem ganha `dev:desktop`/`build:desktop` funcionais — isso é M5.

## Dependências novas

`typescript`, `vite`, `vitest`, `@vitest/coverage-v8`, `eslint` + `typescript-eslint` + `eslint-plugin-svelte`/`svelte-eslint-parser`, `dependency-cruiser`, `svelte` + `@sveltejs/vite-plugin-svelte`, `@playwright/test`. Todas justificadas por item explícito do ESCOPO. Nada de `zod`/`immer`/`nanoid` — pertencem ao `core/model` do M1.

## Pré-requisito de ambiente

pnpm não estava instalado neste sistema (nem `corepack`). Instalado via `npm install -g pnpm` antes de T2 — ferramenta global, reversível, não é dependência do projeto.

## Tarefas

**T0 — Gravar plano aprovado.** `specs/plans/m0-esqueleto.md`. Critério: arquivo existe, commit isolado.

**T1 — Specs de versionamento.** `specs/adr/0004-versionamento.md` (corrige referência 10→05, remove tabela duplicada, aponta para 05), `specs/05-formato-de-arquivo.md` (tabela `schemaVersion → versão do app`, critério de round-trip reformulado excluindo `VOLATILE_META_FIELDS`), `specs/10-testes.md` (insere `pnpm version:check` na sequência de CI). Critério: nenhuma lista duplicada entre ADR e spec 05; sequência de CI em 10 inclui version:check.

**T2 — Fundação do monorepo.** `package.json` raiz (`private:true`, `version:"0.0.0"`, `packageManager`), `pnpm-workspace.yaml`, `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`, alias `@fixtures`), `.gitignore`, `.npmrc`, `eslint.config.js`, `.dependency-cruiser.cjs` (regra core-isolado já presente, verificada de verdade em T8). Critério: `pnpm install` roda sem erro.

**T3 — Pacote `core`.** Skeleton + `src/io/volatileMetaFields.ts` (+teste), `['modifiedAt','appVersion']` conforme ADR-0004 Decisão 5. Critério: teste e typecheck passam.

**T4 — Pacote `catalog`.** Skeleton mínimo + um teste trivial. Critério: teste trivial passa, typecheck limpo.

**T5 — Pacote `renderer`.** `camera.ts` (+teste de round-trip de zoom < 1px), `theme.ts` (tabela completa de `04-renderizacao.md`), `grid.ts` (+teste dos breakpoints adaptativos), `scaleBar.ts` (+teste da progressão 1-2-5), `target/{DrawTarget,CanvasTarget}.ts`, `passes/{clear,grid,hud}.ts`, `render.ts`, `profiler.ts`. Inclui teste que varre `src/**/*.ts` (exceto `theme.ts`) contra literais hex. Critério: testes passam, nenhuma cor hex fora de `theme.ts`.

**T6 — Pacote `app`.** Vite+Svelte 5, canvas fullscreen com resize/dpr, `scheduler.ts` (+teste de dirty flag/rAF), `canvasInput.ts` (pan botão-do-meio/Espaço+arrastar, zoom no cursor via wheel, `Home` enquadra 10×10m) (+teste das funções puras de mapeamento evento→delta). Critério: `pnpm --filter @planta/app dev` sobe; verificação manual no navegador (pan, zoom ancorado, grid adaptativo, escala gráfica, `Home`).

**T7 — Desktop stub + versionamento.** `desktop/src-tauri/{tauri.conf.json,Cargo.toml,src/main.rs}`, `scripts/version-sync.mjs`, `scripts/version-check.mjs`, wiring em `package.json` raiz. Critério: `pnpm version:check` passa com os três em `0.0.0`; verificado manualmente quebrando um dos três, confirmando falha nomeada, corrigindo com `version:sync`, confirmando sucesso — resultado na mensagem de commit.

**T8 — Qualidade: dependency-cruiser real + lint.** Regra completa de `08-arquitetura.md`. Critério: import proibido de `renderer` dentro de `core` quebra `pnpm depcruise` de propósito (testado e revertido, resultado na mensagem de commit); `pnpm lint` sem erro.

**T9 — Cobertura + E2E.** `@vitest/coverage-v8` (threshold 90% em `core`), `playwright.config.ts` + `e2e/smoke.spec.ts`. Critério: `pnpm test --coverage` e `pnpm e2e` passam localmente.

**T10 — CI.** `.github/workflows/ci.yml`: `version:check → typecheck → lint → depcruise → test --coverage → build → e2e`. Critério: sequência confere com `specs/10` reformulado.

**T11 — Fechamento: verificação de performance.** Navegação do grid infinito com `?debug=perf`, confirmar <8ms/frame durante pan/zoom. Resultado anexado a este arquivo.

Cada CLAUDE.md de pacote (5-10 linhas, só o que é local) é criado junto da tarefa que cria o pacote correspondente (T3-T7).
