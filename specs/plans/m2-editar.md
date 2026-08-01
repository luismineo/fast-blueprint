# M2 — Editar: plano aprovado

Plano de implementação do M2 (`specs/09-roadmap.md`), aprovado antes de qualquer
código. Uma tarefa por commit, na ordem abaixo. Antes de cada commit:
`pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise`.

## Contexto

O M1 entregou desenho e medição: dá para criar um cômodo, mas não para consertá-lo.
Qualquer erro de trena obriga a apagar e redesenhar. O M2 fecha esse buraco —
selecionar, arrastar, corrigir medida, fundir e separar nós — e é o milestone em que
a promessa central do produto ("mover uma parede compartilhada atualiza os dois
cômodos", ADR-0002) sai do modelo de dados e chega à mão do usuário.

Estado atual: 198 testes verdes, `core` com `model`/`geometry`/`format`/`snap`/
`commands`/`history`/`overlay`, renderer com 9 passes, app com a Ferramenta Cômodo
e o HUD. Não existem seleção, hit testing, arraste, nem Classe 2 completa do snap.

**Uma dívida do M1 confirmada por simulação bloqueia o resto.** `DocumentStore.undo()`
aplica os `inversePatches` na ordem de acumulação, contra o que `specs/08` § Histórico
determina. Simulei três frames de arraste com Immer:

```
frames:            x = 0 → 100 → 200 → 300
inversos acumulados: [replace x=0, replace x=100, replace x=200]
undo na ordem de acumulação → x = 200   ← implementação atual
undo em ordem reversa       → x = 0     ← correto
```

Nenhum teste pega isso hoje porque todos usam sequência de comprimento 1 — exatamente
o furo que a spec 08 antecipa por escrito. Todo comando transiente do M2 depende dessa
correção, então ela vem antes de qualquer arraste.

Uma segunda simulação mostrou que a regra da spec não pode ser aplicada literalmente a
um array achatado: dentro de **um** comando, os inversos do Immer já vêm em ordem de
aplicação reversa, e invertê-los corrompe o documento.

```
CreateRoom (3 nós + 1 cômodo)
inversos: [remove rooms/0, remove nodes/2, remove nodes/1, remove nodes/0]
ordem original → {nodes: [], rooms: []}        ← correto
ordem reversa  → {nodes: [{id:'b'}], rooms: []} ← corrompido
```

A unidade de inversão é o **grupo de um comando**, não o patch. Isso vira adendo à
spec 08 (T1) antes de virar código (T2).

## Decisões que a spec não tomou

Aprovadas na conversa de planejamento:

1. **`SplitNode` é atômico com destino.** `{ nodeId, roomId, to }` desconecta e
   reposiciona a cópia numa operação. O app só o emite no primeiro `pointermove`
   com delta ≠ 0, nunca no `pointerdown`. E6 nunca é violada e nenhuma invariante
   muda de nível. Sem isso, `SplitNode` contradiz E6 por construção.
2. **`fast-check` entra como devDependency da raiz**, com `core/testing/arbitraries.ts`
   que a `specs/10` nomeia. Fecha os property tests que o M1 deixou em aberto.
3. **Chrome: só o painel de propriedades.** Sem barra de ferramentas, sem `Ctrl+B`.
   Troca de ferramenta por `V` e `R`.

Tomadas por mim, por ausência de texto na spec (cada uma vira adendo em T1):

4. **`Selection` é definida em `core/selection`** como `readonly SelectionRef[]`, com
   `SelectionRef = {kind:'room'|'node'|'edge'}`. A `specs/04` cita `selection: Selection`
   no `RenderContext` mas o tipo não existe em spec alguma; renderer e app precisam
   dele, e a direção de dependência só admite `core`.
5. **Direção da aresta em `SetEdgeLength` segue a ordem do loop.** "Move o nó final"
   (`specs/03`) é ambíguo num duplo clique; o loop é normalizado para horário, então
   `loop[(index+1) % n]` é o nó final. Determinístico e independente de onde o clique caiu.
6. **`SetEdgeLength` que colidiria dois nós é rejeitada**, com código de erro, sem tocar
   no documento. Fundir em silêncio é o reparo silencioso que o post-mortem do M1
   registra como causa de um cômodo ter virado uma linha reta.
7. **Alinhamento (Classe 2) = retas horizontal e vertical por cada nó existente**,
   mais a família de 45° com `Shift`, coerente com a regra de eixo. A `specs/02` nomeia
   o alvo mas não diz quais retas.
8. **Origem do eixo durante arraste = posição do nó no início do arraste.** A
   `specs/02` fala em "origem do traço", que não existe fora da Ferramenta Cômodo.
   É o que faz "empurrar uma parede" andar reto.
9. **Dígitos vão para o campo do HUD que tem foco**, e para o de comprimento quando o
   foco está fora do HUD. Sem isso, `Tab` → ângulo → dígitos é inalcançável, porque hoje
   todo dígito é redirecionado para comprimento.
10. **O campo de ângulo congela a direção no `oninput`**, não no `Enter`. `Enter`
    mantém exatamente a tabela de `specs/03` (comprimento preenchido confirma, vazio
    fecha). O ângulo é override de direção, não um gatilho novo — nenhuma regra nova
    entra na tabela.
11. **`Delete`/`Backspace` exclui apenas cômodos selecionados.** Não existe
    `DeleteNode` nem `DeleteEdge` na tabela de comandos da `specs/08`; inventar um
    seria escopo, não implementação.
12. **A paleta de cores de cômodo mora em `core`**, não no tema. `Room.color` é dado
    de documento — vai para o arquivo salvo — e não token de apresentação. O critério
    "nenhuma string hexadecimal fora de `renderer/theme.ts`" (`specs/04`) ganha essa
    exceção explícita, com a regra de lint apontando para o arquivo novo.

## Ordem das tarefas

A ordem é **de baixo para cima na direção de dependência** (`core → renderer → app`),
com uma inversão deliberada: a correção do histórico (T2) vem antes dos comandos que a
usam, porque é dívida confirmada e todo comando transiente depende dela.

A lição #1 do post-mortem do M1 — "teste de unidade sobre payload não prova nada" —
governa a granularidade: cada tarefa de comando assere contra o **documento resultante**,
nunca contra o payload, e T16 atravessa tool → store → renderer antes do encerramento.

Uma tarefa por commit. `pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise`
verdes antes de cada um.

### T0 — Gravar o plano aprovado

`specs/plans/m2-editar.md`. Commit próprio, antes de qualquer código.

### T1 — Adendos de spec

Commit separado, antes do código (`CLAUDE.md` § Specs são a fonte da verdade, passo 2).

| Spec | Adendo |
|---|---|
| `08-arquitetura.md` | `HistoryEntry` definida com **grupos** de patches; regra de inversão reformulada para "grupos em ordem reversa, cada grupo na ordem de emissão", com as duas simulações acima como justificativa. Assinaturas de `MoveNode`, `MergeNodes`, `SplitNode`, `SetEdgeLength`, `SetRoomColor`, `SetRoomUsable`, `BatchCommand`. Novos `CommandErrorCode`. |
| `03-ferramentas-e-interacao.md` | Tabela unificada ganha `Ctrl/Cmd+A` (hoje só aparece em § Selecionar — a tabela é a dona da lista). `Ctrl/Cmd+D` marcado como M3, sem comando de duplicação em v1. Máquina de estados da Ferramenta Selecionar. Campo de ângulo editável: roteamento de dígito por campo focado, congelamento no `oninput`. `HitResult` definido. |
| `04-renderizacao.md` | `selection` e `hover` no `RenderContext`; pass 12 `selection` deixa de ser no-op; nota de que a paleta de cor de cômodo é dado de documento, não token de tema. |
| `02-unidades-e-geometria.md` | Expressão aritmética simples na entrada numérica (a `specs/07` exige `158+40` → 198, mas quem é dona da regra de entrada é a `02`). Alinhamento da Classe 2 definido como retas H/V por nó. |
| `01-modelo-de-dominio.md` | Nota em E6: `SplitNode` reposiciona a cópia atomicamente, não existe estado intermediário coincidente. |
| `09-roadmap.md` | M2 registra o que ficou fora e para onde foi (§ Critérios não satisfeitos, abaixo). |

### T2 — `core/history`: inversão por grupo, redo de arraste, compactação

Teste primeiro — a `specs/08` já escreveu os quatro casos.

Arquivos: `packages/core/src/history/store.ts`, `store.test.ts`.

- `PendingEntry`/`HistoryEntry` passam a guardar `Patch[][]` (grupos).
- `undo` aplica grupos do último ao primeiro; `redo` do primeiro ao último.
- Entrada selada de arraste ganha os patches diretos — hoje `patches: []`, o que faz
  redo de um arraste ser um no-op silencioso.
- Compactação da `specs/08` § Compactação: dentro de uma pendência, `replace` sobre
  caminho idêntico mantém só o inverso mais antigo.

Satisfaz: **08-4** (40 frames → uma entrada), **08-5** (≥3 frames → posição inicial),
**08-6** (`Esc` reverte e não empilha), **08-7** (`Ctrl+Z` com pendência aberta é no-op).

### T3 — `core/commands`: `MoveNode` e `BatchCommand`

Arquivos: `packages/core/src/commands/commands.ts`, `commands.test.ts`.

`MoveNode { nodeId, x, y }`, transiente durante arraste. `BatchCommand` agrega e produz
um único item de histórico (`specs/08` § Comandos v1). Rejeita movimento que colidiria
com nó existente (E6).

Satisfaz: **01-2** (mover nó compartilhado atualiza a área dos dois cômodos).

### T4 — `core/commands`: `MergeNodes` e `SplitNode`

Arquivos: os mesmos de T3.

`MergeNodes { keep, remove }` reaponta toda referência e apaga o removido. Se um loop
passa a conter o mesmo nó duas vezes, a repetição sai do loop (E4); se o loop cair
abaixo de 3 nós, o comando é rejeitado (E3), sem tocar no documento.
`SplitNode { nodeId, roomId, to }` conforme a decisão 1.

Satisfaz: parte de **03-7** (arraste de nó compartilhado) e o mecanismo de
"Só este cômodo" de **03-8**.

### T5 — `core/commands`: `SetEdgeLength`

Arquivos: os mesmos de T3.

`SetEdgeLength { edge: EdgeRef, length, mode: 'moveTogether' | 'detach' }`.
`detach` compõe `SplitNode` + `MoveNode` num `BatchCommand`. Decisões 5 e 6.

Satisfaz: **03-8** (as duas opções existem no domínio; o default é da UI, em T15).

### T6 — `core/commands`: `SetRoomColor`, `SetRoomUsable` e a paleta

Arquivos: `commands.ts`, `commands.test.ts`, `packages/core/src/model/roomPalette.ts`,
`eslint.config.js` (exceção da decisão 12).

Satisfaz: os campos "cor" e "contar na área útil" do painel de cômodo (`specs/07` § Painel).

### T7 — `core/snap`: Classe 1 completa e Classe 2 completa

Arquivos: `packages/core/src/snap/snap.ts`, `snap.test.ts`.

- Classe 1 ganha **ponto médio de aresta** (preenche `targets`, deixa `merged = null`).
- Classe 2 ganha **projeção sobre aresta**, **extensão**, **alinhamento**, mantendo o
  eixo; prioridade, descarte abaixo de 15°, interseção das duas maiores, fallback de
  40 mm — tudo como a ADR-0003 escreve.
- `SnapTarget` cresce para carregar a geometria que as guias precisam desenhar.

Satisfaz: **02-5** (ponto médio), **02-6** (< 15° descarta a menor), e mantém
**02-4**, **02-7**, **02-8** verdes.

### T8 — `core/hit`: hit testing

Arquivos: `packages/core/src/hit/hitTest.ts`, `hitTest.test.ts`, `index.ts`.

Ordem de prioridade e tolerâncias da `specs/02` § Hit testing (6 px linear, 10 px
handle). Móvel e abertura iteram array vazio até M3/M6.

### T9 — `core/selection`: tipos e poda por melhor esforço

Arquivos: `packages/core/src/selection/selection.ts`, `selection.test.ts`, `index.ts`.

Decisão 4, mais `pruneSelection(doc, selection)` para a regra "undo restaura a seleção
por melhor esforço (ids que ainda existem)" da `specs/08` § Histórico.

Satisfaz: **08-8** (undo após criar cômodo restaura e limpa seleção sem erro).

### T10 — `core/format`: expressão aritmética e `parseAngle`

Arquivos: `packages/core/src/format/format.ts`, `format.test.ts`.

`158+40` → 198, sobre as mesmas regras de unidade da `specs/02` § Entrada numérica.
`parseAngle` normaliza para 0–359 com referência no eixo X positivo.

Satisfaz: **07-2** (todo campo numérico aceita `158+40`).

### T11 — `renderer`: pass `selection` e guias novas

Arquivos: `packages/renderer/src/renderContext.ts`, `render.ts`,
`passes/selection.ts`, `passes/snapGuides.ts`, `overlayStyle.ts`,
`passes/selection.test.ts`, `passes/overlay.test.ts`.

`RenderContext` ganha `selection` e `hover`. Handles de 8 px e aresta selecionada com
espessura dobrada e rótulo sempre visível (`specs/03` § Handles). Papéis de overlay
novos para ponto médio, aresta e alinhamento. Tudo em espaço de tela, sem alocação
por frame, com estilos memoizados por tema como `overlayStyles` já faz.

Satisfaz: **10-6** (`RecordingTarget` cobre todos os passes de `04`), mantém
**04-1** e **04-8**.

### T12 — `app`: Ferramenta Selecionar

Arquivos: `packages/app/src/tools/selectTool.ts`, `selectTool.test.ts`,
`tools/toolShortcuts.ts`, `toolShortcuts.test.ts`.

Máquina de estados pura, no formato que `roomTool.ts` já estabeleceu (`(state, event,
ctx) → {state, commands, overlays, historyBoundary}`). Cobre: clique, `Ctrl/Cmd`+clique,
retângulo por envolvimento completo, `Ctrl/Cmd+A`, `Esc`, `Delete`/`Backspace`
(decisão 11), arraste de nó / aresta / interior de cômodo, duplo clique em cômodo e em
aresta. `Alt` desliga snap durante o arraste. `historyBoundary` `'commit'` no
`pointerup` e `'abort'` no `Esc`.

Satisfaz: **03-7** (área dos dois cômodos em tempo real), **03-10** (`Alt` desliga
todos os snaps), **03-12** (nenhuma ferramenta acessa o documento fora de `ToolContext`).

### T13 — `app`: entrada de ângulo no HUD

Arquivos: `packages/app/src/App.svelte`, `tools/roomTool.ts`, `roomTool.test.ts`,
`tools/toolShortcuts.ts`, `messages.ts`.

Decisões 9 e 10. O campo de ângulo deixa de ser `readonly`; a armadilha de foco e o
`Tab` entre campos já existem.

Satisfaz: o item explícito do M2 em `specs/09` § M2, mantendo **03-2** e **03-3**.

### T14 — `app`: painel de propriedades

Arquivos: `packages/app/src/components/PropertiesPanel.svelte` (+ um componente por
variante), `stores/selection.svelte.ts`, `messages.ts`, `App.svelte`,
`messages.test.ts`.

Quatro variantes da `specs/07` § Painel de propriedades: nada selecionado, cômodo,
aresta, nó. Nenhum cálculo geométrico em `.svelte` — os derivados vêm de seletores em
`core`, como `computeUsableArea` já faz. Nenhum literal de texto: tudo por `messages.ts`.
`messages.test.ts` assere que nenhuma chave é órfã nos dois sentidos.

Satisfaz: **07-12** (nenhuma chave órfã), **07-3**, **07-4**, **07-8**, **08-9**
(nenhum `.svelte` importa de `core/geometry`).

### T15 — `app`: diálogo de nó compartilhado e confirmação de fusão

Arquivos: `packages/app/src/components/SharedNodeChoice.svelte`,
`stores/sessionPrefs.svelte.ts`, `messages.ts`, `App.svelte`.

Duplo clique em aresta abre o campo de comprimento com o valor atual selecionado. Se o
nó final é compartilhado, os dois botões inline aparecem com "Mover junto" como default,
e a escolha é lembrada durante a sessão (`specs/03` § Editar comprimento de aresta).
Soltar um nó sobre outro funde com confirmação inline desfazível.

Satisfaz: **03-8** completo (as duas opções e o default).

### T16 — Property tests, integração e e2e

Arquivos: `package.json` (fast-check), `packages/core/src/testing/arbitraries.ts`,
`packages/core/src/commands/commands.property.test.ts`,
`packages/core/src/snap/snap.property.test.ts`,
`packages/core/src/history/store.property.test.ts`,
`packages/app/src/tools/selectTool.integration.test.ts`, `e2e/edit.spec.ts`.

Property tests da `specs/10` que caem no escopo, a 200 runs: comandos invertíveis, área
consistente, área invariante a transformação rígida, fechamento sempre fecha, snap
idempotente, parse total, nós nunca colidem, undo restaura.

A integração dirige arraste → store → documento e assere contra o **documento**, como
`roomTool.integration.test.ts` já faz. O e2e roda contra o build de produção: desenhar,
arrastar um nó compartilhado, conferir as duas áreas, desfazer.

Satisfaz: **02-10**, **02-11**, **08-3**, **10-2** (parcial — ver abaixo).

### T17 — Cobertura e encerramento

`specs/plans/m2-editar-cobertura.md`: cada critério de aceitação no escopo e o teste
que o cobre. Confere cobertura de `core` ≥ 90% e bundle < 300 KB gzipped.

Satisfaz: **10-7**, **08-11**.

## Critérios de aceitação que este milestone NÃO satisfaz

| Critério | Spec | Cai em |
|---|---|---|
| Redimensionar cômodo mantém aberturas ancoradas | 01-6 | M6 — não existe `Opening` |
| SAT entre retângulos rotacionados 30° e 60° | 02-9 | M3 — geometria de mobília |
| Móvel a 100 mm de parede encosta; a 200 mm não | 03-9 | M3 |
| `Home` com foco na barra de ferramentas | 03-13, 07-13 | M3 — decisão 3: sem barra de ferramentas |
| Tabela de atalhos verificada em Chrome e Firefox reais | 03-14 | Manual, permanece pendente desde o M1 |
| Profiler < 8 ms com `apto-44m2` + 40 móveis | 04-6 | M3 |
| SVG e PNG com geometria coincidente | 04-7 | M4 |
| Painel direito recolhe com `Ctrl/Cmd+B` | 07-1 | M3 — decisão 3 |
| Texto de interface a 4,5:1 | 07-5 | M2 parcial: os tokens da `specs/07` são usados, mas a verificação é manual |
| Atalhos em teclado ABNT2 | 07-10 | Manual, pendente desde o M1 |
| Lint falha com literal de texto em `.svelte` | 07-11 | M3 — o teste de chave órfã (07-12) entra agora e cobre o caso comum sem plugin novo |
| Migração de `legacy/v0.planta.json` | 10-5 | M4 |
| Property tests de mobília (colisão, contenção) | 10-2 parcial | M3 |
| `Ctrl/Cmd+D` duplicar seleção | 03 § tabela | M3 — não existe comando de duplicação na `specs/08` |
| Ferramenta Parede (`W`), `CreateWall`/`DeleteWall` | 03 § Parede, 08 | Fora do M2 pelo roadmap; a `specs/08` os marca M1 e nunca foram feitos |

## Verificação

Antes de cada commit:

```
pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise
```

No encerramento, além disso:

```
pnpm test --coverage      # core ≥ 90% de linhas
pnpm build                # bundle < 300 KB gzipped
pnpm e2e                  # smoke + room + edit
```

Verificação manual no navegador, porque o post-mortem do M1 registra que duas
ambiguidades reais só apareceram dirigindo o fluxo (`pnpm dev`, localhost:5173):

1. Desenhar dois cômodos adjacentes compartilhando aresta.
2. Arrastar o nó compartilhado e conferir que as duas áreas mudam juntas no painel.
3. Duplo clique na aresta compartilhada, digitar outra medida, conferir que
   "Mover junto" é o default e que "Só este cômodo" desconecta.
4. Arrastar um nó por vários frames, `Ctrl+Z`, conferir que ele volta ao ponto de
   partida do arraste — e não a um ponto do meio, que é o sintoma do bug de T2.
5. `Esc` no meio de um arraste: volta ao início e não gasta entrada de histórico.
6. `Tab` no HUD, digitar `90`, conferir que o segmento fantasma salta para o eixo.
