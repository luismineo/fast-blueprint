# M1 — Post-mortem

O M1 foi entregue com 158 testes verdes e o aplicativo inutilizável: clicar no canvas não desenhava nada, e apertar `Enter` produzia uma única linha reta. Este documento registra por quê.

A versão anterior deste arquivo atribuía à spec 03 falhas que eram de implementação, e descrevia como implementados comportamentos que não existiam no código (segmento fantasma, `select-all` no campo de comprimento). Foi reescrito depois do reparo.

## O que realmente aconteceu

### 1. A suíte de testes não exercitava nenhum caminho de integração

Esta é a causa raiz de todas as outras. Um milestone inteiro passou em CI sem que uma única linha de código verificasse que a ferramenta, o store e o renderer funcionavam juntos.

- `roomTool.test.ts` testava a máquina de estados isolada e asseria `payload.nodes).toHaveLength(4)`. Passava com quatro ids **idênticos**, que o comando depois colapsava num polígono de área zero.
- Nenhum dos seis passes novos (`walls`, `roomFills`, `dimensions`, `roomLabels`, `snapGuides`, `toolOverlay`) tinha teste. O critério de aceitação de `10-testes.md` — "`RecordingTarget` cobre todos os passes de `04-renderizacao.md`" — estava em aberto.
- O E2E cobria só "o canvas está visível".

**Correção.** `roomTool.integration.test.ts` dirige a sequência de aceitação inteira até o `DocumentStore` e assere contra o **documento resultante**, nunca contra o payload: 4 nós distintos, área exatamente 8.000.000 mm², documento sem issue de nível `error`. `e2e/room.spec.ts` roda o mesmo fluxo no navegador contra o build de produção.

### 2. O traço em andamento não tinha caminho de renderização

`toolOverlay.ts` e `snapGuides.ts` eram funções de corpo vazio. `RenderContext` não tinha campo de overlay. `App.svelte` nunca passava o estado da ferramenta para `render`. `RoomToolResult` devolvia só escalares para o HUD, nenhuma geometria. E `RoomToolEvent` não tinha `pointerMove`, então a ferramenta nunca sabia onde estava o cursor.

Não era um fio solto: **a instalação inteira faltava**. Clicar não podia desenhar nada, por construção.

### 3. Ids de nó fixos colapsavam o cômodo numa linha

`roomTool.ts` usava os literais `'n_new'`, `'n_tmp'` e `'n_num'`; `generateNodeId()` existia em `core` e nunca era chamado. Um cômodo de quatro pontos emitia `loop: ['n_new','n_num','n_num','n_num']`, e `applyCreateRoom` resolvia os três `n_num` para o mesmo nó via `Array.find`. Resultado: polígono de área zero desenhado como uma linha — exatamente o sintoma relatado.

### 4. Texto e espessura no espaço de coordenadas errado

`dimensions` e `roomLabels` rodavam em espaço de mundo com fonte em pixels: no zoom inicial (~0,07 px/mm) uma fonte de 10 px virava 0,7 px de tela. `walls` passava `wallWidth` (2,5) como largura de mundo, ou seja 2,5 **milímetros** — cerca de 0,2 px. Os dois rótulos do cômodo eram separados por ±1 mm, então se sobrepunham em qualquer zoom real. E a normal da cota era `(-dy, dx)`, que aponta para **dentro** de um ciclo horário com Y para baixo.

Mesmo com um cômodo válido no documento, quase nada seria legível.

### 5. O HUD não podia receber nem devolver texto

O campo usava ligação de mão única sem `oninput`, e o handler global de teclado dava `preventDefault()` em todo dígito enquanto a ferramenta estava ativa. O campo nunca recebia texto e a ferramenta nunca lia dele. `hudX`/`hudY` só eram escritos em `pointerMove` sob `kind !== 'idle'`, condição falsa até o primeiro clique pousar — então o HUD aparecia no canto superior esquerdo.

### 6. Nomeação inline ausente

O passo `"Quarto" Enter` do critério de aceitação não existia. `createRoomResult` emitia `name: ''` e nada abria edição.

## O que a spec 03 realmente errou

Três ambiguidades reais, resolvidas na spec antes de codar.

**A direção da entrada numérica era inalcançável como especificada.** A spec dizia que a direção vem "após snap de eixo" e dava o exemplo "o mouse aponta para 87° e a direção é 90°". Mas a Classe 2 do resolvedor tem tolerância de 8 px de distância **perpendicular**, limitada a 40 mm: a 3 000 mm da origem isso são 0,76°, e um desvio de 3° são 157 mm. Passar 87° pelo resolvedor devolve 87°. A sequência `320/250/320` produziria um paralelogramo, não um retângulo de 8,00 m².

Corrigido: a direção vem de `snapAngle` (arredondamento angular), e a spec agora diz por que não é a Classe 2.

**`OverlayPrimitive` com cor em `core/`.** A spec ilustrava `{ kind: 'polyline'; points; color: HexColor }` e ao mesmo tempo colocava o tipo em `core/`, o que colide com o critério de aceitação da spec 04 ("nenhuma string hexadecimal fora de `renderer/theme.ts`") e inviabilizaria o tema escuro da v2. Corrigido para papel semântico.

**Limiar da terceira linha do HUD.** "A partir de 3 segmentos" no texto, `4 lados` no mockup. Corrigido para 3 **nós** confirmados, que é o que a máquina de estados conta.

Duas outras ambiguidades só apareceram ao verificar no navegador, e estão registradas na spec:

- O campo de comprimento mostra os dígitos digitados; o comprimento medido aparece como dica. Exibir o valor medido *dentro* do campo fazia os dígitos seguintes concatenarem nele (`132` + `250`).
- `c` fecha o polígono com o campo vazio e é sufixo de unidade (`320cm`) com o campo preenchido. Sem essa distinção, o `C` final da sequência documentada virava texto, porque depois de cada `Enter` o foco permanece no campo.

## O que a implementação errou, não a spec

A versão anterior deste documento culpava a spec por cinco pontos que eram decisões de implementação nunca tomadas:

| Alegação anterior | Realidade |
|---|---|
| "A implementação adotou select-all" | O código concatenava incondicionalmente. Nenhum `select-all` existia. |
| "O snap preview continua ativo durante a digitação" | Nenhum preview era desenhado em momento algum. |
| "Duplo clique é tratado como no-op" | Não havia tratamento de duplo clique: `clickCount` nem chegava à ferramenta. |
| "`Esc` remove o último dígito e depois o segmento" | Correto, mas contradizia a própria tabela de atalhos, que dá `Esc` como saída da armadilha de foco. |
| "`C` e clique no nó inicial são assimétricos por tolerância" | O clique no nó inicial era **código morto**: o resolvedor só via nós já commitados, então `merged` era sempre `null` durante o primeiro cômodo. |

## Lições

**Teste de unidade sobre payload não prova nada.** Asserir a forma do comando enquanto o defeito está em como o comando é *aplicado* dá confiança falsa. O teste tem que atravessar a fronteira e olhar o resultado.

**Um milestone com passes de render sem teste nenhum não está pronto.** Quatro dos oito defeitos eram do renderer, todos triviais de pegar com `RecordingTarget`, todos invisíveis para a suíte que existia.

**Rodar o aplicativo é parte da verificação, não um extra.** Duas ambiguidades reais só apareceram dirigindo o fluxo no navegador — nenhuma quantidade de leitura de spec as teria encontrado.

**`pnpm typecheck` e `pnpm lint` estavam vermelhos no commit do M1**, com 73 erros de lint e 8 de tipo, embora a definition of done do `CLAUDE.md` exija ambos limpos. Um gate que se pode ignorar não é um gate.

**Reparo silencioso esconde o bug.** `applyCreateRoom` aceitava um loop com ids repetidos e produzia um documento plausível de área zero. Agora rejeita, com código de erro, sem tocar no documento (`08-arquitetura.md` § Tratamento de erro).
