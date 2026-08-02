# M3 — Mobiliar: cobertura dos critérios de aceitação

Critério de encerramento do milestone: todo critério de aceitação que cai no
escopo do M3 passa como teste automatizado. Este arquivo lista cada um e o teste
que o cobre.

Estado da suíte no encerramento: **652 testes** e **19 e2e**, com `pnpm
typecheck`, `pnpm test`, `pnpm lint` e `pnpm depcruise` limpos. Cobertura de
linhas de `core`: **97,19%** (limite 90%; era 91,22% no M2). `catalog`: 100%.
Bundle de produção: **71,6 KB gzipped** (limite 300 KB).

Os critérios são numerados pela posição atual na seção "Critérios de aceitação"
da spec correspondente.

## 02 — Unidades e geometria

| # | Critério | Teste |
|---|---|---|
| 02-11 | SAT detecta sobreposição entre dois retângulos rotacionados 30° e 60° com centros a 400 mm | `core/geometry/obb.test.ts` → "detecta sobreposição entre retângulos rotacionados 30° e 60° com centros a 400 mm", mais simetria, contato exato e o caso das caixas envolventes |

## 03 — Ferramentas e interação

| # | Critério | Teste |
|---|---|---|
| 03-14 | Móvel arrastado a 100 mm de uma parede encosta e alinha rotação; a 200 mm, não | `core/snap/furnitureSnap.test.ts` → "a 100 mm da parede encosta e alinha a rotação", "a 200 mm da parede não encosta"; `app/tools/furniture.integration.test.ts` → "arrastar até perto da parede encosta e alinha a rotação"; `e2e/furniture.spec.ts` → quatro testes, um por parede |
| 03-15 (novo) | Posicionar um item com `F` devolve a ferramenta para Selecionar, com o item selecionado | `app/tools/furnitureTool.test.ts` → "clicar posiciona o móvel e devolve a ferramenta para ociosa"; `e2e/furniture.spec.ts` → "inserir um movel do catalogo aparece no canvas" (o painel de móvel só aparece com o item selecionado) |
| 03-16 (novo) | Móvel `locked` ignora arraste, handle e setas, e o comando é rejeitado sem tocar no documento | `core/commands/furniture.test.ts` → "rejeita móvel travado" (move e transform); `app/tools/furniture.integration.test.ts` → "móvel travado não se move ao arrastar", "móvel travado ignora rotação e seta, sem cancelar os outros" |
| 03-17 (novo) | `Ctrl/Cmd+D` duplica os móveis da seleção deslocados 200 mm, e não duplica cômodo | `app/tools/furniture.integration.test.ts` → "Ctrl+D duplica deslocado 200 mm, copiando os campos"; `app/tools/toolShortcuts.test.ts` → "Ctrl+D duplica", "sem mobília selecionada… não fazem nada" |
| 03-18 | Com foco na barra de ferramentas, `Home` move o foco para o primeiro botão e não aciona Enquadrar tudo | `app/components/toolbarModel.test.ts` → bloco "regra D0 com a barra de ferramentas"; `e2e/furniture.spec.ts` → "a barra de ferramentas troca de ferramenta e Home nao enquadra com foco nela" |
| 03-15 (M2) | `Alt` durante qualquer arraste desativa todos os snaps | `app/tools/furniture.integration.test.ts` → "Alt durante o arraste desliga o snap a parede" |

## 04 — Renderização

| # | Critério | Teste |
|---|---|---|
| 04-6 | Profiler abaixo de 8 ms com a fixture `apto-44m2` acrescida de 40 móveis | `bench/render.bench.ts`, medido localmente: **p999 de 0,45 ms**, média 0,16 ms. Ver a ressalva abaixo |
| 04-8 | Nenhuma string hexadecimal de cor fora de `theme.ts` e da paleta | `pnpm lint` (a regra pegou dois literais em teste durante o M3) |
| 04-10 (novo) | Móvel fora de cômodo desenha contorno tracejado, e item `outline` desenha tracejado sem preenchimento | `renderer/passes/furniture.test.ts` → "móvel fora do cômodo tem contorno tracejado", "gabarito de circulação é tracejado e sem preenchimento" |

**Ressalva em 04-6.** O bench mede o trabalho do renderer contra um `DrawTarget`
que grava primitivas, não contra um canvas real: ele responde "o renderer cabe
no orçamento", não "o frame inteiro cabe". A medição com canvas real depende de
carregar a fixture no aplicativo, e o caminho de abrir arquivo é do M4. O número
com folga de 18× dá confiança, mas o critério só fecha de vez lá.

## 06 — Catálogo de mobília

| # | Critério | Teste |
|---|---|---|
| 06-1 | Catálogo default carrega e valida contra o schema Zod | `catalog/catalog.test.ts` → "carrega e valida contra o schema Zod" |
| 06-2 | Nenhum `id` duplicado no catálogo default | `catalog/catalog.test.ts` → "não tem id duplicado" |
| 06-3 | Todo item tem `width > 0` e `depth > 0` | `catalog/catalog.test.ts` → "todo item tem width e depth maiores que zero" |
| 06-4 | Item de catálogo inserido no canvas produz `FurnitureItem` com `catalogId` preenchido | `core/commands/furniture.test.ts` → "insere o móvel com o catalogId preenchido"; `app/tools/furnitureTool.test.ts` → "clicar posiciona o móvel…" |
| 06-5 | Editar a dimensão do móvel inserido não altera o catálogo | `core/commands/furniture.test.ts` → "editar a dimensão não altera o catalogId nem o nome"; `app/tools/furniture.integration.test.ts` → "redimensionar não altera o catalogId nem o nome". Vale por construção: `AddFurniture` recebe dimensões resolvidas, e `core` não conhece `catalog` |
| 06-6 | Item de usuário com id colidindo sobrescreve o default | `catalog/catalog.test.ts` → "item de usuário com id colidindo sobrescreve o default"; `catalog/userCatalog.test.ts` → "item de usuário sob o id do default sobrescreve a medida" |
| 06-7 | Busca por "geladeira" retorna os dois itens de geladeira | `catalog/search.test.ts` → '"geladeira" devolve os dois itens de geladeira'; `app/components/catalogModel.test.ts` → "busca filtra e mantém o agrupamento" |
| 06-8 | Busca ignora acentos: "servico" e "serviço" dão o mesmo resultado | `catalog/search.test.ts` → "ignora acento nos dois sentidos"; `e2e/furniture.spec.ts` → "movel salvo no catalogo do usuario sobrevive a recarga" (busca "criado do vo" acha "Criado do vô") |
| 06-9 | Itens de categoria `circulacao` renderizam só com contorno tracejado | `renderer/passes/furniture.test.ts` → "gabarito de circulação é tracejado e sem preenchimento"; `catalog/catalog.test.ts` → "só a categoria circulacao é gabarito sem massa" |

## 07 — Interface

| # | Critério | Teste |
|---|---|---|
| 07-1 | Painel direito recolhe e expande com o atalho da tabela de `03` | `app/components/toolbarModel.test.ts` → "Ctrl+B recolhe o painel"; `e2e/furniture.spec.ts` → "Ctrl+B recolhe e devolve o painel direito" |
| 07-2 | Todo campo numérico aceita `158+40` e resolve para 198 | `core/format/expression.test.ts` (regra); os campos de móvel consomem `tryParseLength` |
| 07-11 | Lint falha se houver literal de texto visível ao usuário em componente `.svelte` | `app/lintRule.test.ts` → sete casos, rodando o ESLint de verdade com a configuração do repositório |
| 07-12 | Nenhuma chave órfã em `messages.ts`, nos dois sentidos | `app/messages.test.ts` → agora com a regra de tabela consultada por índice. Pegou `orphanNode` órfã durante o M3 |
| 07-13 | Com foco na barra, `Home`/`End` movem o foco; fora dela, `Home` enquadra | `app/components/toolbarModel.test.ts` → bloco "roving tabindex" e "regra D0 com a barra de ferramentas" |

## 08 — Arquitetura

| # | Critério | Teste |
|---|---|---|
| 08-3 | Property: aplicar comando e depois os patches inversos devolve o documento original | `core/testing/properties.test.ts` (200 runs, agora com os cinco comandos de mobília em `commandsFor`); mais um teste de invertibilidade por comando em `core/commands/furniture.test.ts` |
| 08-9 | Nenhum componente `.svelte` importa de `core/geometry` | Estrutural: `panelModel.ts`, `catalogModel.ts` e `toolbarModel.ts` concentram a derivação; `pnpm depcruise` |
| 08-11 | Bundle de produção abaixo de 300 KB gzipped | `pnpm build` → 71,6 KB |

## 10 — Estratégia de testes

| # | Critério | Teste |
|---|---|---|
| 10-1 | Suíte de `core` roda em menos de 5 s | `pnpm test` → 3,2 s no total |
| 10-2 | Property tests listados existem e passam com 200 runs | `core/testing/properties.test.ts` (14) + `app/tools/roomTool.property.test.ts` (3). Os de mobília — colisão e contenção — fecham aqui |
| 10-6 | `RecordingTarget` cobre todos os passes de `04-renderizacao.md` | `renderer/render.test.ts` → "a lista de passes bate com a da spec 04, na ordem"; `renderer/passes/furniture.test.ts` cobre os três passes novos |
| 10-7 | CI falha se a cobertura de `core` cair abaixo de 90% | `vitest.config.ts` → `thresholds`; medido em 97,19% |

## 01 — Modelo de domínio

Sem critério numerado no escopo, mas o milestone fecha três comportamentos que a
spec 01 descreve e nada verificava:

| Comportamento | Teste |
|---|---|
| W3 acusa móvel total **ou parcialmente** fora | `core/model/furnitureWarnings.test.ts` → "acusa móvel parcialmente fora" |
| W4 usa SAT, não caixa envolvente | `core/model/furnitureWarnings.test.ts` → "não acusa móveis em diagonal cujas caixas envolventes se cruzam" |
| Taxa de ocupação sobre móveis contidos, sem gabarito | `core/model/furnitureWarnings.test.ts` → bloco "área ocupada e taxa de ocupação"; `e2e/furniture.spec.ts` → "a taxa de ocupacao responde se a cama cabe no quarto" |

## Defeitos encontrados durante o M3

Cinco. Quatro deles só apareceram dirigindo o navegador, o que repete a lição do
M1 — e um apareceu antes de existir código, por simulação.

**1. A fronteira do polígono decidia a contenção, e é assimétrica.** Achado por
simulação do ray casting **antes de escrever qualquer código**, ainda no plano.
Com o retângulo `(0,0) (3200,2500)`, o ponto `(1000, 0)` cai dentro e
`(1000, 2500)` cai fora; como o snap põe dois cantos exatamente sobre a aresta,
a mesma cama encostada em cima ficaria contida e encostada embaixo dispararia
"fora do cômodo". Virou regra de spec (`01` § Invariantes) antes de virar código.
Coberto por `core/geometry/obb.test.ts` e por quatro testes e2e, um por parede.

**2. W2 acusava cômodos que só compartilham parede.** Dois vizinhos têm vértices
sobre a fronteira um do outro, e o ray casting responde ali de forma arbitrária:
a fixture `apto-44m2`, com sete cômodos, acusava sobreposição em série. O
defeito é do M1 e só apareceu porque a lista de avisos do painel chegou à tela
no M3. Coberto por `core/model/roomOverlap.test.ts`, incluindo o apartamento de
referência.

**3. A barra de ferramentas ficava por cima do canvas.** O canvas usava `100vw`,
então os 48 px da esquerda e os 264 px do painel eram área morta — o clique ali
nunca chegava ao canvas. Achado pelo e2e do M2, que clicava a 5 px da borda.

**4. Lista de avisos com chave repetida congelava o painel.** A lista usava o
próprio texto como chave de `{#each}`; excluir um cômodo deixa quatro nós órfãos
com a mensagem idêntica, e a chave duplicada quebrava a renderização inteira. O
sintoma era "o `Delete` parou de funcionar", três telas depois da causa. Coberto
por `app/components/furniturePanel.test.ts` → "avisos de texto idêntico têm
chaves distintas".

**5. Empurrar o móvel contra a parede não encostava.** A distância móvel-aresta
era medida canto a canto, e um móvel arrastado **por cima** da parede tem os
quatro cantos longe dela e mesmo assim a toca. Metade do móvel ficava para fora,
com aviso, no gesto que existe justamente para encostar. Achado dirigindo o
navegador; coberto por `core/snap/furnitureSnap.test.ts` → "arrastar por cima da
parede encosta, em vez de atravessar".

Além dos cinco, o padrão ARIA de toolbar rendeu uma correção: `disabled` tira o
botão da ordem de foco, e `End` não alcançava o último item. Passou a
`aria-disabled`, que é o que o padrão pede.

## Critérios fora do escopo do M3

| Critério | Spec | Cai em |
|---|---|---|
| Redimensionar cômodo mantém aberturas ancoradas | 01-6 | M6 — não existe `Opening` |
| SVG e PNG com geometria coincidente | 04-7 | M4 |
| Round-trip, campo desconhecido, erro de nó órfão, autosave, handle em IndexedDB | 05, todos | M4 |
| Migração de `legacy/v0.planta.json` | 10-5 | M4 |
| Exportar e importar o catálogo do usuário como JSON | 06 § Catálogo do usuário | M4 — depende de diálogo de arquivo, e a spec 06 não tem critério de aceitação para isso |
| Export CSV com tabela de móveis | 05 § Export | M4 |
| Texto de interface a 4,5:1 | 07-5 | Manual — os tokens são usados, a verificação não é automatizada |
| Atalhos em teclado ABNT2 | 07-10 | Manual, pendente desde o M1 |
| Tabela de atalhos em Chrome e Firefox reais | 03-19 | Manual, pendente desde o M1 — e cresceu com `Q`, `E`, `Ctrl/Cmd+D` e as setas |
| Ferramenta Parede (`W`), `CreateWall`/`DeleteWall` | 03 § Parede, 08 | Em aberto desde o M1. A barra mostra o botão desabilitado |
| Ferramenta Medir (`M`) | 03 § Medir | Nunca foi alocada a milestone nenhum pelo roadmap |
| Fixture `invalid-orphan-node` | fixtures | M4 |

## Dívida que o M3 deixa registrada

- **`app/src/persistence/userCatalog.ts` tem 0% de cobertura.** É o adaptador de
  IndexedDB, e não há IndexedDB em Node. A lógica que ele embrulha está em
  `@planta/catalog`, com 100%; o caminho completo é coberto pelo e2e "movel
  salvo no catalogo do usuario sobrevive a recarga".
- **A gravação do catálogo do usuário é disparada sem espera.** Recarregar
  imediatamente depois de salvar perde o item. É a mesma classe de problema que
  o autosave do M4 trata, e o e2e documenta o comportamento esperando o registro
  aparecer antes de recarregar.
- **`04-6` fecha só na parte do renderer** (ver a ressalva acima).
