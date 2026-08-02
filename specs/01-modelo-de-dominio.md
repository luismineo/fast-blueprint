# 01 — Modelo de domínio

## Visão geral

O documento é uma árvore imutável. Nós geométricos são compartilhados entre cômodos, de modo que mover um canto move as paredes de ambos os cômodos adjacentes.

```
PlanDocument
├── schemaVersion: number      versão do formato de arquivo
├── meta: DocumentMeta
├── nodes: Node[]              vértices compartilhados
├── rooms: Room[]              polígonos fechados
├── walls: Wall[]              segmentos avulsos (divisórias, bancadas)
├── openings: Opening[]        portas e janelas (v1.5)
├── furniture: FurnitureItem[]
└── underlay: Underlay | null  imagem de referência (v1.5)
```

`schemaVersion` fica na raiz do documento, não dentro de `meta` — ele descreve o formato do arquivo inteiro, inclusive o formato de `meta`. Um leitor precisa consultá-lo **antes** de saber como interpretar `meta`, o que seria circular se ele morasse lá dentro. Ver `05-formato-de-arquivo.md` § Schema e `adr/0004-versionamento.md` Decisão 4.

## Entidades

### Node

Vértice compartilhado. É a única entidade que carrega coordenada.

```ts
interface Node {
  id: NodeId
  x: Millimeters
  y: Millimeters
}
```

Eixo Y cresce para baixo (mesma convenção do canvas), evitando inversão de sinal no renderer.

### Room

Cômodo. Polígono fechado definido por um ciclo de nós. As arestas do ciclo **são** as paredes do cômodo — não existe entidade de parede separada para elas.

```ts
interface Room {
  id: RoomId
  name: string
  loop: NodeId[]
  color: HexColor | null
  includeInUsableArea: boolean
}
```

`includeInUsableArea` existe porque varanda e área de serviço normalmente não contam como área útil, mas o usuário decide.

O ciclo é implícito: a última aresta liga `loop[n-1]` a `loop[0]`. Não repita o primeiro nó no fim.

Orientação do ciclo é normalizada para sentido horário na criação. Ver `02-unidades-e-geometria.md`.

### Wall

Segmento que não pertence a nenhum cômodo: uma divisória parcial, uma bancada de cozinha, um guarda-corpo.

```ts
interface Wall {
  id: WallId
  a: NodeId
  b: NodeId
}
```

Não tem área, não conta na área útil, não fecha nada. Os nós são os mesmos `Node` que os cômodos usam: uma bancada que encosta na parede de um cômodo compartilha o nó, e mover esse nó move os dois.

Criada e removida por `CreateWall`/`DeleteWall` (`08-arquitetura.md`), emitidos pela Ferramenta Parede (`03-ferramentas-e-interacao.md` § Parede). A ordem de `a` para `b` é dado, não convenção normalizada — é ela que define o nó final em `SetEdgeLength` e o lado da cota (`04-renderizacao.md` § Cotas).

### EdgeRef

Referência a uma aresta, seja de cômodo ou avulsa. Usada por aberturas e por snap de mobília.

```ts
type EdgeRef =
  | { kind: 'room'; roomId: RoomId; index: number }
  | { kind: 'wall'; wallId: WallId }
```

Para `kind: 'room'`, `index` é a posição em `loop`, e a aresta vai de `loop[index]` a `loop[(index + 1) % loop.length]`.

### Opening (v1.5)

Porta ou janela ancorada a uma aresta, posicionada por distância ao longo dela.

```ts
interface Opening {
  id: OpeningId
  edge: EdgeRef
  kind: 'door' | 'sliding-door' | 'window' | 'passage'
  offset: Millimeters   // distância do início da aresta até o início da abertura
  width: Millimeters
  swing: 'left' | 'right' | 'none'
}
```

Aberturas são posicionadas ao longo da aresta, não em coordenada absoluta, para que continuem coerentes quando o cômodo é redimensionado.

### FurnitureItem

Móvel. Retângulo com dimensões, posição de centro e rotação.

```ts
interface FurnitureItem {
  id: FurnitureId
  catalogId: string | null
  name: string
  width: Millimeters      // dimensão no eixo local X
  depth: Millimeters      // dimensão no eixo local Y
  center: { x: Millimeters; y: Millimeters }
  rotation: Degrees       // 0..359, inteiro, horário
  color: HexColor | null
  locked: boolean
  clearance: Millimeters  // faixa de circulação desenhada ao redor, 0 = nenhuma
  outline?: boolean       // desenhado só como contorno tracejado, sem massa física
}
```

`clearance` é o que torna o app útil de verdade: uma cama com 600 mm de folga mostra visualmente se sobra passagem.

`catalogId` nulo significa móvel criado à mão. Se não nulo, é rastreabilidade — as dimensões continuam editáveis e divergem do catálogo livremente.

`rotation` é **grau inteiro**. Rotação livre por handle arredonda para grau antes de virar comando, pela mesma razão que coordenada é milímetro inteiro (`02-unidades-e-geometria.md` § Unidade interna). Nenhuma medida de trena, e nenhum móvel real, distingue frações de grau.

`outline` marca item **sem massa física** — os gabaritos de `circulacao` do catálogo (`06-catalogo-de-mobilia.md` § Circulação). Consequências, todas por não ser massa:

- Desenhado só com contorno tracejado, sem preenchimento (`04-renderizacao.md` § Mobília).
- Não entra na área ocupada nem na taxa de ocupação (§ Grandezas derivadas).
- Não dispara W4 contra nenhum outro móvel: sobrepor um gabarito de giro a uma cadeira é exatamente o gesto que ele existe para permitir.

O campo mora no documento, e não é derivado do `catalogId`, porque quem desenha é o `renderer`, que não conhece o pacote `catalog` — a direção de dependência de `08-arquitetura.md` não admite. Inferir pelo prefixo do id amarraria o renderer aos ids do catálogo e não valeria para item criado pelo usuário.

Campo opcional: ausente significa `false`, e acrescentá-lo não sobe `schemaVersion` (`05-formato-de-arquivo.md` § Migrações).

### Underlay (v1.5)

Imagem de referência para traçar por cima (foto da planta da construtora).

```ts
interface Underlay {
  imageRef: string        // nome do arquivo no bundle, ou data URI
  origin: { x: Millimeters; y: Millimeters }
  scale: number           // mm por pixel da imagem
  rotation: Degrees
  opacity: number         // 0..1
  locked: boolean
}
```

`scale` é definido por calibração de dois pontos: o usuário clica em duas extremidades de uma cota conhecida e digita a medida real.

### DocumentMeta

```ts
interface DocumentMeta {
  name: string
  createdAt: string       // ISO 8601
  modifiedAt: string
  displayUnit: 'm' | 'cm'
  gridSize: Millimeters
}
```

`schemaVersion` **não** entra aqui — vive na raiz de `PlanDocument` (ver § Visão geral).

## Invariantes

Validadas por `validateDocument(doc): ValidationIssue[]`. Comandos nunca produzem documento que viole uma invariante de nível `error`.

### Nível error

| # | Invariante |
|---|---|
| E1 | Toda coordenada de nó é inteiro |
| E2 | Todo `NodeId` referenciado por room/wall/opening existe em `nodes` |
| E3 | `Room.loop` tem no mínimo 3 nós |
| E4 | `Room.loop` não tem nós repetidos |
| E5 | `Wall.a !== Wall.b` |
| E6 | Não existem dois nós com coordenadas idênticas |
| E7 | `Opening.offset + Opening.width <=` comprimento da aresta ancorada |
| E8 | `FurnitureItem.width > 0` e `depth > 0` |
| E9 | Todos os ids são únicos dentro do seu tipo |

E6 é o que faz o snap a nó existente ser reuso, não duplicação. Quando um comando produziria nós coincidentes, ele funde (merge) os nós.

**E6 e `SplitNode`.** Desconectar um nó compartilhado cria um segundo nó onde antes havia um só, o que parece contradizer E6. Não contradiz porque `SplitNode` carrega o destino da cópia no payload e desconecta e reposiciona na mesma operação (`08-arquitetura.md` § Comandos do M2). Não existe estado intermediário com dois nós coincidentes: quem arrasta emite o comando no primeiro `pointermove` com deslocamento diferente de zero, nunca no `pointerdown`.

### Nível warning

Não bloqueiam o comando, aparecem como aviso na UI.

| # | Aviso |
|---|---|
| W1 | Polígono de cômodo é auto-interceptante |
| W2 | Dois cômodos se sobrepõem em área |
| W3 | Móvel está total ou parcialmente fora de qualquer cômodo |
| W4 | Móvel colide com outro móvel |
| W5 | Existe nó órfão (não referenciado por nenhum cômodo ou parede) |

W1 e W2 são avisos e não erros porque o usuário pode estar no meio de uma edição, e travar a edição viola o princípio 4 (erro é reversível).

Nós órfãos (W5) são removidos por garbage collection ao salvar, nunca durante a edição.

**W3 é "total ou parcialmente".** Um móvel com três cantos dentro e um fora está parcialmente fora e dispara o aviso. Acusar só o caso totalmente fora deixaria passar o caso mais comum de erro real: a cama que não cabe e invade o corredor.

**W4 usa SAT, não caixa envolvente** (`02-unidades-e-geometria.md` § Geometria de mobília). Dois retângulos girados cujas caixas envolventes se cruzam sem que os retângulos se toquem são a situação normal de dois móveis em diagonal num canto; acusá-los seria aviso falso em posição correta.

**A fronteira do polígono conta como dentro.** Um canto exatamente sobre uma aresta do cômodo está contido, para W3 e para a área ocupada. A regra não é cosmética: o snap a parede (`02-unidades-e-geometria.md` § Snap a parede) põe dois cantos exatamente sobre a aresta, por construção, e o ray casting de § Hit testing é assimétrico na fronteira — com o retângulo `(0,0) (3200,0) (3200,2500) (0,2500)`, o ponto `(1000, 0)` cai dentro e o ponto `(1000, 2500)` cai fora. Sem a regra, a mesma cama encostada na parede de cima ficaria contida e encostada na de baixo dispararia W3, e o app acusaria erro na posição que ele mesmo acabou de produzir.

## Grandezas derivadas

Nunca armazenadas. Sempre calculadas a partir da geometria.

| Grandeza | Definição |
|---|---|
| Área do cômodo | Shoelace sobre `loop`, valor absoluto |
| Perímetro do cômodo | Soma dos comprimentos das arestas do ciclo |
| Área útil | Soma das áreas dos cômodos com `includeInUsableArea === true` |
| Área total | Soma das áreas de todos os cômodos |
| Área ocupada por mobília | Soma de `width × depth` dos móveis **contidos** no cômodo, exceto os `outline` |
| Taxa de ocupação | Área ocupada / área do cômodo |
| Centroide do cômodo | Centroide do polígono, usado para posicionar o rótulo |

Taxa de ocupação é o número que responde "esse quarto está lotado?". Acima de 40% um quarto fica apertado; é um sinal útil, não uma regra imposta.

**Contido**, e não "que encosta": os quatro cantos dentro do polígono, com a fronteira contando como dentro (§ Invariantes). Um móvel parcialmente fora já tem aviso próprio (W3), e somar a área inteira dele faria a taxa passar de 100% sem o cômodo estar cheio. Somar só a parte de dentro exigiria recortar o retângulo contra o polígono para produzir um número que ninguém pediu.

## Critérios de aceitação

- [ ] `validateDocument` de um documento vazio retorna zero issues
- [ ] Mover um nó compartilhado por dois cômodos atualiza a área de ambos
- [ ] Criar cômodo cujo primeiro nó coincide com nó existente reusa o nó (não duplica)
- [ ] Deletar um cômodo não deleta nós ainda usados por outro cômodo
- [ ] Área de um retângulo 3200 × 2500 mm é exatamente 8,00 m²
- [ ] Redimensionar um cômodo mantém aberturas ancoradas proporcionalmente na aresta
- [ ] Documento carregado da fixture `apto-44m2` produz área útil dentro de 0,05 m² dos valores da planta legal
