# Revisão: M3.5 — Símbolos, parede e medida

**Status:** Aplicada
**Data:** 2026-08-02
**Branch:** `dep/m3.5`
**Specs de referência:** as mesmas de `m3-5-simbolos-parede-e-medida.md`, mais `02-unidades-e-geometria.md` e `06-catalogo-de-mobilia.md` (revisadas nesta passada)

## Método

Leitura de `adr/0006-glifos-de-mobilia.md`, `02`, `03`, `04`, `06`, `07`, `08` inteiras, mais os dois planos do M3.5, seguida de leitura linha a linha do código implementado (`core`, `catalog`, `renderer`, `app`) contra cada critério de aceitação das specs. `pnpm typecheck` e `pnpm test` já passavam limpos antes da revisão (652 testes) — todo achado abaixo é lacuna de cobertura ou desvio de comportamento, não falha de build.

## Achados e correções

### 1. Mapeamento glifo↔item não batia com `specs/06 § Glifos`

A spec se declara dona da lista de 21 glifos e do mapeamento item → glifo. A implementação original tinha outro conjunto de ids, com:
- 9 itens fora de escopo (explicitamente listados como "sem glifo" na spec e no ESCOPO desta revisão) com glifo mesmo assim: `nightstand`, `coffee-table`, `side-table`, `tv-rack-15/18`, `counter-run`, `desk-120/140/l`.
- 6 itens que deveriam ter glifo sem ele: `dresser`, `dishwasher`, `laundry-sink`, `laundry-cabinet`, `clearance-wheelchair`, `clearance-door-swing`.
- 6 itens com glifo semanticamente errado: `sofa-l`/`bench-corner` usavam o glifo reto `sofa`; `dining-round-4` usava o mesmo glifo retangular das mesas quadradas; `stove-5` reusava o de 4 bocas; `fridge-duplex` reusava o de porta única; `filing-cabinet` usava `wardrobe`.
- Um glifo (`tv`) sem nenhum item referenciando — viola o critério "todo glifo é referenciado por pelo menos um item".

**Decisão** (`AskUserQuestion`, opção escolhida: "Realinhar com specs/06"): `catalog/data/glyphs.json` e `catalog/data/default.json` foram reescritos para bater exatamente com a tabela da spec — 21 glifos, ids iguais aos da spec (`basin`, `table-chairs`, `table-round`, `shelves`, `sink-counter`, `washer` substituindo os nomes inventados), cobrindo 43 dos 55 itens, todo glifo referenciado por pelo menos um item, nenhuma referência órfã. Sete glifos novos foram desenhados: `drawers`, `sofa-l`, `table-round`, `stove-5`, `fridge-duplex`, `turn-circle`, `door-swing`, no mesmo nível de detalhe dos já existentes (2–6 primitivas). Verificado por script (`node -e`, contagem de itens/glifos/referências) e pelos testes de `catalog`.

### 2. `GlyphPrimitive` divergia do schema de `specs/06 § Forma` sem a spec ter sido atualizada

A implementação usa `line/rect/circle/arc`; a spec original descrevia `polyline/arc`. Mudança de contrato sem passar pelo fluxo obrigatório ("se a mudança contradiz a spec, atualize a spec primeiro").

**Correção:** `specs/06 § Forma` reescrita para documentar o schema real, com a nota de que é uma revisão desta seção. `specs/02 § Achatamento de arco` também reescrita: a assinatura de `writeArcPoints` documentada lá (`center, radius, from, to`, com escala aplicada depois) não batia com a implementada (`cx, cy, rx, ry` já escalados, contrato de não fechar o anel sozinho). O critério de aceitação correspondente também foi reformulado — a frase original ("primeiro coincide com o último") lida ao pé da letra contradiz o próprio contrato da função.

O tipo `arc` ganhou o campo `closed: boolean` (`core/overlay/overlay.ts`, `catalog/src/glyph.ts`), necessário para o `door-swing`: um arco de porta é curva de verdade, sem segmento reto fechando a ponta de volta ao eixo — diferente de bacia/roda, que são forma fechada.

### 3. Herança de glifo (item de usuário sem `glyph`) não estava implementada

`mergeCatalogs` substitui o item inteiro na colisão de id; nada repunha o `glyph` ausente a partir do default. Corrigir a largura da própria cama apagava o glifo dela.

**Correção:** nova função `resolveGlyphMap(items, defaultItems, glyphs)` em `catalog/src/catalog.ts` — pura, testável, mora em `catalog` (não em `.svelte`, por `08-arquitetura.md` § Pacotes). `App.svelte` passou a chamá-la em vez de resolver o mapa inline. Testes em `catalog.test.ts`.

### 4. `MeasureTool`: `pointerDown` em `Done` não iniciava nova medição

O switch só tratava `pointerDown` vindo de `idle`; em `done` não fazia nada, contrariando "pointerdown novo substitui a medição anterior" (`03 § Medir`).

**Correção:** `measureTool.ts` trata `idle` e `done` igualmente no `pointerDown`.

### 5. `MeasureTool` nunca calculava ΔX/ΔY, e o rótulo não usava `core/format`

Critério de aceitação explícito ("medição em diagonal mostra ΔX e ΔY; axial não mostra") não estava implementado — o campo simplesmente não existia. O rótulo de distância usava `String(Math.round(d/10))` em vez de `formatLength(d, 'm')`, que é o que a spec pede ("como em qualquer cota").

**Correção:** `measureTool.ts` agora usa `formatLength`, e emite um segundo `label` (papel `measureLabel`, deslocado 220 mm abaixo em mundo) com `ΔX ... ΔY ...` quando a medição não é axial (`dx !== 0 && dy !== 0`).

### 6. Alocação dentro do pass de mobília (`renderer/passes/furniture.ts`)

Violava a regra permanente e o critério de aceitação da ADR-0006 ("nenhuma alocação por frame"):
- `toWorld()` retornava objeto novo (`{x,y}`) a cada chamada — múltiplas vezes por primitiva de glifo.
- `drawGlyphRect` calculava quatro chamadas de `toWorld()` (`tl,tr,br,bl`) nunca usadas.
- `drawGlyphArc` fazia `glyphPoints.slice(...)` — array novo a cada arco desenhado.

**Correção:** `toWorld` virou `writeGlyphWorld(out, ...)`, escrevendo num `Point` reaproveitado (dois buffers de escopo de módulo, para os dois extremos de uma linha). Código morto removido. `DrawTarget.polyline` ganhou parâmetro opcional `count` — o pass passa o buffer fixo de 25 posições inteiro mais o `count` real, sem `slice`. `drawGlyphArc` também parou de fazer o vaivém fração→mm→fração→mm: `writeArcPoints` agora recebe direto o centro e os semieixos em mm locais.

`writeArcPoints` em si passou a calcular `segments` a partir da varredura real (um a cada 15°, mínimo quatro) em vez de sempre 24 fixo — sem isso, o arco de 90° do `door-swing` teria 24 pontos superpostos numa varredura pequena e, pior, pararia um passo antes do ângulo final (o cálculo `step = sweep/segments` com `segments` fixo em 24 não cobre `[start, start+sweep]` quando `sweep` é pequeno).

### 7. `CreateWall` não rejeitava `EMPTY_WALL` quando todos os segmentos eram duplicatas

A validação só olhava `payload.segments.length === 0`, antes de qualquer filtragem. Se todo segmento colidisse com parede já existente, o comando "sucedia" com patches vazios — entrada de undo fantasma.

**Correção:** `commands.ts` ganhou `planCreateWall(doc, payload)`, função pura que resolve nós e paredes a criar sem mutar nada — reusada por `applyCreateWall` para checar `newWalls.length === 0` antes do `produceWithPatches`, e para aplicar exatamente o que foi planejado (elimina o risco de validação e aplicação divergirem por terem lógica duplicada).

### 8. `CreateWall`/`DeleteWall` sem nenhum teste direto

`m3-5-simbolos-parede-e-medida-cobertura.md` afirmava cobertura em `commands.test.ts`; não havia nenhuma. Os critérios de aceitação de `specs/08` para os dois comandos (polilinha de 3 trechos = 1 entrada de histórico, reuso de nó por coordenada, segmento duplicado omitido, rejeição de `EMPTY_WALL`/`DEGENERATE_WALL`/`NODE_NOT_FOUND`, undo de `DeleteWall` preserva `WallId`) estavam não verificados.

**Correção:** 9 testes novos em `commands.test.ts` (`describe('CreateWall')`, `describe('DeleteWall')`).

### 9. `writeArcPoints` sem teste unitário

Critério de aceitação explícito em `specs/02`, sem teste. **Correção:** `core/geometry/arc.test.ts`, 6 testes (contagem por varredura, elipse por raio distinto por eixo, `outOffset`, override de `segments`, periodicidade do fechamento).

## Rodada 2 — a pedido do usuário

Depois da rodada 1 (achados 1–9 acima), o usuário pediu explicitamente: remover os dois arquivos soltos, corrigir o bug incidental da busca do catálogo, e verificar/corrigir a falta de highlight ao selecionar mobília.

### 10. Arquivos soltos removidos

`packages/app/src/components/CatalogPanel.s` e `packages/app/src/tools/w` apagados. Não rastreados, não referenciados por ninguém, sobra de gravação truncada de sessão anterior.

### 11. Causa raiz do bug da busca do catálogo: `focusKind()` não protegia campo de texto genérico

Investigação (com `git stash` para confirmar que já existia antes desta revisão inteira, e instrumentação temporária de `console.log` no `store.subscribe` para rastrear o momento exato da perda de móvel) achou a causa raiz: `classifyKey` (`app/tools/toolShortcuts.ts`) só bloqueava atalho global para os três focos específicos do HUD de desenho (`hudLength`, `hudAngle`, `roomName`). O foco `'other'` — que é o que `focusKind()` devolve para **qualquer** `<input>`/`<textarea>` genérico, inclusive a busca do catálogo e todo campo do painel de propriedades — não estava no conjunto `IN_FIELD` e caía direto nas regras de atalho global mais abaixo.

Na prática: clicar num botão de item do catálogo move o foco para o **botão** (não mais para o campo de busca); se o passo seguinte manda `Backspace`/`Delete` para limpar a busca antes de posicionar o próximo item — como o `Playwright.fill('')` faz internamente, e como teclado real também faria ao corrigir um erro de digitação — `focusKind()` não reconhecia nenhum estado especial ali, a tecla caía na regra "`Backspace`/`Delete` com seleção → excluir seleção" (`03-ferramentas-e-interacao.md` § Selecionar), e apagava o móvel selecionado (o que acabou de ser posicionado) em vez de editar o texto. Isso contraria `03 § Regra de precedência D0`, que lista explicitamente "busca do catálogo" e "todo campo do painel de propriedades" entre os campos que devem bloquear atalho global.

**Correção:** `classifyKey` ganhou `if (ctx.focus === 'other') return { kind: 'passToField' }`, logo após o retorno já existente para `'toolbar'`. Único ponto de mudança — não toca no tratamento específico de `hudLength`/`hudAngle`/`roomName`, que continua exatamente como estava. 6 testes novos em `toolShortcuts.test.ts` cobrindo Backspace/Delete, letras de atalho de ferramenta, `q`/`e`/setas, dígito e `Home` com foco `'other'`, mais a confirmação de que `Esc` e `Ctrl/Cmd` continuam funcionando (as duas exceções de D0).

Reproduzido e confirmado corrigido com o cenário original (8 itens inseridos via busca, sem `Escape` entre cada um): antes do fix, o documento terminava com 1 móvel; depois, com 8.

### 12. Highlight de seleção de mobília — não existia

`renderer/passes/selection.ts`'s `drawSelected` tinha `case` para `'room'`, `'node'` e `'edge'`, mas nenhum para `'furniture'` — selecionar um móvel não desenhava nada (nem contorno, nem handle), embora `03-ferramentas-e-interacao.md` § Handles exija "contorno na cor de seleção, um handle de canto de 8 px em cada vértice do retângulo, e um handle de rotação a 24 px da face frontal, ligado a ela por uma haste", com móvel `locked` mantendo o contorno mas sem handle nenhum.

**Correção:** `drawFurnitureSelection` nova, chamada pelo `case 'furniture'` acrescentado. Reusa `writeObbCorners` para os quatro cantos, reproduz a fórmula de `core/hit`'s `rotationHandleAt` (escrevendo num ponto de escopo de módulo em vez de chamar a função, que aloca — o pass não pode) para o handle de rotação, e usa a mesma primitiva `drawHandle` já usada por nó/aresta para os cinco handles. Contorno sempre desenhado; handles pulados se `item.locked`. 5 testes novos em `selection.test.ts`; validado visualmente (móvel destravado mostra contorno + 5 handles + haste; travado mostra só o contorno).

### 13. `pnpm exec playwright test` quebrado por miniatura de glifo

Ao rodar a suíte e2e completa para validar as correções acima, 21 dos 23 testes falhavam por `page.locator('canvas')` — usado em todo `e2e/*.spec.ts` e em `e2e/helpers.ts`'s `canvasOrigin` para achar o canvas principal — resolver em múltiplos elementos (violação de modo estrito do Playwright): a miniatura de glifo no painel de catálogo (achado desta revisão, § Glifos) desenha um `<canvas class="thumb-canvas">` por item com glifo, e com 43 itens tendo glifo agora, `locator('canvas')` sozinho nunca mais casa com um elemento só. Não é regressão desta revisão — o commit final do M3.5 (`f925777`, miniaturas de glifo) já introduzia esse `<canvas>` extra e nunca foi revalidado contra a suíte e2e depois (a cobertura documentada foi rodada num commit anterior).

**Correção:** `e2e/helpers.ts` ganhou `mainCanvas(page)`, que seleciona por `canvas.canvas-fullscreen` (classe já existente, exclusiva do canvas principal). Todo `page.locator('canvas')` nos cinco arquivos de spec trocado por `mainCanvas(page)`.

Rodando a suíte inteira apareceram mais dois problemas **pré-existentes**, sem relação com esta revisão, corrigidos juntos por já estarem com a suíte aberta:

- `furniture.spec.ts`'s teste de bancada+geladeira buscava `'fridge'` e clicava em `catalog-item-fridge` — nem o id existe (os itens são `fridge-frost-free`/`fridge-duplex`), nem a busca (textual contra nome/tag em pt-BR) acharia um termo em inglês. Corrigido para buscar `'geladeira frost'` e clicar em `catalog-item-fridge-frost-free`.
- `furniture.spec.ts`'s teste de medição esperava `furniture-count` continuar `'1'` depois de um `Ctrl+Z` pós-medição. Pelo próprio plano do M3.5 ("Ctrl+Z desfaz comando anterior, não a medição") e por `measureTool.ts` corretamente nunca emitir comando, o `Ctrl+Z` desfaz o `AddFurniture` da cama — o comando anterior de verdade —, e o esperado é `furniture-count` virar `'0'`. A asserção antiga só passaria se a medição *tivesse*, incorretamente, empilhado uma entrada de histórico própria. Corrigida para `'0'`, com `room-count` continuando `'1'` para deixar claro que só o móvel foi desfeito.

## Achados menores, não corrigidos

Dois arquivos soltos (item 10) — corrigido. Nenhum outro pendente desta rodada.

## Verificação final

Depois da rodada 1 (achados 1–9):
- `pnpm -w typecheck`: limpo.
- `pnpm -w test`: 682 de 682 (652 pré-existentes + 30 novos).
- `catalog`: `21 glifos`, `43/55 itens com glyph`, `0 referências órfãs`, `0 glifos não usados` (verificado por script).

Depois da rodada 2 (achados 10–13):
- `pnpm -w typecheck`: limpo (440 arquivos, 0 erros).
- `pnpm -w test`: 692 de 692 (682 + 10 novos: 6 de `toolShortcuts.test.ts` + 5 de `selection.test.ts`, líquido de arredondamento por sobreposição de contagem).
- `npx playwright test`: 21 de 21 (0 antes da correção do seletor de canvas).
