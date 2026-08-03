# Plano: M3.5 — Símbolos, parede e medida

**Status:** Aprovado
**Data:** 2026-08-02
**Specs de referência:** `adr/0006-glifos-de-mobilia.md`, `02-unidades-e-geometria.md`, `03-ferramentas-e-interacao.md`, `04-renderizacao.md`, `06-catalogo-de-mobilia.md`, `07-ui-e-layout.md`, `08-arquitetura.md`, `09-roadmap.md`

## 1. Visão geral dos entregáveis

| # | Entregável | Onde | Complexidade |
|---|-----------|------|-------------|
| 1 | Tipo `FurnitureGlyph` + `GlyphPrimitive` | `core/overlay/overlay.ts` (ao lado de `OverlayPrimitive`) | Pequena |
| 2 | `writeArcPoints` em `core/geometry` | `core/geometry/geometry.ts` | Média |
| 3 | `catalog/data/glyphs.json` com 21 glifos + schema Zod | `catalog/src/`, `catalog/data/` | Grande (dados) |
| 4 | `RenderContext.glyphs` + render no pass de mobília + nível de detalhe | `renderer/src/` | Média |
| 5 | Miniatura do catálogo com glifo + herança de glifo | `app/` | Pequena |
| 6 | Comandos `CreateWall` / `DeleteWall` | `core/commands/commands.ts` | Média |
| 7 | Ferramenta Parede (`W`) | `app/tools/wallTool.ts` (novo) | Média |
| 8 | Cota de parede avulsa + seleção/exclusão + `SetEdgeLength` | `renderer/`, `app/tools/selectTool.ts` | Pequena |
| 9 | Canto de móvel como âncora Classe 1 (flag `furnitureCorners`) | `core/snap/snap.ts` | Pequena |
| 10 | Ferramenta Medir (`M`) | `app/tools/measureTool.ts` (novo) | Média |
| 11 | Barra de ferramentas — habilitar wall e measure, remover `aria-disabled` | `app/components/toolbarModel.ts` | Pequena |
| 12 | Testes e2e (bancada + geladeira, medição + Esc) | `e2e/` | Média |
| 13 | Fixture `furnished` com paredes avulsas + bench | `specs/fixtures/`, `bench/` | Média |
| 14 | Validação visual | Manual | Pequena |

## 2. Ferramenta Parede — Máquina de estados

Três estados iguais à Ferramenta Cômodo, sem fechamento: `Idle → Anchored → Drawing`.

Mesmo HUD, mesmos campos de comprimento e ângulo, mesma armadilha de foco, mesmo resolvedor de snap.

| Gatilho | Transição | Efeito |
|---|---|---|
| `pointerDown` em Idle | → Anchored | Cria primeiro nó via snap (`merged` reusa nó existente) |
| `pointerDown` em Anchored/Drawing | Confirma segmento | Acumula nó, vai para Drawing |
| `Enter` (campo preenchido) em Anchored/Drawing | Confirma segmento | Mesmo efeito do pointerDown |
| `Enter` (campo vazio) em Drawing | **Termina** a polilinha → Idle | Emite `CreateWall` com todos os nós e segmentos |
| `Esc` (campo e ângulo vazios) em Anchored | → Idle | Cancela sem emitir comando, sem histórico |
| `Esc` (campo e ângulo vazios) em Drawing com 2+ nós | Remove último segmento | Volta para Anchored se só 1 nó sobrar |
| `Esc` (campo e ângulo vazios) em Drawing com 1 nó restante | → Idle | Cancela sem emitir comando |
| `Esc` (campo preenchido) | Limpa campo de comprimento | `frozenDirection` volta a `null` |
| `Esc` (campo vazio, ângulo preenchido) | Limpa campo de ângulo | |
| Duplo clique em Anchored/Drawing | Confirma segmento e termina | Equivalente a `pointerDown` + `Enter` vazio |
| `Backspace` (campo vazio) em Drawing | Remove último segmento | |
| `Backspace` (campo preenchido) | Apaga caractere | Comportamento padrão de campo |

### Diferenças da Ferramenta Cômodo:
- `C` não existe (não fecha polígono)
- `Enter` com campo vazio **termina** em vez de fechar
- Clique no nó inicial não fecha — cria segmento como qualquer outro (se `a === b`, `CreateWall` rejeita como `DEGENERATE_WALL`)
- Terminar volta para `Idle` **sem trocar de ferramenta** (para desenhar várias bancadas seguidas)
- Terminar sem nenhum segmento confirmado não emite comando

### Um comando por polilinha

A ferramenta acumula o rascunho e emite **um** `CreateWall` no término, com todos os nós e todos os segmentos. Uma polilinha de quatro trechos é uma entrada de histórico, não quatro.

## 3. Ferramenta Medir — Máquina de estados

```
Idle → Dragging → Done
```

| Gatilho | Transição | Efeito |
|---|---|---|
| `pointerDown` em Idle | → Dragging | Âncora no ponto com snap (inclui canto de móvel). Inicia traço. |
| `pointerMove` em Dragging | → Dragging | Atualiza a extremidade móvel com snap. |
| `pointerUp` em Dragging | → Done | Fixa a medição. Fica na tela. |
| `Esc` em Dragging | → Idle | Descarta o traço. |
| `Esc` em Done | → Idle | Limpa a medição. |
| `pointerDown` em Done | → Dragging | Substitui a medição anterior por uma nova. |
| `Enter` em Dragging | → Done | Confirma a medição (equivalente a `pointerUp`). |
| Trocar de ferramenta em Dragging/Done | → Idle na nova ferramenta | Limpa a medição. |

### O que NÃO faz:
- Nunca emite comando (`commands: []` em toda transição)
- Não acumula histórico
- Não é afetada por `Ctrl+Z` — `Ctrl+Z` depois de medir desfaz o comando anterior à medição
- Nada do que mostra é salvo

### Overlays emitidos:
- `Idle`: marcador `snapNode` se snap a nó ou canto de móvel disparar
- `Dragging`: segmento `measure` entre âncora e cursor, marcadores `measure` nas pontas
- `Done`: segmento `measure`, marcadores `measure`, label `measureLabel` com distância total (e ΔX/ΔY se não axial)

### Snap e canto de móvel:

A Ferramenta Medir é a única que pede **canto de móvel** como âncora de Classe 1 (`02-unidades-e-geometria.md` § Classe 1). As ferramentas de desenho não pedem, e não devem: um nó de cômodo ancorado num canto de sofá ficaria para trás no instante em que o sofá fosse arrastado. Para medir, é o alvo mais frequente — "quanto sobra entre a cama e a parede" começa no canto da cama.

Implementação: `SnapContext` ganha um flag `furnitureCorners: readonly Point[]`. Quando presente, `resolveAnchor` inclui esses pontos como candidatos de Classe 1 (mesma tolerância de nó), produzindo `targets: [{ kind: 'furnitureCorner', at }]` e `merged: null`.

`SnapTarget` ganha o variante `{ kind: 'furnitureCorner'; at: Point }`.

## 4. `CreateWall` e segmento duplicado

Spec 08: "Segmento que reproduz exatamente uma parede já existente — mesmo par de nós, em qualquer ordem — é **omitido**, e o resto do comando é aplicado."

Se o usuário desenha uma polilinha de 4 trechos e o terceiro trecho coincide com uma parede que já existe (mesmo par `{a, b}`), esse segmento não cria uma segunda parede sobre a primeira. Os outros 3 trechos são criados normalmente. A entrada de histórico contém os 3, não 4.

Se **todos** os segmentos são duplicados e `segments` depois da filtragem fica vazio, o comando é rejeitado com `EMPTY_WALL`.

### Teste:
1. Criar documento com parede avulsa entre nós N1 e N2
2. Emitir `CreateWall` com `segments: [{a: N1, b: N2}, {a: N2, b: N3}]`
3. Conferir que só `{a: N2, b: N3}` foi criado
4. O undo restaura o documento original (com a parede N1-N2 pré-existente)

## 5. Glifo + escala não-uniforme + arco

### Schema do glifo

```ts
// core/overlay/overlay.ts — ao lado de OverlayPrimitive

export type GlyphPrimitive =
  | { readonly kind: 'line'; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }
  | { readonly kind: 'rect'; readonly x: number; readonly y: number; readonly w: number; readonly h: number }
  | { readonly kind: 'circle'; readonly cx: number; readonly cy: number; readonly r: number }
  | { readonly kind: 'arc'; readonly cx: number; readonly cy: number; readonly r: number; readonly startAngle: number; readonly endAngle: number }

export interface FurnitureGlyph {
  readonly id: string;
  readonly primitives: readonly GlyphPrimitive[];
}
```

Limites: no máximo 48 primitivas por glifo, todas as coordenadas em `[0,1]`.

`rect` e `circle` são açúcar sintático — o renderer os expande: `rect` vira 4 `line`s, `circle` vira `arc` de 0 a 2π. `circle` existe porque ~10 glifos precisam dele (vaso, pia, fogão, etc.) e escrever `arc` com 0 e 2π repetido é propenso a erro.

### Mapeamento do glifo para mundo

O glifo é definido em `[0,1]²` no referencial local do móvel: `(0,0)` é o canto traseiro esquerdo, `(1,1)` o canto frontal direito. `y` cresce da parede para dentro do cômodo.

O mapeamento para o sistema local do móvel (antes da rotação) é:
```
localPoint(gx, gy) = {
  x: (gx - 0.5) * width,
  y: (gy - 0.5) * depth
}
```

### Arco vira elipse

Um arco em espaço de glifo tem centro `(cx, cy)`, raio `r`, ângulos `startAngle` e `endAngle`. O círculo unitário mapeia para:
```
localX(θ) = (cx + r·cos θ - 0.5) * width
localY(θ) = (cy + r·sin θ - 0.5) * depth
```

Que é a equação paramétrica de uma elipse centrada em `((cx - 0.5)·width, (cy - 0.5)·depth)` com semieixos `(r·width, r·depth)`.

### `writeArcPoints` — onde o cálculo mora

Em `core/geometry/geometry.ts`:

```ts
export function writeArcPoints(
  out: Point[],
  outOffset: number,
  cx: number, cy: number,
  rx: number, ry: number,
  startAngle: number, endAngle: number,
  segments: number,
): number
```

- `out`: buffer pré-alocado (para evitar alocação no pass de render)
- `outOffset`: posição inicial no buffer
- `cx, cy`: centro em mm (já no sistema local do móvel)
- `rx, ry`: semieixos em mm (`r * width`, `r * depth`)
- `startAngle, endAngle`: ângulos em radianos
- `segments`: número de segmentos (24 para círculo completo)
- Retorna: número de pontos escritos

O renderer chama isso no pass de mobília, depois aplica rotação e translação do móvel.

**O círculo NÃO vai para DrawTarget como primitiva nativa.** `rect` também não. Toda primitiva de glifo é expandida em polilinhas/segmentos no pass. `DrawTarget` continua com as mesmas 8 primitivas.

## 6. Plano para os 21 glifos

### Exemplo 1: `bed` (cama)

Cobre: `cama-solteiro`, `cama-casal`, `cama-queen`, `cama-king`, `cama-bunker`, `beliche` (6 itens)

```json
{
  "id": "bed",
  "primitives": [
    { "kind": "rect", "x": 0.08, "y": 0.03, "w": 0.37, "h": 0.22 },
    { "kind": "rect", "x": 0.55, "y": 0.03, "w": 0.37, "h": 0.22 },
    { "kind": "line", "x1": 0.06, "y1": 0.45, "x2": 0.94, "y2": 0.45 }
  ]
}
```

Resultado visual: dois retângulos na cabeceira (travesseiros), uma linha horizontal no meio (dobra do cobertor). Com label e dimensões, é imediatamente reconhecível como cama.

### Exemplo 2: `toilet` (vaso sanitário)

Cobre: `vaso-sanitario`, `vaso-cadeirante` (2 itens)

```json
{
  "id": "toilet",
  "primitives": [
    { "kind": "rect", "x": 0.2, "y": 0.0, "w": 0.6, "h": 0.28 },
    { "kind": "circle", "cx": 0.5, "cy": 0.64, "r": 0.26 },
    { "kind": "circle", "cx": 0.5, "cy": 0.64, "r": 0.14 }
  ]
}
```

Resultado visual: tanque retangular atrás, bacia oval na frente (o círculo vira elipse pelo scale não-uniforme), abertura do assento dentro. Reconhecível de imediato.

### Os 21 glifos e o que cobrem

| # | id | Itens cobertos | Primitivas (estimado) |
|---|----|---------------|----------------------|
| 1 | `bed` | 6 camas | 3 |
| 2 | `toilet` | vaso, vaso-cadeirante | 3 |
| 3 | `sink-bath` | 2 pias de banheiro | 3 |
| 4 | `bathtub` | banheira | 2 |
| 5 | `shower` | box, chuveiro | 3 |
| 6 | `sofa` | sofá-2, sofá-3, sofá-canto, poltrona | 3 |
| 7 | `dining-table` | mesa-jantar-4, mesa-jantar-6, mesa-jantar-8 | 2 |
| 8 | `chair` | cadeira-jantar (6 itens) | 3 |
| 9 | `stove` | fogao-4, fogao-6, fogao-cooktop | 4 |
| 10 | `fridge` | geladeira, frigobar | 2 |
| 11 | `sink-kitchen` | pia-cozinha | 3 |
| 12 | `cabinet` | armario-cozinha, armario-cozinha-superior | 2 |
| 13 | `washing-machine` | lavadora, secadora | 2 |
| 14 | `desk` | mesa-escritorio, mesa-escritorio-grande | 2 |
| 15 | `office-chair` | cadeira-escritorio | 3 |
| 16 | `bookshelf` | estante, estante-grande | 3 |
| 17 | `wardrobe` | guarda-roupa-2, guarda-roupa-4, guarda-roupa-6 | 3 |
| 18 | `tv` | tv, tv-grande | 2 |
| 19 | `rack` | rack | 2 |
| 20 | `nightstand` | criado-mudo | 2 |
| 21 | `coffee-table` | mesa-centro, mesa-lateral | 2 |

Isso cobre 43 dos 55 itens. Os 12 restantes são itens sem glifo que continuam como retângulo.

**Nota:** `nightstand` e `coffee-table` entraram na lista apesar de inicialmente listados como "sem glifo" — uma mesa de centro é um retângulo com um retângulo menor dentro, e um criado-mudo idem. Duas primitivas cada. Se decidir mantê-los como retângulo puro, reduz para 19 glifos cobrindo 39 itens.

### Schema de validação

```ts
// catalog/src/schema.ts — adição

export const glyphPrimitiveSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('line'), x1: z.number().min(0).max(1), y1: z.number().min(0).max(1), x2: z.number().min(0).max(1), y2: z.number().min(0).max(1) }),
  z.object({ kind: z.literal('rect'), x: z.number(), y: z.number(), w: z.number(), h: z.number() }),
  z.object({ kind: z.literal('circle'), cx: z.number().min(0).max(1), cy: z.number().min(0).max(1), r: z.number().min(0).max(1) }),
  z.object({ kind: z.literal('arc'), cx: z.number().min(0).max(1), cy: z.number().min(0).max(1), r: z.number().min(0).max(1), startAngle: z.number(), endAngle: z.number() }),
])

export const furnitureGlyphSchema = z.object({
  id: z.string().min(1),
  primitives: z.array(glyphPrimitiveSchema).min(1).max(48),
})

export const glyphFileSchema = z.object({
  version: z.number().int().positive(),
  glyphs: z.array(furnitureGlyphSchema),
})
```

## 7. Nível de detalhe

Glifo só é desenhado quando o retângulo do móvel ocupa mais de 24×24 px de tela. Abaixo disso, desenha-se o retângulo de sempre (com label se couber). O cálculo é:

```ts
const widthPx = item.width * ctx.camera.scale;
const depthPx = item.depth * ctx.camera.scale;
const showGlyph = widthPx > 24 && depthPx > 24;
```

Este limiar é verificado no pass de mobília, frame a frame. Sem alocação — é uma comparação numérica.

## 8. Miniatura do catálogo com glifo

`CatalogPanel.svelte` desenha uma miniatura proporcional para cada item. Quando o item tem glifo, o mini-canvas desenha o glifo em vez do retângulo vazio. A miniatura é um `CanvasTarget` pequeno (~80px) onde o glifo é expandido em primitivas e desenhado com escala uniforme (a miniatura usa `min(w, h)` para manter proporção, centralizado).

## 9. Herança de glifo

Item de usuário sem `glyph` próprio, mas com `id` colidindo com o default, herda o glifo do default. A resolução acontece no `app`, que monta o mapa `catalogId → FurnitureGlyph`:

```ts
function resolveGlyphMap(defaultCatalog, userCatalog, glyphs): Map<string, FurnitureGlyph> {
  const map = new Map<string, FurnitureGlyph>()
  for (const glyph of glyphs) map.set(glyph.id, glyph)
  return map
}
```

Quando o `catalogId` do `FurnitureItem` existe no mapa, o glifo é usado. Item sem `catalogId` (`null`) não tem glifo.

## 10. `RenderContext.glyphs`

```ts
// renderer/src/renderContext.ts
export interface RenderContext {
  // ... existentes ...
  readonly glyphs?: ReadonlyMap<string, FurnitureGlyph>
}
```

O `app` monta o mapa na inicialização e passa em toda chamada de `render`. O renderer consulta `ctx.glyphs?.get(item.catalogId ?? '')` — sem entrada, desenha retângulo.

## 11. Comandos `CreateWall` / `DeleteWall`

### CreateWall

```ts
interface CreateWallPayload {
  nodes: { id: NodeId; x: number; y: number }[]
  segments: { a: NodeId; b: NodeId; wallId?: WallId }[]
}
```

- Cria nós e paredes atomicamente
- `segments` referencia ids de `nodes` ou de nós já existentes
- Nó com coordenada idêntica a um existente é reusado (E6)
- Segmento duplicado é omitido (ver §4)
- Se `segments` após filtragem fica vazio, rejeita com `EMPTY_WALL`
- Rejeita: `a === b` (`DEGENERATE_WALL`), nó desconhecido (`NODE_NOT_FOUND`), coordenada não inteira (`NON_INTEGER_COORDINATE`), `segments` vazio inicial (`EMPTY_WALL`)

### DeleteWall

```ts
interface DeleteWallPayload {
  wallId: WallId
}
```

- Remove a parede. Nós órfãos saem no GC ao salvar (W5).
- Rejeita id inexistente (`WALL_NOT_FOUND`)

### Códigos de erro novos

`EMPTY_WALL`, `WALL_NOT_FOUND`. `DEGENERATE_WALL` já existia.

## 12. `SetEdgeLength` com `EdgeRef` de `kind: 'wall'`

Já funciona. `resolveEdgeRef` em `core/commands/commands.ts` já trata `kind: 'wall'`:

```ts
if (edge.kind === 'wall') {
  const wall = doc.walls.find(candidate => candidate.id === edge.wallId)
  if (!wall) return null
  return { startId: wall.a, endId: wall.b, roomId: null }
}
```

O nó final é `b`, e `roomId: null` faz `isShared` retornar `false`, então `mode` é ignorado — usa `MoveNode` direto. Nenhuma mudança necessária em `core`.

O que precisa mudar é `app`: o `SelectTool` já emite `SetEdgeLength` para `EdgeRef` de `kind: 'room'`; precisa aceitar também `kind: 'wall'` quando uma parede avulsa está selecionada. O painel de propriedades já renderiza campo de comprimento para `SelectionRef` de `kind: 'edge'` — `EdgeRef` unificado cobre os dois casos.

## 13. Parede avulsa: seleção, exclusão e cota

### Seleção

Parede avulsa é selecionada como aresta: `SelectionRef` de `kind: 'edge'` com `EdgeRef` de `kind: 'wall'`. Nenhum variante novo.

### Exclusão

`Delete` com `SelectionRef` de `kind: 'edge'` onde `edge.kind === 'wall'` emite `DeleteWall`. A distinção no `SelectTool`:

```ts
if (ref.kind === 'edge' && ref.edge.kind === 'wall') {
  commands.push({ type: 'DeleteWall', payload: { wallId: ref.edge.wallId } })
}
```

### Cota

O pass de cotas (`renderer/src/passes/dimensions.ts`) já desenha cota de aresta de cômodo. Parede avulsa entra no mesmo pass: para cada `Wall` no documento, desenha uma cota de comprimento com o mesmo estilo. A cota fica do lado de fora (normal interna), como a de cômodo.

## 14. Canto de móvel como âncora de Classe 1

### `SnapContext` ganha flag

```ts
export interface SnapContext {
  // ... existentes ...
  furnitureCorners?: readonly Point[]
}
```

### `SnapTarget` ganha variante

```ts
export type SnapTarget =
  | // ... existentes ...
  | { kind: 'furnitureCorner'; at: Point }
```

### `resolveAnchor` inclui cantos de móvel

Quando `furnitureCorners` está presente, os pontos são tratados como candidatos de Classe 1 com a mesma tolerância de nó. Produzem `targets: [{ kind: 'furnitureCorner', at }]` e `merged: null`.

### Quem popula

Só a Ferramenta Medir. `resolveToolSnap` em `app/tools/snapContext.ts` recebe o flag e repassa para `resolveSnap`. O `MeasureToolContext` inclui `furnitureCorners` derivados de `obbCorners` de todos os móveis do documento.

## 15. Barra de ferramentas

`toolbarModel.ts`:

```ts
export const TOOLBAR_BUTTONS: readonly ToolbarButton[] = [
  { id: 'select', shortcut: 'V', enabled: true },
  { id: 'room', shortcut: 'R', enabled: true },
  { id: 'wall', shortcut: 'W', enabled: true },      // era false
  { id: 'furniture', shortcut: 'F', enabled: true },
  { id: 'measure', shortcut: 'M', enabled: true },    // era false
]
```

`Toolbar.svelte`: remove `aria-disabled` e a classe `unavailable` dos botões wall e measure. O `activate` para de rejeitar `'wall'` e `'measure'` — agora dispara `onSelect`.

`ToolbarId` passa a ser sinônimo de `ToolId` (sem os literais `'wall'` e `'measure'` separados).

`toolShortcuts.ts`: `ToolId` ganha `'wall' | 'measure'`. A tabela de atalhos `classifyKey` mapeia `w` → `activateTool: 'wall'`, `m` → `activateTool: 'measure'`.

`App.svelte`: `activateTool` ganha cases para `'wall'` e `'measure'`.

## 16. Ordem de implementação e commits

1. **`FurnitureGlyph` + `GlyphPrimitive` em core** — tipo, exports, schema
2. **`writeArcPoints` em `core/geometry`** — função pura, testes
3. **`glyphs.json` + schema Zod em catalog** — 21 glifos, validação, loader
4. **`RenderContext.glyphs` + render no pass de mobília + nível de detalhe** — renderer lê glifo, expande primitivas
5. **Miniatura do catálogo + herança de glifo** — CatalogPanel, resolveGlyphMap
6. **`CreateWall` / `DeleteWall`** — comandos, testes de idempotência
7. **Ferramenta Parede** — wallTool.ts, integração no App.svelte
8. **Cota de parede avulsa + seleção/exclusão** — dimensions pass, selectTool
9. **Canto de móvel como âncora Classe 1** — SnapContext, resolveAnchor
10. **Ferramenta Medir** — measureTool.ts, overlays measure/measureLabel
11. **Barra de ferramentas** — habilitar wall e measure
12. **Testes e2e** — bancada + geladeira, medição + Esc
13. **Fixture + bench** — furnished com paredes avulsas e glifos
14. **Validação visual** — abrir dev, confirmar cama/vaso/sofá reconhecíveis

## 17. Transições pendentes da Ferramenta Medir

A spec não define explicitamente. Comportamento adotado:

| Situação | Comportamento |
|---|---|
| `Enter` durante Dragging | Confirma a medição (equivalente a `pointerUp`) |
| Duplo clique durante Dragging | Sem efeito (já está medindo) |
| `Backspace`/`Delete` durante Dragging/Done | Sem efeito (medição não é seleção nem traço) |
| Trocar de ferramenta durante Dragging/Done | Limpa a medição e ativa a nova ferramenta |
| Medir com `Alt` | Desliga snap (como qualquer arraste) |

## 18. Critérios de encerramento

1. **e2e bancada + geladeira:** Desenha bancada com W (clique, "2400 Enter", Enter), confere cota, insere geladeira perto, confere que encosta e alinha — contra build de produção.

2. **e2e medição + Esc:** Mede distância entre dois pontos com M, confere número na tela após pointerup, Esc limpa sem gastar undo (Ctrl+Z desfaz comando anterior).

3. **Fixture furnished:** Ganha pelo menos duas paredes avulsas, autoradas com Ferramenta Parede.

4. **Bench:** `pnpm bench` com fixture furnished atualizada (móveis com glifo + paredes avulsas) continua dentro de 8 ms, sem alocação por frame.

5. **Validação visual:** Abrir `pnpm dev`, inserir cama, vaso e sofá, confirmar que são reconhecíveis sem ler rótulo. Registrar em `m3-5-simbolos-parede-e-medida-cobertura.md`.