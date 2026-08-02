# M2 — Editar: cobertura dos critérios de aceitação

Critério de encerramento do milestone: todo critério de aceitação que cai no
escopo do M2 passa como teste automatizado. Este arquivo lista cada um e o teste
que o cobre.

Estado da suíte no encerramento: **386 testes**, `pnpm typecheck`, `pnpm test`,
`pnpm lint` e `pnpm depcruise` limpos. Cobertura de linhas de `core`: **91,22%**
(limite 90%). Bundle de produção: **57,9 KB gzipped** (limite 300 KB).

Os critérios são numerados pela posição na seção "Critérios de aceitação" da
spec correspondente.

## 01 — Modelo de domínio

| # | Critério | Teste |
|---|---|---|
| 01-2 | Mover um nó compartilhado por dois cômodos atualiza a área de ambos | `core/commands/moveNode.test.ts` → "mover um nó compartilhado atualiza a área dos dois cômodos"; `app/tools/selectTool.integration.test.ts` → "arrastar nó compartilhado atualiza a área dos dois cômodos" |

## 02 — Unidades e geometria

| # | Critério | Teste |
|---|---|---|
| 02-2 (novo) | `parseLength('158+40')` → 1980; expressão malformada não aplica valor | `core/format/expression.test.ts` → "158+40 resolve para 198 cm", "cada termo carrega a própria unidade", "expressão malformada devolve null" |
| 02-5 | Ponto médio de aresta preenche `targets` mas deixa `merged = null` | `core/snap/snapClasses.test.ts` → "preenche targets mas deixa merged = null" |
| 02-6 | Duas restrições de reta com ângulo < 15° descartam a de menor prioridade | `core/snap/snapClasses.test.ts` → "duas restrições com ângulo menor que 15° descartam a de menor prioridade" |
| 02-7 | Tolerância de snap respeita clamping em mm, independente da escala | `core/snap/snap.test.ts` → "grid com escala (tolerância em px→mm)"; `snapClasses.test.ts` → bloco "tolerâncias medidas no protótipo (ADR-0005)" |
| 02-8 (novo) | Em 0,06 px/mm clique a 10 px pega o nó; em 0,01 px/mm, 500 mm não pega | `core/snap/snapClasses.test.ts` → "em 0,06 px/mm...", "em 0,126 px/mm...", "o teto continua valendo..." |
| 02-9 | `Alt` faz o resolvedor devolver o ponto de entrada sem alteração | `core/snap/snap.test.ts` → "Alt desliga tudo"; `snapClasses.test.ts` → "Alt devolve o ponto de entrada mesmo com aresta e nó por perto"; `app/tools/selectTool.integration.test.ts` → "Alt durante o arraste desliga o snap" |
| 02-11 | Property: área por shoelace = soma dos triângulos da triangulação por fan | `core/testing/properties.test.ts` → "área por shoelace é igual à soma dos triângulos da triangulação por fan" (200 runs) |
| 02-12 | Property: para qualquer sequência de comprimentos, o polígono fecha | `app/tools/roomTool.property.test.ts` → três casos, 200 runs cada |

## 03 — Ferramentas e interação

| # | Critério | Teste |
|---|---|---|
| 03-7 | Arrastar nó compartilhado por dois cômodos atualiza a área dos dois em tempo real | `app/tools/selectTool.integration.test.ts` → "arrastar nó compartilhado atualiza a área dos dois cômodos"; `e2e/edit.spec.ts` → "arrastar uma parede compartilhada atualiza os dois comodos" |
| 03-8 | Editar comprimento de aresta com nó compartilhado oferece as duas opções, default "Mover junto" | `core/commands/setEdgeLength.test.ts` → "Mover junto move o nó compartilhado…", "Só este cômodo desconecta…"; `app/tools/selectTool.integration.test.ts` → "numa aresta pede o comprimento e informa se o nó final é compartilhado"; `e2e/edit.spec.ts` → "duplo clique numa aresta abre o campo de comprimento" |
| 03-10 | `Alt` durante qualquer arraste desativa todos os snaps | `app/tools/selectTool.integration.test.ts` → "Alt durante o arraste desliga o snap" |
| 03-12 | Nenhuma ferramenta acessa o objeto documento fora de `ToolContext` | Estrutural: `selectTool.ts` e `roomTool.ts` recebem `doc` só via contexto; `pnpm depcruise` garante a direção de dependência |
| 03-15 (novo) | Digitar `90` no campo de ângulo congela a direção no `oninput` | `app/tools/roomTool.integration.test.ts` → "o ângulo digitado congela a direção sem esperar Enter", "o segmento fantasma salta para o ângulo digitado antes de haver comprimento" |
| 03-16 (novo) | Com foco no ângulo, dígitos vão para ele e não para o comprimento | `app/tools/toolShortcuts.test.ts` → "dígito vai para o campo que tem foco" |
| 03-17 (novo) | Retângulo de seleção seleciona só quem está completamente envolvido | `core/selection/selection.test.ts` → "seleciona só quem está completamente envolvido", "cômodo parcialmente coberto não entra…"; `app/tools/selectTool.integration.test.ts` → "retângulo seleciona só quem está completamente envolvido" |
| 03-18 (novo) | `pointerdown` + `pointerup` sem movimento não abre pendência nem empilha histórico | `app/tools/selectTool.integration.test.ts` → "clique sem movimento não abre entrada pendente nem empilha histórico" |
| 03-19 (novo) | `Delete` com nó ou aresta selecionada não altera o documento; com cômodo, exclui | `app/tools/selectTool.integration.test.ts` → "Delete exclui cômodo selecionado, e ignora nó e aresta" |

## 04 — Renderização

| # | Critério | Teste |
|---|---|---|
| 04-8 | Nenhuma string hexadecimal de cor fora de `theme.ts` e da paleta de cômodo | `pnpm lint` (regra `no-restricted-syntax` com os dois arquivos exceptuados) |
| 04-9 (novo) | Pass `selection` desenha handle de 8 px, handle com contorno no hover, aresta com espessura dobrada e rótulo | `renderer/passes/selection.test.ts` → nove casos |

## 07 — Interface

| # | Critério | Teste |
|---|---|---|
| 07-2 | Todo campo numérico aceita `158+40` e resolve para 198 | `core/format/expression.test.ts` (regra); painel e HUD consomem `tryParseLength` |
| 07-12 | Nenhuma chave órfã em `messages.ts`, nos dois sentidos | `app/messages.test.ts` → três casos, incluindo o que verifica que a varredura acha os `.svelte` |

## 08 — Arquitetura

| # | Critério | Teste |
|---|---|---|
| 08-3 | Property: aplicar comando e depois os patches inversos devolve o documento original | `core/testing/properties.test.ts` → "aplicar um comando e depois seus patches inversos devolve o documento original" (200 runs); mais os casos por comando em `moveNode`, `nodeTopology`, `setEdgeLength`, `roomProps` |
| 08-4 | Arrastar um nó por 40 frames produz uma única entrada de undo | `core/history/drag.test.ts` → "arrastar um nó por 40 frames produz uma única entrada de undo" |
| 08-5 | Arrastar por ≥ 3 frames e desfazer devolve o nó à posição inicial | `core/history/drag.test.ts` → "arrastar por 3 frames distintos e desfazer devolve o nó à posição inicial" |
| 08-6 | `Esc` durante arraste reverte e não empilha entrada | `core/history/drag.test.ts` → "Esc durante um arraste reverte para a posição inicial e não empilha entrada"; `app/tools/selectTool.integration.test.ts` → "Esc no meio do arraste reverte e não empilha entrada" |
| 08-7 | `Ctrl/Cmd+Z` com entrada pendente aberta não altera documento nem pilha | `core/history/drag.test.ts` → "Ctrl+Z com entrada pendente aberta não altera documento nem pilha, e o arraste segue" |
| 08-8 | Undo após criar cômodo restaura documento e limpa seleção sem erro | `core/selection/selection.test.ts` → "undo depois de criar cômodo limpa a seleção sem erro" |
| 08-9 | Nenhum componente `.svelte` importa de `core/geometry` | Estrutural: toda derivação do painel vive em `components/panelModel.ts`; `pnpm depcruise` |
| 08-11 | Bundle de produção abaixo de 300 KB gzipped | `pnpm build` → 57,9 KB |

## 10 — Estratégia de testes

| # | Critério | Teste |
|---|---|---|
| 10-1 | Suíte de `core` roda em menos de 5 s | `pnpm test` → 2,7 s de execução |
| 10-2 | Property tests listados existem e passam com 200 runs | `core/testing/properties.test.ts` (8) + `app/tools/roomTool.property.test.ts` (3). Os de mobília ficam para o M3 |
| 10-6 | `RecordingTarget` cobre todos os passes de `04-renderizacao.md` | `renderer/render.test.ts` → "desenha geometria em espaco de mundo e texto/overlay em espaco de tela" (inclui `selection`); um teste por pass |
| 10-7 | CI falha se a cobertura de `core` cair abaixo de 90% | `vitest.config.ts` → `thresholds` em `packages/core/src/**`; medido em 91,22% |

## Defeitos encontrados durante o M2

Três, todos por caminhos que a suíte anterior não percorria. Ficam registrados
porque o padrão importa mais que os defeitos.

**1. Undo de arraste parava no meio do caminho.** `DocumentStore.undo()` aplicava
os patches inversos na ordem de acumulação. Um arraste de três frames de 0 a 300
voltava para 200. Encontrado por simulação com Immer antes de escrever código,
não por leitura da spec. Coberto por `core/history/drag.test.ts`.

**2. Entrada numérica criava nó coincidente.** Um traço que volta exatamente
sobre um nó já confirmado criava um segundo nó na mesma coordenada, e o comando
então fundia os dois e devolvia um ciclo com vértice repetido — documento com
E4. Encontrado pelo property test de fechamento, não por exemplo escrito à mão.
Coberto por `app/tools/roomTool.integration.test.ts` e
`core/commands/moveNode.test.ts`.

**3. Duplo clique nunca chegava às ferramentas.** `PointerEvent.detail` é sempre
0 em `pointerdown`; só o evento `dblclick` traz a contagem. Encontrado dirigindo
o aplicativo no navegador — nenhuma camada abaixo pegaria, porque a máquina de
estados recebe `clickCount` como parâmetro e sempre foi testada com o valor
certo. Coberto por dois testes em `e2e/edit.spec.ts`.

Além dos três, a verificação no navegador produziu a **ADR-0005**: a tolerância
de âncora de nó valia 1,8 px de tela no zoom de trabalho, o que tornava o clique
no canto compartilhado inalcançável com mouse. O critério "dois retângulos
adjacentes produzem 6 nós" passava porque o teste desenha por entrada numérica.

## Critérios fora do escopo do M2

A lista completa, com o milestone de destino de cada um, está em
`specs/plans/m2-editar.md` § Critérios de aceitação que este milestone não
satisfaz, e o resumo dos desvios em `specs/09-roadmap.md` § M2.
