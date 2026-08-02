# 03 — Ferramentas e interação

Esta é a spec central do produto. O diferencial do Planta está aqui, não nas features.

## Modelo mental

Uma ferramenta ativa por vez. Cada ferramenta é uma máquina de estados explícita que consome eventos de ponteiro e teclado e emite comandos de domínio. Nenhuma ferramenta muta o documento diretamente.

Ferramentas **retornam** comandos em `ToolTransition.commands`, nunca os executam. Isso as mantém testáveis como funções puras: dado `(state, event, context)`, produzem `(newState, commands)`. O dispatch é responsabilidade do scheduler em `app/`.

```ts
interface Tool<S> {
  id: ToolId
  initialState: S
  onPointerDown(s: S, e: PointerEvent, ctx: ToolContext): ToolTransition<S>
  onPointerMove(s: S, e: PointerEvent, ctx: ToolContext): ToolTransition<S>
  onPointerUp(s: S, e: PointerEvent, ctx: ToolContext): ToolTransition<S>
  onKey(s: S, e: KeyboardEvent, ctx: ToolContext): ToolTransition<S>
  overlay(s: S, ctx: ToolContext): OverlayPrimitive[]
}

interface ToolContext {
  doc: PlanDocument
  camera: Camera
  snap: (point: Point) => SnapResult
  hitTest: (point: Point) => HitResult
  config: ToolConfig
}

interface ToolTransition<S> {
  state: S
  commands: Command[]
  cursor?: CursorStyle
  historyBoundary?: 'commit' | 'abort'
}
```

`ToolContext` não inclui `dispatch`. Ferramentas retornam comandos, não os executam — isso garante que sejam funções puras e testáveis sem mock de store.

`HitResult` é o que `hitTest` devolve: a entidade de maior prioridade sob o ponto, pela ordem de `02-unidades-e-geometria.md` § Hit testing, ou `null` quando não há nenhuma.

```ts
type HitResult =
  | { kind: 'node'; nodeId: NodeId }
  | { kind: 'edge'; edge: EdgeRef }
  | { kind: 'roomInterior'; roomId: RoomId }
  | { kind: 'furniture'; furnitureId: FurnitureId }
  | { kind: 'furnitureCorner'; furnitureId: FurnitureId; corner: number }
  | { kind: 'furnitureRotation'; furnitureId: FurnitureId }
  | { kind: 'opening'; openingId: OpeningId }
  | null
```

`opening` existe no tipo desde já para que o hit testing não precise trocar de forma em M6; até lá nunca é produzido, porque o array correspondente está vazio.

Os dois variantes de handle são a prioridade 1 de `02-unidades-e-geometria.md` § Hit testing — "handle de seleção ativa". Só são produzidos para móvel **selecionado e destravado**, e por isso `hitTest` recebe a seleção no contexto. São variantes irmãos, e não um `handle` aninhado, porque quem consome liga um estado da máquina a cada um: canto abre `ResizingFurniture`, rotação abre `RotatingFurniture`.

`corner` é o índice do canto em `obbCorners` — os dois primeiros são a face traseira (`06-catalogo-de-mobilia.md` § Convenção de orientação). O handle de rotação fica a 24 px da face frontal.

`historyBoundary` sinaliza o fim de uma interação contínua (comandos `transient: true`) para o mecanismo de entrada pendente (`08-arquitetura.md` § Histórico). Ferramentas emitem `'commit'` no `onPointerUp` que finaliza um arraste e `'abort'` no `onKey` que trata o `Esc` de cancelamento. Ausente (`undefined`) em toda transição que não conclui nem cancela uma interação transiente — inclusive em toda transição de ferramentas sem interação contínua, como a Ferramenta Cômodo no M1.

`OverlayPrimitive` é definido em `core/` como geometria declarativa pura (sem dependência de canvas). O renderer as interpreta para pixels.

A primitiva carrega um **papel semântico**, nunca uma cor. Cor é decisão de apresentação e vive exclusivamente em `renderer/theme.ts` (`04-renderizacao.md` § Tokens visuais); uma primitiva que carregasse `HexColor` colocaria cor em `core/` e violaria o critério de aceitação "nenhuma string hexadecimal de cor existe fora de `renderer/theme.ts`". O renderer mapeia papel → token do tema, o que também faz o tema escuro (v2) funcionar sem tocar em ferramenta alguma.

```ts
type OverlayPrimitive =
  | { kind: 'polyline'; points: Point[]; role: OverlayRole; closed: boolean }
  | { kind: 'segment'; a: Point; b: Point; role: OverlayRole }
  | { kind: 'marker'; at: Point; role: OverlayRole }
  | { kind: 'label'; at: Point; text: string; role: OverlayRole }
```

**Esta seção é a dona da lista de papéis.** Nenhuma outra spec declara papel de overlay.

| Papel | Usado para | Pass |
|---|---|---|
| `draft` | Polilinha já confirmada do traço em andamento | 11 |
| `ghost` | Segmento candidato, do último nó ao cursor | 11 |
| `closeTarget` | Nó inicial quando o cursor está sobre ele e fechar é possível | 11 |
| `marquee` | Retângulo de seleção por arraste | 11 |
| `measure` | Traço e extremidades da Ferramenta Medir (§ Medir) | 11 |
| `measureLabel` | Distância e projeções em X e Y da Ferramenta Medir | 11 |
| `snapNode` | Marcador sobre o alvo de snap de nó | 10 |
| `midpoint` | Losango sobre o ponto médio de aresta | 10 |
| `axisGuide` | Guia de eixo | 10 |
| `alignmentGuide` | Guia de alinhamento com nó existente | 10 |
| `edgeHighlight` | Aresta que participou de projeção ou extensão | 10 |

A divisão entre os passes 10 e 11 (`04-renderizacao.md` § Passes) é por papel, não por ferramenta: guia de snap é do 10, traço de ferramenta é do 11.

`overlay` devolve o que a ferramenta quer desenhar sobre a cena (traço em andamento, guias, HUD). Ferramentas não têm acesso ao canvas.

## Atalhos

Esta é a única tabela de atalhos do projeto. specs/07 e demais specs referenciam atalhos daqui; nenhuma outra spec declara tecla. Adicionar atalho sem passar por esta tabela é erro de processo.

Atalhos são especificados por `KeyboardEvent.key`, não por posição física (`code`). O critério de aceitação inclui verificação em teclado ABNT2.

### Regra de precedência: elemento com foco vence atalho (D0)

Enquanto o foco está em um campo de entrada **ou em um widget que gerencia a própria navegação por teclado** (barra de ferramentas com roving tabindex, e qualquer outro composto do mesmo tipo que vier a existir — listbox, menu, árvore), **nenhum atalho global dispara.** As únicas exceções são `Esc` e combinações com `Ctrl/Cmd`. O elemento focado consome a tecla; o atalho não é avaliado.

Isso cobre o caso de campo de texto e o caso de widget composto pela mesma regra, sem tratamento especial: um widget composto **é** o elemento com foco enquanto gerencia sua própria navegação, exatamente como um campo de texto é o elemento com foco enquanto recebe caracteres.

Campos que disparam esta regra: campo de comprimento e de ângulo do HUD, edição inline de nome de cômodo, todo campo do painel de propriedades, busca do catálogo.

Widgets compostos que disparam esta regra hoje:

| Widget | Padrão | Teclas que ele reivindica enquanto tem foco |
|---|---|---|
| Barra de ferramentas (5 ícones, `07-ui-e-layout.md` § Layout) | ARIA toolbar, roving tabindex | `ArrowUp`/`ArrowDown` (navegação), `Home`/`End` (primeiro/último botão) |

Nenhum outro widget composto existe no M1. O catálogo (busca + lista de categorias) usa campo de texto padrão e botões simples sem roving tabindex — não se qualifica; cada botão segue a travessia de foco padrão (`Tab`/`Shift+Tab`).

**Por que isso importa para `Home`:** a barra de ferramentas implementa o padrão ARIA de toolbar completo, `Home`/`End` inclusos — não há razão para economizar nisso; o piso de acessibilidade do projeto já é baixo por decisão (canvas sem leitor de tela na v1) e não deve ser reduzido ainda mais só para acomodar um atalho de câmera. Com foco na barra de ferramentas, `Home` move o foco para o primeiro botão. Com foco no canvas ou em qualquer lugar fora de campo/widget composto, `Home` enquadra tudo (§ Câmera). D0 resolve os dois sem conflito porque é a regra de precedência, não a tecla, que decide.

### Restrição permanente sobre dígitos

Dígitos (`0`–`9`) sem modificador são **reservados para entrada numérica** em todo contexto, permanentemente. Nenhum atalho global usa dígito sozinho, nem agora nem em milestones futuros.

**Para qual campo o dígito vai.** Se o foco já está num campo do HUD, o dígito vai para **esse** campo. Fora do HUD, vai para o campo de comprimento, que também recebe o foco — é a regra "digitar um dígito em estado Anchored foca o campo de comprimento sem clique". Rotear todo dígito para comprimento independentemente do foco tornaria a entrada de ângulo inalcançável, já que o único caminho até o campo de ângulo é `Tab`.

`Ctrl/Cmd+d` continua sem conflito: dígito sozinho é reservado, combinação com modificador não é dígito sozinho.

### Tabela unificada

| Tecla (`key`) | Contexto | Ação | Spec |
|---|---|---|---|
| `v` | Global | Ferramenta Selecionar | 03 § Selecionar |
| `r` | Global, incondicional | Ferramenta Cômodo | 03 § Cômodo |
| `w` | Global | Ferramenta Parede | 03 § Parede |
| `f` | Global | Ferramenta Mobília | 03 § Mobília |
| `m` | Global | Ferramenta Medir | 03 § Medir |
| `q` | Seleção contém mobília (qualquer ferramenta) | Rotaciona 90° anti-horário | 03 § Mobília |
| `e` | Seleção contém mobília (qualquer ferramenta) | Rotaciona 90° horário | 03 § Mobília |
| `Shift+q` | Seleção contém mobília | Rotaciona 15° anti-horário | 03 § Mobília |
| `Shift+e` | Seleção contém mobília | Rotaciona 15° horário | 03 § Mobília |
| ` ` (Espaço, segurar) | Global | Pan temporário | 03 |
| `Ctrl/Cmd+z` | Global | Desfazer | 08 § Histórico |
| `Ctrl/Cmd+Shift+z` | Global | Refazer | 08 § Histórico |
| `Ctrl/Cmd+s` | Global | Salvar | 05 § Persistência |
| `Ctrl/Cmd+o` | Global | Abrir | 05 § Persistência |
| `Ctrl/Cmd+a` | Global (fora de campo de texto) | Seleciona tudo | 03 § Selecionar |
| `Ctrl/Cmd+d` | Global (seleção contém mobília) | Duplica os móveis da seleção, deslocados 200 mm | 03 § Mobília |
| `Home` | Global (regra D0: fora de campo/widget composto) | Enquadrar tudo | 03 § Câmera |
| `Ctrl/Cmd+b` | Global | Recolher/expandir painel direito | 07 § Layout |
| `Backspace` | Ferramenta Cômodo ou Parede em Drawing, campo de comprimento vazio | Remove último segmento | 03 § Cômodo/Cancelar |
| `Backspace` | Qualquer outro estado com seleção | Excluir seleção | 03 § Selecionar |
| `Backspace` | Foco em campo de texto | Apaga caractere (regra de precedência D0) | — |
| `Delete` | Com seleção, fora de campo de texto | Excluir seleção | 03 § Selecionar |
| `Delete` | Foco em campo de texto | Apaga caractere (regra de precedência D0) | — |
| `Escape` | Ferramenta Cômodo ou Parede em Anchored ou Drawing | Remove último segmento; em Anchored volta para Idle | 03 § Cômodo/Cancelar |
| `Escape` | Ferramenta Medir em Dragging ou Done | Limpa a medição e volta para Idle | 03 § Medir |
| `Escape` | Qualquer ferramenta, com seleção | Limpa seleção | 03 |
| `Escape` | Ociosa, sem seleção | Volta para Ferramenta Selecionar | 03 |
| `Escape` | HUD com armadilha de foco ativa | Sai da armadilha de foco | 03 § Cômodo/HUD |
| `c` | Ferramenta Cômodo em Drawing | Fecha polígono ligando último nó ao inicial | 03 § Cômodo/Fechar |
| `Enter` | Ferramenta Cômodo ou Parede em Anchored/Drawing, campo de comprimento preenchido | Confirma segmento | 03 § Cômodo |
| `Enter` | Ferramenta Cômodo em Drawing, campo vazio | Fecha polígono | 03 § Cômodo/Fechar |
| `Enter` | Ferramenta Parede em Drawing, campo vazio | Termina a polilinha | 03 § Parede |
| `Enter` | Campo numérico do painel de propriedades | Aplica valor | 07 § Painel |
| `Tab` | Ferramenta Cômodo ou Parede em Anchored ou Drawing | Circula entre campos do HUD (armadilha de foco; não escapa do HUD) | 03 § Cômodo/HUD |
| `Tab` | Fora do HUD | Travessia de foco padrão (a11y) | 07 § Acessibilidade |
| `g` | Global | Alternar grid | 04 § Grid |
| `l` | Global | Alternar cotas | 04 § Cotas |
| `?` | Global | Painel de atalhos | 07 |
| `ArrowUp/ArrowDown/ArrowLeft/ArrowRight` | Mobília selecionada | Move 10 mm; com `Shift`, 100 mm | 03 § Mobília |
| `Scroll` | Canvas | Zoom ancorado no cursor | 04 § Câmera |
| Botão do meio (arrastar) | Canvas | Pan | 04 § Câmera |

### Interceptação pelo navegador

`Ctrl/Cmd+0`, `Ctrl/Cmd++` e `Ctrl/Cmd+-` (zoom do navegador) são confirmados como não-canceláveis via `preventDefault` em Chrome e Firefox — é por isso que "enquadrar tudo" saiu dessa família e foi para `Home` (§ Câmera).

Para `Ctrl/Cmd+z`, `Shift+z`, `s`, `o`, `d`, `a`, `b`: eliminação documental feita por consulta a fonte primária (mensagem de um engenheiro do Chromium na lista `public-webapps` do W3C, enumerando as combinações que o Chrome deixa de despachar para JS — `Ctrl+N`, `Ctrl+W`, `Ctrl+T`, `Ctrl+PageUp/PageDown`, `Ctrl+Tab`, `Ctrl+Shift+Tab` no Windows; `Cmd+N`, `Cmd+W`, `Cmd+Q`, `Cmd+T` mais os mesmos de paginação/tab no Mac). Nenhuma das teclas da tabela unificada consta nessa lista. Isso elimina a hipótese de que alguma delas tenha o mesmo problema do `Ctrl/Cmd+0`, mas **não substitui** o teste manual em um Chrome e um Firefox reais — ver critério de aceitação, marcado como pendente.

### Modificadores

| Tecla | Contexto | Efeito |
|---|---|---|
| `Shift` (segurar) | Qualquer arraste com snap ativo | Inclui múltiplos de 45° nos eixos do snap | 02 § Snap |
| `Shift` (segurar) | Arraste de handle de rotação de mobília | Trava em múltiplos de 15° | 03 § Mobília |
| `Shift` (segurar) | Arraste de handle de canto de mobília | Mantém proporção | 03 § Mobília |
| `Shift` (segurar) | Setas com mobília selecionada | Move 100 mm em vez de 10 mm | 03 § Mobília |
| `Alt` (segurar) | Qualquer arraste | Desliga todos os snaps | 02 § Snap |
| `Ctrl/Cmd` (segurar) | Clique | Adiciona/remove da seleção | 03 § Selecionar |

## Ferramenta Cômodo (`R`)

A ferramenta principal. Desenha um polígono fechado inserindo um segmento por vez.

### Estados

```
Idle → Anchored → Drawing → (Closed | Cancelled)
```

**Idle.** Nenhum traço em andamento. Cursor em cruz. Preview do ponto de snap sob o cursor.

**Anchored.** Um clique definiu o ponto de origem. A partir daqui todo movimento de mouse define uma direção, e o HUD mostra comprimento e ângulo do segmento candidato.

**Drawing.** Um ou mais segmentos confirmados. Idêntico a Anchored, mais a polilinha já construída e o valor acumulado de área provisória (assumindo fechamento imediato).

### Confirmar um segmento

Três caminhos, todos equivalentes em resultado:

1. **Clique.** Confirma no ponto resolvido pelo snap.
2. **Digitar número + `Enter`.** Confirma na direção atual do mouse, com o comprimento digitado. Esse é o caminho principal.
3. **`Tab` para alternar entre os campos comprimento e ângulo**, digitar ambos, `Enter`.

Digitar qualquer dígito em estado Anchored ou Drawing foca automaticamente o campo de comprimento do HUD. Não existe passo de "clicar no campo".

A direção usada com entrada numérica é a direção **após snap de eixo**. Se o mouse aponta para 87°, a direção é 90°. Isso é o que permite desenhar um retângulo perfeito digitando quatro números.

**Como essa direção é obtida.** Por arredondamento angular — `snapAngle(ângulo do cursor, shift)`, o múltiplo de 90° mais próximo (45° com `Shift`) — e **não** pela Classe 2 do resolvedor de snap (`adr/0003-modelo-de-snap.md`).

A distinção não é pedantismo, é o que faz o exemplo acima funcionar. A tolerância da Classe 2 é de 8 px de distância **perpendicular**, limitada a [2, 40] mm. Com o cursor a 3 000 mm da origem, 40 mm perpendiculares são 0,76°; um desvio de 3° são 157 mm, muito fora da tolerância. Ou seja: passar 87° pelo resolvedor de snap devolve 87°, não 90°. A Classe 2 governa a **posição** do ponto ao clicar; a direção da entrada numérica é governada pelo arredondamento angular, que não tem tolerância de distância.

A direção **congela** no primeiro dígito e o segmento fantasma salta para o eixo. O salto é o retorno visual de que a direção travou — o mouse pode continuar se movendo sem afetar o segmento.

**Reuso de nó (merged).** Se o `SnapResult` do ponto confirmado tem `merged` preenchido, o segmento é ancorado no nó existente em vez de criar um novo. Isso é o que permite desenhar cômodos adjacentes compartilhando aresta: o snap a nó dispara sobre o vértice do cômodo vizinho, o nó é reusado, e ao mover esse vértice ambos os cômodos se ajustam (ver invariante E6 em `01-modelo-de-dominio.md` e ADR-0002).

### Fechar o polígono

| Gatilho | Comportamento |
|---|---|
| Clique no nó inicial | Fecha, reusando o nó |
| `C` | Fecha ligando o último nó ao inicial |
| `Enter` com campo vazio | Fecha |
| Duplo clique | Confirma o segmento e fecha |

Ao fechar, emite `CreateRoom`. O nome default é `Cômodo N`, onde N é o menor inteiro positivo tal que "Cômodo N" não está em uso no documento atual. Exemplo: se existem Cômodo 1 e Cômodo 3, o próximo é Cômodo 2. Determinístico e sem dependência de histórico de sessão. O campo de nome entra em modo de edição inline sobre o centroide, já selecionado, para o usuário digitar "Quarto" e dar Enter.

Fechamento com menos de 3 nós é ignorado.

### Cancelar

`Esc` uma vez desfaz o último segmento. `Esc` em Anchored volta para Idle. Botão direito equivale a `Esc`.

`Backspace` durante o desenho também remove o último segmento (com campo de comprimento vazio).

**Com o campo de comprimento preenchido**, as duas teclas se separam:

| Tecla | Campo preenchido | Campo vazio |
|---|---|---|
| `Backspace` | Apaga um caractere (comportamento padrão de campo) | Remove o último segmento |
| `Esc` | Limpa o campo inteiro numa pressão e devolve o foco ao canvas, saindo da armadilha de foco | Remove o último segmento |

`Esc` é cancelamento, não edição: limpar tudo de uma vez é o que se espera de cancelar, e é coerente com o papel de `Esc` como saída documentada da armadilha de foco (§ HUD de desenho). Apagar caractere a caractere é trabalho de `Backspace`.

**O campo é esvaziado a cada segmento confirmado.** Não sobra valor de um segmento para o próximo, então não existe a questão de o primeiro dígito substituir ou concatenar: quando um segmento novo começa o campo está sempre vazio, e todo dígito concatena.

**`c` com o foco no campo de comprimento.** `c` fecha o polígono quando o campo está **vazio**, e é caractere comum quando está preenchido — ali ele é o início de um sufixo de unidade (`320cm`).

A distinção é necessária para a própria sequência de referência `320 Enter, 250 Enter, 320 Enter, C`: depois de cada `Enter` o foco permanece no campo, então pela regra D0 pura o `C` final viraria texto e o polígono nunca fecharia. Como o campo está garantidamente vazio após uma confirmação (regra acima), `c` nesse estado não é ambíguo.

Dígitos seguem a reserva permanente: são sempre roteados para a entrada numérica, mesmo com o campo focado. O estado da ferramenta é a fonte da verdade do valor; deixar o browser inserir o caractere faria a ordem dos dígitos depender da posição do cursor dentro do campo.

### HUD de desenho

Ancorado ao cursor, deslocado 16 px à direita e abaixo. Contém:

```
┌─────────────────────┐
│  320 cm      90,0°  │
│  ─────────          │
│  4 lados · 6,80 m²  │
└─────────────────────┘
```

O campo de comprimento é editável e recebe foco automático ao digitar.

**Campo de ângulo (M2).** Aceita entrada numérica em graus, `0`–`359`, com referência no eixo X positivo e sentido crescente para baixo — a mesma convenção de `Y` do resto do domínio (`01-modelo-de-dominio.md` § Node). Alcançado por `Tab` a partir do campo de comprimento; com o foco nele, dígitos vão para ele (§ Restrição permanente sobre dígitos).

O valor **congela a direção no `oninput`**, não no `Enter`: o segmento fantasma salta para o ângulo digitado assim que o texto muda, exatamente como já salta para o eixo no primeiro dígito de comprimento. O salto é o retorno visual de que a direção travou.

Isso mantém a tabela de gatilhos intacta — o ângulo é um override da direção, não um gatilho de confirmação. `Enter` continua fazendo o que a tabela diz: confirma o segmento se o campo de **comprimento** está preenchido, fecha o polígono se está vazio. As regras que hoje dependem de "campo vazio" (`c` fecha, `Backspace` remove segmento) continuam olhando o campo de comprimento, independentemente de qual campo do HUD tem o foco.

Valor fora de `0`–`359` é normalizado por módulo. Texto que não resolve para número mantém o campo como está e não altera a direção.

Vazio significa "sem override": a direção volta a vir do arredondamento angular sobre a posição do cursor.

A terceira linha aparece a partir de **3 nós confirmados** e mostra a área caso o polígono fechasse agora. A contagem é de nós, não de segmentos, porque nó é o que a máquina de estados acumula; 3 nós são 2 segmentos confirmados mais o fechamento implícito, o menor polígono com área. O mockup acima mostra `4 lados` porque ilustra um retângulo em andamento, não o limiar de exibição.

**Armadilha de foco.** Enquanto a Ferramenta Cômodo está em Anchored ou Drawing, o HUD é uma armadilha de foco: `Tab` circula apenas entre os campos do HUD e não escapa. `Esc` é a saída documentada (remove o último segmento e sai da armadilha). Isso é compatível com o piso de acessibilidade de `07-ui-e-layout.md`: armadilha de foco em interação modal é o padrão esperado (WCAG 2.1.2), desde que haja saída documentada por teclado. Fora dos estados Anchored/Drawing, `Tab` segue a travessia de foco padrão.

### Exemplo: reproduzir um quarto de 3,20 × 2,50

```
R                 → ferramenta cômodo
clique            → ancora
→ (mouse à direita) 320 Enter
→ (mouse para baixo) 250 Enter
→ (mouse à esquerda) 320 Enter
C                 → fecha
"Quarto" Enter    → nomeia
```

Onze interações, sem tocar em nenhum menu. Esse fluxo é o critério de aceitação mais importante do projeto.

## Ferramenta Parede (`W`)

Idêntica à ferramenta Cômodo, sem fechamento. Cria segmentos avulsos para divisórias, bancadas, guarda-corpos e meia-parede — geometria que delimita sem cercar.

### Estados

Os mesmos três da Ferramenta Cômodo: `Idle → Anchored → Drawing`. Mesmo HUD, mesmos campos de comprimento e ângulo, mesma armadilha de foco, mesmo resolvedor de snap. A única diferença é que não existe fechamento: não há `C`, não há alvo de fechamento no nó inicial, e `Enter` com campo vazio **termina** a polilinha em vez de fechá-la.

Terminar volta para `Idle` sem trocar de ferramenta — desenhar três bancadas seguidas não exige apertar `W` três vezes. Isso é diferente da Ferramenta Mobília, que devolve para Selecionar depois de posicionar, porque lá o passo seguinte quase sempre é ajustar o que acabou de entrar, e aqui quase sempre é desenhar o próximo trecho.

### Um comando por polilinha

A ferramenta acumula o rascunho e emite **um** `CreateWall` (`08-arquitetura.md`) no término, com todos os nós e todos os segmentos. Uma polilinha de quatro trechos é uma entrada de histórico, não quatro.

É o mesmo desenho da Ferramenta Cômodo, e pelo mesmo motivo: `Backspace` já remove segmento durante o traço, então quem errou o terceiro trecho corrige antes de terminar; depois de terminado, o que o usuário quer desfazer é "aquela bancada que acabei de desenhar", inteira.

Terminar sem nenhum segmento confirmado — `Esc` logo depois de ancorar — não emite comando nenhum e não empilha histórico.

### Nós são compartilhados como em qualquer outro lugar

A extremidade que cai sobre um nó existente reusa o nó, pela âncora de Classe 1 do snap. É assim que a bancada encosta na parede do cômodo e passa a acompanhá-la quando o cômodo é editado. Não há tratamento especial: parede avulsa e aresta de cômodo referenciam os mesmos `Node`.

Consequências que já estão escritas em outras specs e valem repetir aqui porque é esta ferramenta que as torna alcançáveis:

- Parede avulsa entra no hit testing na mesma prioridade da aresta de cômodo (`02-unidades-e-geometria.md` § Hit testing)
- Parede avulsa é alvo de snap: nó nas pontas, ponto médio, projeção e extensão (`02-unidades-e-geometria.md` § Snap)
- Móvel encosta em parede avulsa como encosta em parede de cômodo (`02-unidades-e-geometria.md` § Snap a parede) — a divisória do closet passa a ser encostável
- Parede avulsa tem cota do próprio comprimento (`04-renderizacao.md` § Cotas)

### Selecionar, medir e excluir

Parede avulsa é selecionada como aresta: `SelectionRef` de `kind: 'edge'` com `EdgeRef` de `kind: 'wall'` (§ Modelo de seleção). Nenhum variante novo.

O painel de propriedades de aresta serve sem mudança, e `SetEdgeLength` já define o nó final de uma parede como `b` (`08-arquitetura.md`) — duplo clique na bancada e digitar 2400 funciona pelo caminho que já existe.

**`Delete` com parede avulsa selecionada exclui a parede.** Isso amplia a regra do M2, que dizia que `Delete` sobre aresta não altera o documento. A regra do M2 continua correta onde ela se aplica: aresta de cômodo não é excluível isoladamente, porque um cômodo com um lado a menos não é um polígono fechado — não existe `DeleteEdge` e não deve existir. Parede avulsa é o caso oposto: ela **é** a entidade inteira, e não ter como excluí-la deixaria o usuário sem saída depois de um traço errado já confirmado.

Nós que ficam órfãos depois de excluir permanecem no documento e saem no GC ao salvar, como em `DeleteRoom` (W5, `01-modelo-de-dominio.md` § Invariantes).

### O que a Ferramenta Parede não faz

Não fecha polígono — quem quer área usa `R`. Não tem espessura (ADR-0002). Não vira cômodo automaticamente quando o traço volta ao início: um retângulo desenhado com `W` são quatro paredes avulsas e nenhuma área, e isso é a resposta certa, porque adivinhar intenção aqui produziria cômodo onde o usuário quis guarda-corpo.

## Ferramenta Selecionar (`V`)

### Modelo de seleção

```ts
type SelectionRef =
  | { kind: 'room'; roomId: RoomId }
  | { kind: 'node'; nodeId: NodeId }
  | { kind: 'edge'; edge: EdgeRef }
  | { kind: 'furniture'; furnitureId: FurnitureId }

type Selection = readonly SelectionRef[]
```

Vive em `core/selection`, não em `app/`: `renderer` precisa dela para o pass 12
(`04-renderizacao.md`) e `app` para o painel de propriedades, e a direção de dependência
de `08-arquitetura.md` só admite `core` como lugar comum. Não é documento e não entra no
histórico — vive em runes Svelte, como a câmera e a ferramenta ativa.

Aresta é referenciada por `EdgeRef` (`01-modelo-de-dominio.md`), não por par de nós:
`EdgeRef` é a referência que o resto do domínio já usa, e um par de nós seria ambíguo
quando dois cômodos compartilham a mesma aresta.

`furniture` está na união porque a seleção de móvel não é diferente de nenhuma outra:
o painel de propriedades lê dela, o pass 12 desenha handles a partir dela, e `Q`, `E`,
`Ctrl/Cmd+D` e as setas são escopados a ela (§ Mobília).

Depois de um undo a seleção é podada por **melhor esforço**: refs cujos ids ainda existem
permanecem, as demais saem (`08-arquitetura.md` § Histórico).

### Seleção

| Ação | Resultado |
|---|---|
| Clique | Seleciona o alvo de maior prioridade (ver hit testing em `02`) |
| Clique em área vazia | Limpa a seleção |
| `Ctrl/Cmd` + clique | Adiciona/remove da seleção |
| Arrastar em área vazia | Retângulo de seleção; envolve completamente para selecionar |
| Duplo clique no interior de um cômodo | Entra em edição de nome |
| Duplo clique numa aresta | Abre campo de comprimento da aresta |
| `Ctrl/Cmd + A` | Seleciona tudo |
| `Delete` / `Backspace` | Exclui os **cômodos**, os **móveis** e as **paredes avulsas** da seleção |

**`Delete` exclui cômodo, móvel e parede avulsa; não exclui nó nem aresta de cômodo.**
A lista de comandos de `08-arquitetura.md` não tem `DeleteNode` nem `DeleteEdge`, e não é
a tecla que decide que eles deveriam existir: apagar um nó de um ciclo fechado ou deixa o
cômodo com menos de 3 nós (E3) ou muda a forma dele de um jeito que arrastar já resolve
melhor. Nó e aresta de cômodo selecionados ignoram a tecla. Móvel tem `DeleteFurniture` e
é excluído — inclusive quando `locked`, que bloqueia mover e transformar mas não uma ação
explícita e desfazível (§ Mobília).

Parede avulsa entrou nessa lista no M3.5, junto da ferramenta que a cria (§ Parede). A
distinção não é entre "aresta" e "não aresta", e sim entre **parte de uma entidade** e
**a entidade inteira**: aresta de cômodo é um lado de um polígono que precisa continuar
fechado, parede avulsa é o objeto completo. `DeleteWall` existe; `DeleteEdge` continua não
existindo.

### Máquina de estados

```
Idle → (Marquee | DraggingNode | DraggingEdge | DraggingRoom
              | DraggingFurniture | ResizingFurniture | RotatingFurniture) → Idle
```

**Idle.** Sem interação em curso. Hover atualiza `hover` a cada `pointermove`.

**Marquee.** `pointerdown` em área vazia. O retângulo cresce com o cursor; a seleção só
muda no `pointerup`, com quem estiver **completamente** envolvido.

**DraggingNode / DraggingEdge / DraggingRoom.** `pointerdown` sobre nó, aresta ou
interior de cômodo. Nada é emitido no `pointerdown`.

**DraggingFurniture / ResizingFurniture / RotatingFurniture.** `pointerdown` sobre um
móvel ou sobre um handle de móvel selecionado. Seguem exatamente a mesma tabela abaixo,
com `MoveFurniture` e `TransformFurniture` transientes no lugar de `MoveNode`. Item
`locked` não entra em nenhum dos três.

| Gatilho | Comportamento |
|---|---|
| `pointermove` com deslocamento ≠ 0 | Emite comando transiente. `historyBoundary` ausente |
| `pointermove` com deslocamento 0 | Nenhum comando |
| `pointerup` | `historyBoundary: 'commit'` |
| `Esc` | `historyBoundary: 'abort'`, volta para Idle |

O primeiro `pointermove` é o que separa clique de arraste: um `pointerdown`/`pointerup`
sem movimento no meio nunca abre entrada pendente, então clicar para selecionar não
gasta uma entrada de histórico. É também o que permite ao arraste de cômodo emitir
`SplitNode` já com o destino deslocado, sem estado intermediário que viole E6
(`08-arquitetura.md` § Comandos do M2).

`Alt` durante qualquer arraste desliga as três classes de snap
(`02-unidades-e-geometria.md` § Modificadores).

### Edição de geometria

**Arrastar nó.** Move o nó. Todas as arestas e cômodos que o referenciam acompanham. Passa pelo resolvedor de snap. Soltar sobre outro nó funde os dois (com confirmação inline desfazível).

**Editar comprimento de aresta.** Duplo clique numa aresta abre um campo sobre ela com o comprimento atual selecionado. Digitar e dar `Enter` move o nó final ao longo da direção da aresta.

Se o nó final é compartilhado por outro cômodo, a UI oferece dois botões inline:

- **Só este cômodo** — desconecta o nó, criando um novo
- **Mover junto** — mantém compartilhado e move os dois

Default é "Mover junto". A escolha é lembrada durante a sessão.

**Arrastar aresta.** Move ambos os nós da aresta perpendicularmente, mantendo os vizinhos conectados. É como se "empurra uma parede".

**Arrastar interior de cômodo.** Move o cômodo inteiro. Nós compartilhados com outros cômodos se desconectam (o cômodo arrastado ganha cópias).

### Handles

Nó selecionado: quadrado de 8 px. Nó sob o cursor: quadrado de 8 px com contorno. Aresta selecionada: espessura dobrada mais rótulo de comprimento sempre visível.

Móvel selecionado: contorno na cor de seleção, um handle de canto de 8 px em cada vértice do retângulo, e um handle de rotação a 24 px da face frontal, ligado a ela por uma haste. Todos em pixels de tela, constantes com o zoom (`04-renderizacao.md` § Espessura constante). Móvel `locked` não desenha handle nenhum — não há o que agarrar.

Os handles de móvel só existem enquanto ele está selecionado, e por isso ocupam a prioridade 1 do hit testing (`02-unidades-e-geometria.md` § Hit testing) sem o problema que o nó tem: um nó que só ganhasse prioridade depois de selecionado seria inalcançável, porque o clique que o selecionaria acertaria a aresta; o corpo do móvel continua agarrável de qualquer jeito.

## Ferramenta Mobília (`F`)

### Inserir

Duas formas:

1. Arrastar um item do painel de catálogo para o canvas
2. `F`, escolher item pela busca do painel, clicar no canvas para posicionar

Item inserido nasce selecionado, com snap a parede ativo.

```
Idle → Armed → (posiciona) → Idle, na Ferramenta Selecionar
```

**Idle.** `F` sem item escolhido. O painel de catálogo é o próximo passo, e o HUD do canvas fica vazio.

**Armed.** Um item do catálogo está escolhido. O cursor arrasta um fantasma do retângulo, com snap a parede resolvido a cada `pointermove`. `Esc` volta para Idle sem inserir.

**Ao posicionar**, emite `AddFurniture` e **a ferramenta ativa volta para Selecionar**, com o item selecionado. É o que faz a próxima ação do usuário — arrastar, girar, redimensionar — funcionar sem trocar de ferramenta, e é o estado que a própria escopagem de `Q`/`E` à seleção antecipa (§ Manipular). Inserir vários itens em sequência se faz arrastando do painel, que não passa por ferramenta nenhuma.

### Manipular

**Manipulação de móvel vive na Ferramenta Selecionar**, não aqui. A Ferramenta Mobília só insere.

A separação não é arbitrária: a rotação por teclado já é escopada à seleção e não à ferramenta (nota ao fim desta seção), e o estado logo depois de inserir é "móvel selecionado, Ferramenta Selecionar ativa". Duas implementações de arraste de móvel — uma em cada ferramenta — seriam duas chances de divergir no snap a parede, no limiar de arraste e na fronteira de histórico.

| Ação | Resultado |
|---|---|
| Arrastar | Move. Snap a parede a menos de 150 mm |
| `Q` (seleção contém mobília) | Rotaciona 90° anti-horário |
| `E` (seleção contém mobília) | Rotaciona 90° horário |
| `Shift + Q` | Rotaciona 15° anti-horário |
| `Shift + E` | Rotaciona 15° horário |
| Arrastar handle de rotação | Rotação livre; `Shift` trava em múltiplos de 15° |
| Arrastar handle de canto | Redimensiona; `Shift` mantém proporção |
| `Ctrl/Cmd + D` | Duplica, deslocado 200 mm |
| Setas | Move 10 mm; com `Shift`, 100 mm |

Rotação por teclado (`Q`/`E`) é escopada à seleção, não à ferramenta ativa. Se a seleção contém mobília, `Q` e `E` rotacionam — funciona tanto na Ferramenta Selecionar quanto na Ferramenta Mobília, cobrindo o estado mais comum (mobília inserida, ferramenta voltou para Selecionar).

Item `locked` ignora arraste, handle, setas e rotação. A recusa é do **comando**, não da ferramenta (`08-arquitetura.md` § Comandos do M3): o painel de propriedades é outro caminho até o mesmo estado, e uma trava que só vale no canvas não é trava.

`Ctrl/Cmd+D` duplica só móveis. Não existe comando de duplicação de cômodo em `08-arquitetura.md`, e o único caso de uso que esta spec descreve é mobília.

Dimensões exatas se editam no painel de propriedades, em centímetros.

### Feedback visual

- Móvel total ou parcialmente fora de qualquer cômodo: contorno tracejado
- Móvel sobrepondo outro móvel: preenchimento hachurado na região de sobreposição
- Faixa de circulação (`clearance`): preenchimento translúcido ao redor, sem contorno

Nenhum desses estados bloqueia a ação. São informação, não restrição.

Item `outline` (gabarito de circulação, `01-modelo-de-dominio.md` § FurnitureItem) é sempre tracejado e sem preenchimento, e nunca hachura: sobrepor um gabarito de giro de cadeira de rodas a uma cadeira é o gesto que ele existe para permitir.

## Ferramenta Medir (`M`)

Clique, arraste, solte: mostra distância. Sem estado persistente, sem criar entidade. `Esc` ou trocar de ferramenta limpa.

Serve para responder "quanto sobra entre a cama e a parede?" sem alterar o documento.

Mostra também a distância projetada em X e Y quando o traço não é axial.

### Estados

| Estado | Como entra | Como sai |
|---|---|---|
| `Idle` | Ativar a ferramenta; `Esc` | `pointerdown` → `Dragging` |
| `Dragging` | `pointerdown` | `pointerup` → `Done`; `Esc` → `Idle`, descartando o traço |
| `Done` | `pointerup` | `Esc` → `Idle`; `pointerdown` → `Dragging` com medição nova |

A medição **permanece na tela** depois de soltar o botão. Sumir junto com o `pointerup` tornaria a ferramenta inútil: ninguém consegue ler um número enquanto arrasta e olha para onde o cursor está indo. `pointerdown` novo substitui a medição anterior — existe uma por vez, porque duas viram anotação, e anotação é entidade, e entidade é o que esta ferramenta não cria.

### Não emite comando nenhum

É a única ferramenta cujo `ToolTransition.commands` é sempre vazio, em toda transição. Não muta documento, não empilha histórico, não é afetada por `Ctrl+Z`, e nada do que ela mostra é salvo.

### Snap, e o canto de móvel

As duas extremidades passam pelo resolvedor de snap, com `Alt` desligando como em qualquer arraste. Sem snap, a medida seria do pixel em que o cursor caiu, e não da geometria — que é precisamente o erro que o produto inteiro existe para evitar (`00-visao-e-escopo.md` § Princípios, 1).

Esta ferramenta é a única que pede **canto de móvel** como âncora de Classe 1 (`02-unidades-e-geometria.md` § Classe 1). As ferramentas de desenho não pedem, e não devem: um nó de cômodo ancorado num canto de sofá ficaria para trás no instante em que o sofá fosse arrastado, e `merged` não teria significado. Para medir, é o alvo mais frequente — "quanto sobra entre a cama e a parede" começa no canto da cama.

### O que aparece

- Traço entre as duas extremidades, com marcador em cada ponta (papel `measure`)
- Distância total, no meio do traço (papel `measureLabel`)
- Quando o traço não é axial, `ΔX` e `ΔY` numa segunda linha do rótulo

Números formatados pela unidade de exibição corrente (`02-unidades-e-geometria.md` § Unidade de exibição), como em qualquer cota.

## Câmera

**Zoom.** Scroll ancorado no cursor: o ponto de mundo sob o cursor permanece sob o cursor. Limites: 0,05 a 20 px/mm. Passo de 1,1× por notch, com aceleração para trackpad.

**Pan.** Botão do meio, `Espaço` + arrastar, ou dois dedos no trackpad.

**Enquadrar.** `Home` ajusta a câmera para caber toda a geometria com 10% de margem. Documento vazio enquadra uma área de 10 × 10 m. `Home` só dispara fora de campo de entrada e de widget composto (regra D0) — com foco na barra de ferramentas, `Home` move o foco em vez de enquadrar.

Zoom e pan nunca entram no histórico de undo.

## Critérios de aceitação

- [ ] Sequência `R`, clique, `320 Enter`, `250 Enter`, `320 Enter`, `C` produz um retângulo de exatamente 3200 × 2500 mm
- [ ] Digitar um dígito em estado Anchored foca o campo de comprimento sem clique
- [ ] Entrada numérica usa a direção pós-snap de eixo, não a direção bruta do mouse
- [ ] `Esc` durante desenho remove um segmento por vez, sem cancelar o traço todo
- [ ] Clicar no nó inicial fecha o polígono reusando o nó (não cria nó duplicado)
- [ ] Desenhar dois retângulos adjacentes com snap a nó produz documento com 6 nós, não 8 (compartilham aresta)
- [ ] Arrastar nó compartilhado por dois cômodos atualiza a área dos dois em tempo real
- [ ] Editar comprimento de aresta com nó compartilhado oferece as duas opções e default é "Mover junto"
- [ ] Digitar `90` no campo de ângulo congela a direção no `oninput`, sem esperar `Enter`
- [ ] Com o foco no campo de ângulo, dígitos vão para ele e não para o de comprimento
- [ ] Retângulo de seleção seleciona só quem está completamente envolvido
- [ ] `pointerdown` seguido de `pointerup` sem movimento não abre entrada pendente nem empilha histórico
- [ ] `Delete` com nó ou aresta de cômodo selecionada não altera o documento; com cômodo, móvel ou parede avulsa selecionada, exclui
- [ ] Móvel arrastado a 100 mm de uma parede encosta e alinha rotação; a 200 mm, não
- [ ] Posicionar um item com `F` devolve a ferramenta ativa para Selecionar, com o item selecionado
- [ ] Móvel `locked` ignora arraste, handle e setas, e o comando correspondente é rejeitado sem tocar no documento
- [ ] `Ctrl/Cmd+D` duplica os móveis da seleção deslocados 200 mm, e não duplica cômodo
- [ ] `Alt` durante qualquer arraste desativa todos os snaps
- [ ] Zoom no cursor mantém a coordenada de mundo sob o cursor invariante dentro de 1 px
- [ ] Nenhuma ferramenta acessa o objeto documento fora de `ToolContext`
- [ ] Com foco na barra de ferramentas, `Home` move o foco para o primeiro botão e não aciona Enquadrar tudo; com foco no canvas, `Home` enquadra tudo
- [ ] `W`, clique, `2400 Enter`, `Enter` produz uma parede avulsa de 2400 mm e volta para Idle sem trocar de ferramenta
- [ ] Polilinha de três trechos com `W` produz três paredes e **uma** entrada de histórico; um `Ctrl+Z` remove as três
- [ ] `Esc` logo depois de ancorar com `W` não altera o documento nem empilha histórico
- [ ] Extremidade de parede sobre nó de cômodo existente reusa o nó, e mover o nó move os dois
- [ ] Móvel arrastado a 100 mm de uma parede avulsa encosta e alinha rotação
- [ ] `M`, arrastar e soltar mostra a distância, que continua na tela depois do `pointerup` e some com `Esc`
- [ ] A Ferramenta Medir não emite comando em nenhuma transição, e `Ctrl+Z` depois de medir desfaz o comando anterior à medição
- [ ] Medição em diagonal mostra `ΔX` e `ΔY`; medição axial não mostra
- [ ] Extremidade de medição a menos de 12 px do canto de um móvel ancora nele; a mesma proximidade não ancora ao desenhar com `R`
- [ ] **Pendente de execução manual** (não satisfeito pela eliminação documental): tabela de atalhos completa testada em um Chrome e um Firefox reais, confirmando que nenhuma combinação além da família `Ctrl/Cmd+0/+/-` é interceptada, além da verificação em teclado ABNT2 já registrada
