# M4 — Persistir: plano aprovado

Plano de implementação do M4 (`specs/09-roadmap.md`), aprovado antes de qualquer
código. Uma tarefa por commit, na ordem abaixo. Antes de cada commit:
`pnpm typecheck && pnpm test && pnpm depcruise`.

## Contexto

O M3.5 fechou glifos, parede avulsa e ferramenta medir. O M4 é o milestone em que
o trabalho do usuário sobrevive ao fechar do navegador: salvar, abrir, autosave,
restauração, export.

O que já existe e não precisa ser criado:

- `PlanDocument`, schema Zod (`planDocumentSchema`), `CURRENT_SCHEMA_VERSION = 1`
- `validateDocument` completa (E1–E9, W1–W5)
- `VOLATILE_META_FIELDS` (`['modifiedAt', 'appVersion']`)
- `DocumentStore` com `subscribe`, `dispatch`, `undo/redo`
- `DrawTarget` interface com 8 primitivas, `CanvasTarget`, `RecordingTarget`
- Fixtures em `specs/fixtures/`
- Adaptador de IndexedDB para catálogo do usuário em `app/persistence/userCatalog.ts`
- ADR-0004 com decisões de versionamento e `appVersion` no documento

O que está vazio / não existe:

- `core/io/` — só `volatileMetaFields.ts`
- Nenhum `SvgTarget`
- Nenhum adaptador de File System Access
- Nenhum autosave de documento, nenhum mecanismo de recentes
- Nenhum export (PNG, SVG, CSV)
- Nenhuma mensagem de persistência em `messages.ts`

## Decisões que a spec não tomou

Aprovadas na conversa de planejamento:

1. **`meta.appVersion` é campo opcional no schema Zod.** Não sobe `schemaVersion`.
2. **Preservação de campos desconhecidos usa `passthrough()` no Zod** (critério 05-2).
3. **`readDocument` em `core/io`** retorna `{ ok, doc, warnings }` ou `{ ok, error }`.
4. **GC de nós órfãos ao serializar** (spec 01 W5).
5. **Debounce de autosave: 5 s após último dispatch.**
6. **Rotação de 3 snapshots** com chaves `:0`, `:1`, `:2` e ponteiro `lastSlot`.
7. **Arquivos recentes: 8 entradas em IndexedDB**, miniatura PNG de 240 px.
8. **Export PNG:** `canvas.toBlob` com câmera enquadrando conteúdo + margem 5%.
9. **Export CSV:** duas tabelas (cômodos + móveis) num arquivo, separador decimal ponto.
10. **SvgTarget** como nova implementação de `DrawTarget` em `renderer/target/`.
11. **`SetDocumentMeta`** com payload `{ name?, displayUnit?, gridSize? }`.
12. **Dirty flag** em `DocumentStore` com `markSaved()`.

## Ordem das tarefas

### T0 — Gravar o plano aprovado

`specs/plans/m4-persistir.md`. Commit próprio.

### T1 — `core/io`: serialização, migração e validação na leitura

Arquivos: `core/src/io/serialize.ts`, `io/read.ts`, `io/migrate.ts`, `io/repair.ts`,
`io/errors.ts`, `io/index.ts`, testes. `model/schemas.ts` (passthrough),
`model/document.ts` (appVersion).

`serializeDocument(doc): string` — JSON + appVersion + GC órfãos.
`readDocument(json: string): ReadResult` — parse → migração → validação → reparo.

Satisfaz: **05-1**, **05-2**, **05-3**, **05-4**.

### T2 — `core/commands`: `SetDocumentMeta`

Arquivos: `commands/commands.ts`, `commands/commands.test.ts`.

Satisfaz: **08** § Comandos do M4.

### T3 — `core/history`: dirty flag e `markSaved`

Arquivos: `history/store.ts`, `history/store.test.ts`.

### T4 — Fixture `legacy/v1-minimal.planta.json` e teste de migração

Arquivos: `specs/fixtures/legacy/v1-minimal.planta.json`, `io/migrate.test.ts`.

Satisfaz: **10-5**.

### T5 — `renderer/target`: SvgTarget

Arquivos: `target/SvgTarget.ts`, `target/SvgTarget.test.ts`, `target/index.ts`.

Satisfaz: **05-7**, **04-7** (base).

### T6 — `app/persistence`: File System Access com fallback

Arquivos: `persistence/fileAccess.ts`, `persistence/fileHandleStore.ts`.

Satisfaz: **05-6**.

### T7 — `app/persistence`: Autosave e restauração

Arquivos: `persistence/autosave.ts`.

Satisfaz: **05-5**.

### T8 — `app`: Export PNG, SVG e CSV

Arquivos: `export/exportPng.ts`, `export/exportSvg.ts`, `export/exportCsv.ts`.

Satisfaz: **04-7**, **05** § Export.

### T9 — `app`: Arquivos recentes com miniatura

Arquivos: `persistence/recentFiles.ts`.

### T10 — `app`: UI de persistência

Menu, título, `Ctrl+S`, `beforeunload`, mensagens.

### T11 — Fixture, property tests e verificação

Round-trip, property tests, testes de export.

### T12 — Cobertura e encerramento

`specs/plans/m4-persistir-cobertura.md`.

## Critérios que NÃO caem neste milestone

| Critério | Cai em |
|----------|--------|
| Imagem de underlay de 5 MB rejeitada (05-8) | M7 |
| Aberturas ancoradas (01-6) | M6 |
| Shell Tauri, menu nativo, filesystem nativo | M5 |
| Build para plataformas, CI de release | M5 |

## Verificação

Antes de cada commit:

```
pnpm typecheck && pnpm test && pnpm depcruise
```

No encerramento:

```
pnpm test --coverage      # core ≥ 90%
pnpm build                # bundle < 300 KB gzipped
```
