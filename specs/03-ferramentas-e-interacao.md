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
}
```

`ToolContext` não inclui `dispatch`. Ferramentas retornam comandos, não os executam — isso garante que sejam funções puras e testáveis sem mock de store.

`OverlayPrimitive` é definido em `core/` como geometria declarativa pura (sem dependência de canvas). O renderer as interpreta para pixels. Exemplos: `{ kind: 'polyline'; points: Point[]; color: HexColor }`, `{ kind: 'label'; position: Point; text: string }`.

`overlay` devolve o que a ferramenta quer desenhar sobre a cena (traço em andamento, guias, HUD). Ferramentas não têm acesso ao canvas.

## Atalhos globais

| Tecla | Ação |
|---|---|
| `V` | Ferramenta Selecionar |
| `R` | Ferramenta Cômodo |
| `W` | Ferramenta Parede |
| `F` | Ferramenta Mobília |
| `M` | Ferramenta Medir |
| `Espaço` (segurar) | Pan temporário |
| `Ctrl/Cmd + Z` | Desfazer |
| `Ctrl/Cmd + Shift + Z` | Refazer |
| `Ctrl/Cmd + S` | Salvar |
| `Ctrl/Cmd + O` | Abrir |
| `Ctrl/Cmd + D` | Duplicar seleção |
| `Delete` / `Backspace` | Excluir seleção |
| `Esc` | Cancelar operação em andamento; se ociosa, limpa seleção; se ociosa e sem seleção, volta para Selecionar |
| `Scroll` | Zoom ancorado no cursor |
| `Botão do meio` (arrastar) | Pan |
| `0` | Enquadrar tudo |
| `G` | Alternar grid |
| `L` | Alternar cotas |
| `?` | Painel de atalhos |

Modificadores: `Shift` = ângulos de 45°, `Alt` = desligar snap, `Ctrl/Cmd` = adicionar à seleção.

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

Ao fechar, emite `CreateRoom`. O nome default é `Cômodo N`, e o campo de nome entra em modo de edição inline sobre o centroide, já selecionado, para o usuário digitar "Quarto" e dar Enter.

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
| `R` com móvel selecionado | Rotaciona 90° horário |
| `Shift + R` | Rotaciona 90° anti-horário |
| Arrastar handle de rotação | Rotação livre; `Shift` trava em múltiplos de 15° |
| Arrastar handle de canto | Redimensiona; `Shift` mantém proporção |
| `Ctrl/Cmd + D` | Duplica, deslocado 200 mm |
| Setas | Move 10 mm; com `Shift`, 100 mm |

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

**Enquadrar.** `0` ajusta a câmera para caber toda a geometria com 10% de margem. Documento vazio enquadra uma área de 10 × 10 m.

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
