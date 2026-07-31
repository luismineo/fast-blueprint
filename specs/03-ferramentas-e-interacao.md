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

`historyBoundary` sinaliza o fim de uma interação contínua (comandos `transient: true`) para o mecanismo de entrada pendente (`08-arquitetura.md` § Histórico). Ferramentas emitem `'commit'` no `onPointerUp` que finaliza um arraste e `'abort'` no `onKey` que trata o `Esc` de cancelamento. Ausente (`undefined`) em toda transição que não conclui nem cancela uma interação transiente — inclusive em toda transição de ferramentas sem interação contínua, como a Ferramenta Cômodo no M1.

`OverlayPrimitive` é definido em `core/` como geometria declarativa pura (sem dependência de canvas). O renderer as interpreta para pixels. Exemplos: `{ kind: 'polyline'; points: Point[]; color: HexColor }`, `{ kind: 'label'; position: Point; text: string }`.

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
| `Ctrl/Cmd+d` | Global (seleção contém entidades) | Duplicar seleção | 03 § Selecionar, 03 § Mobília |
| `Home` | Global (regra D0: fora de campo/widget composto) | Enquadrar tudo | 03 § Câmera |
| `Ctrl/Cmd+b` | Global | Recolher/expandir painel direito | 07 § Layout |
| `Backspace` | Ferramenta Cômodo em Drawing, campo de comprimento vazio | Remove último segmento | 03 § Cômodo/Cancelar |
| `Backspace` | Qualquer outro estado com seleção | Excluir seleção | 03 § Selecionar |
| `Backspace` | Foco em campo de texto | Apaga caractere (regra de precedência D0) | — |
| `Delete` | Com seleção, fora de campo de texto | Excluir seleção | 03 § Selecionar |
| `Delete` | Foco em campo de texto | Apaga caractere (regra de precedência D0) | — |
| `Escape` | Ferramenta Cômodo em Anchored ou Drawing | Remove último segmento; em Anchored volta para Idle | 03 § Cômodo/Cancelar |
| `Escape` | Ferramenta Medir ativa | Limpa medição | 03 § Medir |
| `Escape` | Qualquer ferramenta, com seleção | Limpa seleção | 03 |
| `Escape` | Ociosa, sem seleção | Volta para Ferramenta Selecionar | 03 |
| `Escape` | HUD com armadilha de foco ativa | Sai da armadilha de foco | 03 § Cômodo/HUD |
| `c` | Ferramenta Cômodo em Drawing | Fecha polígono ligando último nó ao inicial | 03 § Cômodo/Fechar |
| `Enter` | Ferramenta Cômodo em Anchored/Drawing, campo de comprimento preenchido | Confirma segmento | 03 § Cômodo |
| `Enter` | Ferramenta Cômodo em Drawing, campo vazio | Fecha polígono | 03 § Cômodo/Fechar |
| `Enter` | Campo numérico do painel de propriedades | Aplica valor | 07 § Painel |
| `Tab` | Ferramenta Cômodo em Anchored ou Drawing | Circula entre campos do HUD (armadilha de foco; não escapa do HUD) | 03 § Cômodo/HUD |
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

A direção usada com entrada numérica é a direção **após snap de eixo**. Se o mouse aponta para 87° e o snap de eixo está ativo, a direção é 90°. Isso é o que permite desenhar um retângulo perfeito digitando quatro números.

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

### HUD de desenho

Ancorado ao cursor, deslocado 16 px à direita e abaixo. Contém:

```
┌─────────────────────┐
│  320 cm      90,0°  │
│  ─────────          │
│  4 lados · 6,80 m²  │
└─────────────────────┘
```

O campo de comprimento é editável e recebe foco automático ao digitar. O campo de ângulo é **somente leitura no M1** — exibe a direção pós-snap de eixo, mas não aceita entrada. Entrada de ângulo arbitrário entra no M2 (ver `09-roadmap.md`). A terceira linha só aparece a partir de 3 segmentos e mostra a área caso fechasse agora.

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

Idêntica à ferramenta Cômodo, sem fechamento. Cria segmentos avulsos para divisórias, bancadas e guarda-corpos. `Esc` ou `Enter` com campo vazio termina a polilinha.

## Ferramenta Selecionar (`V`)

### Seleção

| Ação | Resultado |
|---|---|
| Clique | Seleciona o alvo de maior prioridade (ver hit testing em `02`) |
| `Ctrl/Cmd` + clique | Adiciona/remove da seleção |
| Arrastar em área vazia | Retângulo de seleção; envolve completamente para selecionar |
| Duplo clique no interior de um cômodo | Entra em edição de nome |
| Duplo clique numa aresta | Abre campo de comprimento da aresta |
| `Ctrl/Cmd + A` | Seleciona tudo |

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

## Ferramenta Mobília (`F`)

### Inserir

Duas formas:

1. Arrastar um item do painel de catálogo para o canvas
2. `F`, escolher item pela busca do painel, clicar no canvas para posicionar

Item inserido nasce selecionado, com snap a parede ativo.

### Manipular

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

Dimensões exatas se editam no painel de propriedades, em centímetros.

### Feedback visual

- Móvel fora de qualquer cômodo: contorno tracejado
- Móvel sobrepondo outro móvel: preenchimento hachurado na região de sobreposição
- Faixa de circulação (`clearance`): preenchimento translúcido ao redor, sem contorno

Nenhum desses estados bloqueia a ação. São informação, não restrição.

## Ferramenta Medir (`M`)

Clique, arraste, solte: mostra distância. Sem estado persistente, sem criar entidade. `Esc` ou trocar de ferramenta limpa.

Serve para responder "quanto sobra entre a cama e a parede?" sem alterar o documento.

Mostra também a distância projetada em X e Y quando o traço não é axial.

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
- [ ] Móvel arrastado a 100 mm de uma parede encosta e alinha rotação; a 200 mm, não
- [ ] `Alt` durante qualquer arraste desativa todos os snaps
- [ ] Zoom no cursor mantém a coordenada de mundo sob o cursor invariante dentro de 1 px
- [ ] Nenhuma ferramenta acessa o objeto documento fora de `ToolContext`
- [ ] Com foco na barra de ferramentas, `Home` move o foco para o primeiro botão e não aciona Enquadrar tudo; com foco no canvas, `Home` enquadra tudo
- [ ] **Pendente de execução manual** (não satisfeito pela eliminação documental): tabela de atalhos completa testada em um Chrome e um Firefox reais, confirmando que nenhuma combinação além da família `Ctrl/Cmd+0/+/-` é interceptada, além da verificação em teclado ABNT2 já registrada
