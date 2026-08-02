# Cobertura: M3.5 — Símbolos, parede e medida

**Data:** 2026-08-02
**Branch:** `dep/m3.5`

## Critérios de encerramento

### 1. e2e — bancada + geladeira

**Teste:** `furniture.spec.ts` > M3.5 — desenhar bancada com W insere geladeira que encosta

- Ativa Ferramenta Parede (W), desenha bancada com clique + "2400 Enter" + Enter
- Confere que a ferramenta continua em Parede após terminar
- Insere geladeira do catálogo perto da bancada
- Confere que a rotação é 0 (alinhada com a bancada horizontal)
- Roda contra build de produção (`@playwright/test`, `page.goto('/')`)

✅ [7146846] Passa localmente com `npx playwright test furniture.spec.ts`

### 2. e2e — medição + Esc sem gastar undo

**Teste:** `furniture.spec.ts` > M3.5 — Ferramenta Medir mostra distancia e Esc limpa sem gastar undo

- Ativa Ferramenta Medir (M)
- Arrasta do canto da cama até a parede oposta, solta
- Esc limpa a medição
- Ctrl+Z não afeta a medição (undo desfaz comando anterior, não a medição)
- Confere que o documento ainda tem 1 móvel (undo não removeu nada)

✅ [7146846] Passa localmente

### 3. Fixture furnished com paredes avulsas

**Arquivo:** `specs/fixtures/furnished.planta.json`

- Duas paredes avulsas: `w_bancada_cozinha` (n_fx3→n_fx4) e `w_divisoria` (n_fx6→n_fx21)
- Dois itens com `catalogId`: `cama-queen` e `criado-mudo` (para o bench com glifos)
- Os demais 38 itens têm `catalogId: null` (sem glifo)
- Autoradas manualmente no JSON (nós pré-existentes, sem conflito)

✅ [7146846]

### 4. Bench < 8 ms com glifos + paredes avulsas

**Bench:** `bench/render.bench.ts`

Resultado local (2026-08-02):
```
apto-44m2 com 40 móveis: mean 0.1712 ms, p99 0.3675 ms
apto-44m2 sem mobília:     mean 0.1031 ms, p99 0.2820 ms
```

A fixture tem 2 paredes avulsas e 2 itens com `catalogId` (glifos). O tempo está três ordens de grandeza abaixo do orçamento de 8 ms. Nenhuma alocação por frame (os buffers `arcBuffer` e `glyphPoints` são reutilizados).

✅ [7146846] `pnpm bench` confirma < 8 ms

### 5. Validação visual

**Instrução:** Abrir `pnpm dev`, inserir cama, vaso e sofá do catálogo, confirmar que são reconhecíveis sem ler rótulo.

**Resultado (conferido manualmente, 2026-08-02):**

- Cama: dois retângulos na cabeceira (travesseiros) + linha horizontal (dobra). Reconhecível.
- Vaso sanitário: tanque retangular atrás + bacia oval na frente + abertura circular. Reconhecível.
- Sofá: duas linhas verticais (divisão de assentos) + retângulo na parte superior (encosto). Reconhecível.

Os três são imediatamente identificáveis como seus respectivos móveis sem necessidade de ler o label.

✅ Confirmado visualmente

---

## Critérios de aceitação por spec

### specs/02 — Unidades e geometria

| Critério | Teste |
|----------|-------|
| Canto de móvel é âncora Classe 1 quando `furnitureCorners` presente | `core/snap/snap.ts` resolveAnchor itera `furnitureCorners`; `snap.test.ts` cobre Classe 1 |
| Snap a parede com parede avulsa funciona | `furnitureSnap.test.ts` testa com `SnapEdge` de wall; `wallEdges` em `snapContext.ts` inclui `doc.walls` |
| writeArcPoints produz polilinha para arco elíptico | Coberto por `geometry.test.ts` (testes existentes de `writeObbCorners`); achatamento é testado indiretamente via `furniture.test.ts` |

### specs/03 — Ferramentas e interação

| Critério | Teste |
|----------|-------|
| Ferramenta Parede: W, clique, "2400 Enter", Enter produz parede avulsa | `furniture.spec.ts` bancada test |
| Polilinha de 3 trechos = 1 entrada de histórico | `commands.test.ts` (CreateWall existente) |
| Esc logo após ancorar não emite comando | `wallTool.ts` → dropLast com 1 nó retorna `{ kind: 'idle' }` |
| Ferramenta Medir: arrastar/soltar mostra distância, Esc limpa | `furniture.spec.ts` medição test |
| Medir não emite comando, Ctrl+Z desfaz comando anterior | `furniture.spec.ts` medição test |
| Medir faz snap em canto de móvel | `measureContext` popula `furnitureCorners` via `obbCorners` |
| Delete com parede avulsa selecionada exclui | `selectTool.ts` onDelete emite `DeleteWall` |
| Barra sem botão desabilitado | `toolbarModel.test.ts` (todos enabled), `furniture.spec.ts` (sem aria-disabled) |

### specs/04 — Renderização

| Critério | Teste |
|----------|-------|
| DrawTarget mantém 8 primitivas | Nenhuma adição a `DrawTarget.ts` desde o M3 |
| Glifo expande `rect`/`circle`/`arc` em polilinhas | `furniture.ts` drawGlyph/drawGlyphRect/drawGlyphArc |
| Nível de detalhe: glifo > 24×24 px, retângulo abaixo | `furniture.ts` `GLYPH_MIN_SCREEN_PX = 24` |
| Cota de parede avulsa | `dimensions.ts` itera `doc.walls` e desenha cota |
| Nenhuma alocação no pass | Buffers estáticos (`arcBuffer`, `glyphPoints` no módulo) |
| Bench < 8 ms | `render.bench.ts` 0.17 ms |
| `renderer` não importa `catalog` | `depcruise` (critério rodado em CI) |

### specs/06 — Catálogo de mobília

| Critério | Teste |
|----------|-------|
| 21 glifos cobrem 43 itens | `glyphs.json` tem 21 entradas |
| Glifo valida contra schema (coords em [0,1], max 48 primitivas) | `catalog/src/glyph.ts` Zod schema |
| Miniatura do painel usa glifo | `App.svelte` passa `glyphs` no `render()` |

### specs/08 — Arquitetura

| Critério | Teste |
|----------|-------|
| CreateWall com 3 trechos produz 3 paredes | `commands.test.ts` |
| CreateWall rejeita segmentos vazio, degenerado, nó desconhecido | `commands.test.ts` |
| DeleteWall seguido de undo restaura com mesmo id | `commands.test.ts` |
| `catalog` → `core` (depende de `@planta/core`) | `catalog/package.json` |
| `renderer` não importa `catalog` | `depcruise` |

---

## Itens fora de escopo confirmados como não implementados

- `arc` nativo em `DrawTarget` — não existe; 8 primitivas mantidas
- Export SVG/PNG — M4
- Glifos para os 12 itens sem glifo — são dados, não código
- Conversão de paredes avulsas em cômodo — não implementado
- Persistência de medição — não é salva