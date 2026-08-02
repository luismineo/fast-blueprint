# M3 — Mobiliar: plano aprovado

Plano de implementação do M3 (`specs/09-roadmap.md`), aprovado antes de qualquer
código. Uma tarefa por commit, na ordem abaixo. Antes de cada commit:
`pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise`.

## Contexto

O M2 fechou a edição de geometria. O M3 é o milestone em que a planta deixa de ser
um desenho e vira uma resposta: "cabe uma cama queen com 60 cm de circulação dos
dois lados no Quarto L?" em menos de um minuto.

Estado na abertura: 386 testes, `core` a 91,22% de linhas, bundle 57,9 KB gzipped.

O que já existe e não precisa ser criado:

- `FurnitureItem` está no modelo e no schema Zod **desde o M1**, completo, e nunca
  foi tocado por nenhum comando.
- `HitResult` da spec 03 já prevê `{ kind: 'furniture' }`; a implementação em
  `core/hit/hitTest.ts` ainda não.
- `renderer/theme.ts` já tem `furnitureFill`, `furnitureStroke`, `furnitureLabel`,
  `clearance`, `collision` e `outsideRoom` — nenhum token novo é preciso.
- W3 e W4 já existem em `core/model/validation.ts`, com implementação simplificada
  que está errada nos dois casos (ver T3).

O que está vazio: `packages/catalog` (`export {}`), os passes 4, 5 e 7 da spec 04
(não entram nem na lista de `render.ts`), e qualquer comando de mobília.

## Riscos que a leitura sozinha não pegaria

**1. A contenção decide o resultado, e a fronteira é assimétrica.** Simulei o ray
casting da spec 02 (`raio para +X, aresta conta se (y[i] > py) !== (y[j] > py)`)
com a mesma cama queen encostada em duas paredes do retângulo 3200 × 2500:

```
canto sobre a parede de cima   (1000,0)      dentro
canto sobre a parede de baixo  (1000,2500)   FORA
canto sobre a parede esquerda  (0,1000)      dentro
canto sobre a parede direita   (3200,1000)   FORA

cama 1580×1980 encostada em cima    → 4 cantos dentro   → contida
cama 1580×1980 encostada embaixo    → 2 cantos dentro   → parcial
```

O snap a parede põe dois cantos **exatamente** sobre a aresta, por construção. Sem
tratamento, o aviso "móvel fora do cômodo" e a taxa de ocupação passariam a depender
de qual parede o usuário escolheu — e o app acusaria erro justamente na posição que
ele mesmo acabou de produzir. Vira decisão de spec (T1) antes de virar código.

**2. `toolActive: boolean` não comporta três ferramentas.** `App.svelte` roteia
entre Cômodo e Selecionar por um booleano, e `classifyKey` devolve
`activateRoomTool`/`activateSelectTool` como ações distintas. Com `F` isso vira
`ToolId`, e a barra de ferramentas precisa disso de qualquer forma.

**3. A ordem de `furniture` é significativa** — é o único array em que é
(spec 05 § Regras). `AddFurniture` empilha no fim, hit test varre do fim para o
começo, e nenhum comando reordena o array de passagem.

## Decisões que a spec não tomou

Aprovadas na conversa de planejamento:

1. **Barra de ferramentas completa entra no M3.** Cinco ícones, Parede e Medir
   desabilitados, roving tabindex, `Home`/`End`, `Ctrl/Cmd+B`.
2. **Fundo do móvel é a borda `−depth`.** Vale a spec 06: `depth` cresce da parede
   para dentro do cômodo. O parêntese "(borda no `+depth` local)" da spec 02 vira
   adendo.
3. **`rotation` é inteiro, 0–359.** O handle de rotação livre arredonda para grau.
   A linha "float, graus" da spec 05 vira adendo.
4. **`FurnitureItem` ganha `outline?: boolean`**, gravado na inserção a partir da
   categoria do catálogo. Campo opcional não sobe `schemaVersion`.

Tomadas por mim, por ausência de texto na spec (cada uma vira adendo em T1):

5. **Contenção usa fronteira inclusiva.** Ponto sobre a aresta conta como dentro,
   com a simulação acima escrita na spec como justificativa.
6. **Manipulação de móvel vive na Ferramenta Selecionar; a Ferramenta Mobília só
   insere.** A própria spec 03 escopa `Q`/`E` à seleção e não à ferramenta, e nomeia
   "mobília inserida, ferramenta voltou para Selecionar" como o estado mais comum.
   Duas implementações de arraste de móvel seriam duas chances de divergir.
7. **Depois de posicionar um item com `F`, a ferramenta volta para Selecionar**, com
   o item selecionado. É o que torna a decisão 6 suficiente. Inserir vários itens
   seguidos se faz arrastando do painel, que não passa por ferramenta nenhuma.
8. **Snap a parede é exclusivo em relação às três classes**, como a Classe 1 é
   exclusiva dentro do resolvedor. Se uma aresta dispara dentro dos 150 mm, ela
   decide centro **e** rotação, e o grid não participa — senão o grid puxaria o
   móvel para fora da parede em que ele acabou de encostar.
9. **Os 150 mm são medidos entre o retângulo do móvel e o segmento da aresta**
   (mínima entre os quatro cantos e o segmento), não a partir do centro. O critério
   fala em "móvel arrastado a 100 mm de uma parede"; medir do centro faria a
   distância depender do tamanho do móvel.
10. **`AddFurniture` recebe dimensões resolvidas, nunca um id de catálogo.** O
    comando vive em `core`, que não conhece `catalog`. `catalogId` fica no documento
    só como rastreabilidade — é isso que faz "editar a dimensão não altera o
    catálogo" ser verdade por construção, e não por cuidado de quem chama.
11. **Taxa de ocupação conta apenas móveis contidos**, e **itens de circulação não
    contam** nem para ocupação nem para W4. A spec 06 os chama de "itens sem massa
    física"; um gabarito de giro de cadeira de rodas não deixa o cômodo 40% ocupado.
12. **`locked` bloqueia mover e transformar no comando**, não só na ferramenta — o
    painel é outro caminho até o mesmo estado. Excluir continua permitido: é ação
    explícita e desfazível.
13. **Recentes é estado de sessão.** Só o catálogo do usuário vai para IndexedDB; a
    spec 06 não pede persistência dos recentes.
14. **A persistência do catálogo do usuário fica em `app/persistence`; `catalog` só
    faz merge e (de)serialização.** É onde a spec 08 põe IndexedDB, e mantém
    `catalog` testável em Node puro.
15. **`model/roomPalette.ts` vira `model/palette.ts`, com `DOCUMENT_COLORS`.** A
    mesma lista passa a servir cômodo e móvel; o nome atual descreveria metade do
    uso. A exceção de lint aponta para o arquivo novo.
16. **Hachura de colisão é gerada como segmentos recortados ao polígono de
    interseção**, não como padrão de preenchimento. `DrawTarget` não tem `clip` nem
    `pattern`, e acrescentá-los obrigaria o backend SVG do M4 a implementar os dois.
17. **`Ctrl/Cmd+D` duplica só móveis.** Não existe comando de duplicação de cômodo
    em `08`, e o único caso de uso descrito é mobília.

## Ordem das tarefas

De baixo para cima na direção de dependência (`core → catalog → renderer → app`),
com três escolhas deliberadas:

- **Geometria primeiro (T2).** Aviso de sobreposição, aviso de móvel fora, taxa de
  ocupação, snap a parede e hit test são todos consumidores da mesma OBB. Errar ali
  erra em cinco lugares.
- **Catálogo antes dos comandos (T4 antes de T5).** O payload de `AddFurniture` é um
  item de catálogo resolvido; ter o catálogo real no lugar impede que o comando
  nasça com um payload de mentira, que é a lição nº 1 do post-mortem do M1.
- **Renderer antes da ferramenta (T8 antes de T9).** No M1 a ferramenta existia e
  não tinha caminho de renderização, e o milestone passou em CI assim. Com o pass
  pronto, o primeiro teste de integração da ferramenta já assere o que aparece.

Os critérios são citados pela **posição atual** na lista "Critérios de aceitação" de
cada spec. A numeração do arquivo de cobertura do M2 antecede a inserção do critério
de expressão aritmética em `02`; onde divergir, vale a posição atual.

### T0 — Gravar o plano aprovado

`specs/plans/m3-mobiliar.md`. Commit próprio, antes de qualquer código.

### T1 — Adendos de spec

Commit separado, antes do código (`CLAUDE.md` § Specs são a fonte da verdade).

| Spec | Adendo |
|---|---|
| `01` | `FurnitureItem` ganha `outline?`. W3 passa a dizer explicitamente "total **ou parcialmente** fora". Fronteira conta como dentro, com a simulação como justificativa. Taxa de ocupação definida sobre móveis contidos e não-`outline` |
| `02` | § Geometria de mobília: contenção inclusiva. § Snap a parede: fundo = `−depth` (decisão 2), qual distância é medida (decisão 9), exclusividade em relação às três classes (decisão 8) |
| `03` | `SelectionRef` ganha `{ kind: 'furniture' }`. Máquina de estados da Ferramenta Mobília. Manipulação de móvel na Ferramenta Selecionar (decisões 6 e 7). `Ctrl/Cmd+D` deixa de ser marcado "M3" e passa a ativo, restrito a móvel |
| `04` | Passes 4 e 5 deixam de ser no-op; pass 7 `openings` entra na lista como no-op explícito. Item com `outline` desenha só contorno tracejado |
| `05` | § Regras: rotação inteira (decisão 3); `outline` opcional, sem bump de `schemaVersion` |
| `06` | Convenção de orientação reafirmada como dona da regra de `depth` |
| `07` | § Layout: "recolhível com `Tab`" está errado — a tabela de `03` é a dona da lista e dá `Ctrl/Cmd+B`. Variante "Móvel" e lista de avisos do painel |
| `09` | M3 registra o que ficou fora e para onde foi |

### T2 — `core/geometry`: OBB, SAT, contenção, interseção convexa

Arquivos: `packages/core/src/geometry/geometry.ts`, `geometry.test.ts`,
`obb.test.ts`.

`furnitureCorners`, `satOverlap` (4 eixos candidatos),
`containment(corners, polygon) → 'inside' | 'partial' | 'outside'` com fronteira
inclusiva, `convexIntersection` (Sutherland–Hodgman) para a região hachurada.

Satisfaz: **02-11** (SAT entre retângulos rotacionados 30° e 60° com centros a
400 mm).

### T3 — `core/model`: `outline`, paleta, W3 e W4 corretos

Arquivos: `model/types.ts`, `model/schemas.ts`, `model/validation.ts`,
`validation.test.ts`, `model/palette.ts`, `eslint.config.js`.

W3 hoje só acusa quando **todos** os cantos estão fora, e a spec diz "total ou
parcialmente". W4 hoje usa sobreposição de AABB, e a spec 02 manda SAT — dois
retângulos girados que não se tocam disparam aviso falso. Os dois passam a usar T2.
Mais `computeFurnitureArea` e `computeOccupancy` (spec 01 § Grandezas derivadas).

Satisfaz: base de W3/W4 e da taxa de ocupação do painel.

### T4 — `catalog`: catálogo default, schema, busca

Arquivos: `packages/catalog/data/default.json` (55 itens das tabelas da spec 06),
`src/schema.ts`, `src/catalog.ts`, `src/search.ts`, `src/index.ts`, testes,
`tsconfig.json` (o `rootDir: "src"` atual não alcança `data/`), `package.json`
(ganha `zod`, que já está no repositório).

Busca sem acento e sem caixa, ordenada por casamento no início do nome → em qualquer
posição do nome → em tag.

Satisfaz: **06-1** (valida contra Zod), **06-2** (nenhum id duplicado), **06-3**
(`width`/`depth` > 0), **06-7** ("geladeira" → dois itens), **06-8** (ignora
acento).

### T5 — `core/commands`: os cinco comandos de mobília

Arquivos: `commands/commands.ts`, `commands/furniture.test.ts`.

`AddFurniture`, `MoveFurniture`, `TransformFurniture`, `UpdateFurniture`,
`DeleteFurniture` (spec 08 § Comandos de milestones posteriores). Rejeições:
`width`/`depth` ≤ 0 (E8), coordenada ou rotação não inteira, rotação fora de 0–359,
item travado (decisão 12), id inexistente.

Satisfaz: **06-4** (item inserido produz `FurnitureItem` com `catalogId` preenchido),
**06-5** (editar dimensão não altera o catálogo), **08-3** (invertibilidade,
estendida em T15).

### T6 — `core/snap`: snap a parede

Arquivos: `snap/furnitureSnap.ts`, `snap/furnitureSnap.test.ts`.

Decisões 8 e 9. `Alt` desliga, como nas três classes.

Satisfaz: **03-14** (a 100 mm encosta e alinha rotação; a 200 mm, não), mantém
**02-10** (`Alt`).

### T7 — `core/hit` e `core/selection`: móvel

Arquivos: `hit/hitTest.ts`, `selection/selection.ts`, testes.

Móvel entra na prioridade 2 da spec 02, varrido do fim para o começo. Handle de
móvel selecionado entra na prioridade 1 — aqui sem o problema que o nó tinha no M2,
porque o corpo do móvel continua agarrável. `SelectionRef` ganha `furniture`;
`selectWithin` e `pruneSelection` acompanham.

### T8 — `renderer`: passes 4, 5 e 7

Arquivos: `passes/furnitureClearance.ts`, `passes/furniture.ts`,
`passes/openings.ts`, `render.ts`, testes.

Clearance em espaço de mundo (preenchimento translúcido, sem contorno). Móvel em
espaço de tela, como o pass `selection`: retângulo, rótulo de nome e dimensão quando
cabe, marca de orientação na face frontal, contorno tracejado quando fora do cômodo
ou quando `outline`, hachura na região de sobreposição. Buffers pré-alocados,
estilos memoizados por tema. `openings` entra como no-op explícito para a lista de
passes bater com a spec 04.

Satisfaz: **06-9** (circulação só com contorno tracejado), **10-6**
(`RecordingTarget` cobre todos os passes), mantém **04-8**.

### T9 — `app`: Ferramenta Mobília e manipulação na Selecionar

Arquivos: `tools/furnitureTool.ts`, `tools/selectTool.ts`, `tools/toolShortcuts.ts`,
`App.svelte`, testes.

`toolActive` vira `ToolId`. Inserir (clique no canvas com item escolhido, e arraste
do painel). Na Selecionar: arrastar move com snap a parede, handle de canto
redimensiona (`Shift` mantém proporção), handle de rotação gira (`Shift` trava em
15°), `Q`/`E`/`Shift+Q`/`Shift+E`, setas (10 mm, 100 mm com `Shift`), `Ctrl/Cmd+D`.

Satisfaz: spec 03 § Mobília inteira; mantém **03-17** (nenhuma ferramenta acessa o
documento fora de `ToolContext`).

### T10 — `app`: painel de catálogo

Arquivos: `components/CatalogPanel.svelte`, `components/catalogModel.ts`,
`messages.ts`, `App.svelte`.

Busca, categorias recolhíveis, recentes (8, sessão), miniatura gerada por proporção.
Toda derivação em `.ts`; o componente lê strings e caixas prontas.

Satisfaz: **06-7** e **06-8** na UI; spec 07 § Layout.

### T11 — `app`: painel de móvel, avisos e taxa de ocupação

Arquivos: `components/panelModel.ts`, `PropertiesPanel.svelte`, `messages.ts`.

Variante Móvel (nome, largura, profundidade, rotação, circulação, cor, travar,
salvar no catálogo, duplicar, excluir). Variante Cômodo ganha número de móveis e
taxa de ocupação. Variante vazia ganha número de móveis e lista de avisos ativos.

Satisfaz: spec 07 § Painel; **07-2** (campos aceitam `158+40`), **07-12** (nenhuma
chave órfã), **08-9**.

### T12 — `app` + `catalog`: catálogo do usuário

Arquivos: `catalog/src/userCatalog.ts`, `app/src/persistence/userCatalog.ts`, painel.

Merge com o default (id colidindo vence), export e import como JSON. Lógica pura em
`catalog`, adaptador de IndexedDB fino em `app/persistence` (decisão 14).

Satisfaz: **06-6** (item de usuário com id colidindo sobrescreve o default).

### T13 — `app`: barra de ferramentas e `Ctrl/Cmd+B`

Arquivos: `components/Toolbar.svelte`, `components/toolbarModel.ts`, `App.svelte`,
`messages.ts`, `tools/toolShortcuts.ts`.

Cinco ícones com Parede e Medir desabilitados, ARIA toolbar com roving tabindex,
`Home`/`End`, tooltip com nome e atalho. A regra D0 já está implementada em
`classifyKey` e ganha o caso do widget composto.

Satisfaz: **03-18** (`Home` na barra move o foco; fora dela enquadra), **07-1**
(painel recolhe com o atalho), **07-13** (`Home`/`End`).

### T14 — Regra de lint contra literal de texto em `.svelte`

Arquivos: `eslint-rules/no-literal-text.js`, `eslint.config.js`, teste que roda o
ESLint pela API sobre um trecho `.svelte`.

Regra local, sem dependência nova: a spec 07 diz "`eslint-plugin` a definir na
implementação", e o `eslint-plugin-svelte` que já está no repositório não tem regra
de bare string. Exceções da spec 07: glifo estrutural e saída de `core/format`.

Satisfaz: **07-11** (dívida que o roadmap parou no M3).

### T15 — Fixture, bench, property tests, integração e e2e

Arquivos: `core/testing/fixtures.ts`, `specs/fixtures/furnished.planta.json`,
`specs/fixtures/README.md`, `bench/render.bench.ts`,
`core/testing/properties.test.ts`, `core/testing/arbitraries.ts`,
`app/tools/furnitureTool.integration.test.ts`, `e2e/furniture.spec.ts`.

Property tests novos a 200 runs: SAT é simétrico e implica sobreposição de AABB;
contenção é invariante a translação do par cômodo+móvel; os cinco comandos novos
entram em `commandsFor` e caem no property de invertibilidade e no de E6. A
integração dirige inserir → arrastar → encostar → conferir aviso e ocupação **contra
o documento**. O e2e cobre o item 3 da spec 10 ("inserir móvel do catálogo aparece
no canvas").

Satisfaz: **04-6** (profiler < 8 ms com `apto-44m2` + 40 móveis, medido localmente —
a spec 10 diz que o número que vale é o local), **10-2** (property tests de colisão e
contenção), **10-6**.

### T16 — Cobertura e encerramento

`specs/plans/m3-mobiliar-cobertura.md`: cada critério de aceitação no escopo e o
teste que o cobre. Confere cobertura de `core` ≥ 90% e bundle < 300 KB gzipped.

Satisfaz: **10-7**, **08-11**.

## Critérios de aceitação que este milestone NÃO satisfaz

| Critério | Spec | Cai em |
|---|---|---|
| Redimensionar cômodo mantém aberturas ancoradas | 01-6 | M6 — não existe `Opening` |
| SVG e PNG com geometria coincidente | 04-7 | M4 |
| Round-trip, campo desconhecido, erro de nó órfão, autosave, handle em IndexedDB | 05, todos | M4 — persistência é o milestone seguinte |
| SVG abre no Inkscape com texto selecionável | 05 | M4 |
| Migração de `legacy/v0.planta.json` | 10-5 | M4 |
| Texto de interface a 4,5:1 | 07-5 | Manual — tokens usados, verificação não automatizada |
| Atalhos em teclado ABNT2 | 07-10 | Manual, pendente desde o M1 |
| Tabela de atalhos em Chrome e Firefox reais | 03-19 | Manual, pendente desde o M1 — e cresce neste milestone com `Q`, `E`, `Ctrl/Cmd+D` e as setas |
| Ferramenta Parede (`W`), `CreateWall`/`DeleteWall` | 03 § Parede, 08 | Ainda em aberto desde o M1. A barra de ferramentas os mostra desabilitados |
| Ferramenta Medir (`M`) | 03 § Medir | Nunca foi alocada a milestone nenhum pelo roadmap |
| Export CSV com tabela de móveis | 05 § Export | M4 |
| Fixture `invalid-orphan-node` | fixtures | M4 |

## Verificação

Antes de cada commit:

```
pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise
```

No encerramento, além disso:

```
pnpm test --coverage      # core ≥ 90% de linhas
pnpm build                # bundle < 300 KB gzipped
pnpm e2e                  # smoke + room + edit + furniture
vitest bench              # p50 e p95 por pass com a fixture furnished
```

Verificação manual no navegador, porque nos dois milestones anteriores ela encontrou
o que a suíte não encontrava:

1. Arrastar uma cama queen do painel para o Dormitório 01 e encostá-la em cada uma
   das quatro paredes — as quatro devem ficar contidas, sem aviso (risco nº 1).
2. Circulação de 600 mm dos dois lados da cama: a faixa aparece e responde à
   pergunta do roadmap.
3. Sobrepor dois móveis e conferir a hachura só na região comum.
4. `Q`/`E` com a Ferramenta Selecionar ativa, logo depois de inserir.
5. Redimensionar por handle de canto com e sem `Shift`.
6. `Tab` até a barra de ferramentas, `Home`, `End` — e conferir que `Home` com foco
   no canvas ainda enquadra.
7. Salvar um móvel editado no catálogo do usuário, recarregar a página e conferir
   que ele continua lá.
