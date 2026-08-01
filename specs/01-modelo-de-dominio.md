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
  rotation: Degrees       // 0..359, horário
  color: HexColor | null
  locked: boolean
  clearance: Millimeters  // faixa de circulação desenhada ao redor, 0 = nenhuma
}
```

`clearance` é o que torna o app útil de verdade: uma cama com 600 mm de folga mostra visualmente se sobra passagem.

`catalogId` nulo significa móvel criado à mão. Se não nulo, é rastreabilidade — as dimensões continuam editáveis e divergem do catálogo livremente.

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

## Grandezas derivadas

Nunca armazenadas. Sempre calculadas a partir da geometria.

| Grandeza | Definição |
|---|---|
| Área do cômodo | Shoelace sobre `loop`, valor absoluto |
| Perímetro do cômodo | Soma dos comprimentos das arestas do ciclo |
| Área útil | Soma das áreas dos cômodos com `includeInUsableArea === true` |
| Área total | Soma das áreas de todos os cômodos |
| Área ocupada por mobília | Soma de `width × depth` dos móveis dentro do cômodo |
| Taxa de ocupação | Área ocupada / área do cômodo |
| Centroide do cômodo | Centroide do polígono, usado para posicionar o rótulo |

Taxa de ocupação é o número que responde "esse quarto está lotado?". Acima de 40% um quarto fica apertado; é um sinal útil, não uma regra imposta.

## Critérios de aceitação

- [ ] `validateDocument` de um documento vazio retorna zero issues
- [ ] Mover um nó compartilhado por dois cômodos atualiza a área de ambos
- [ ] Criar cômodo cujo primeiro nó coincide com nó existente reusa o nó (não duplica)
- [ ] Deletar um cômodo não deleta nós ainda usados por outro cômodo
- [ ] Área de um retângulo 3200 × 2500 mm é exatamente 8,00 m²
- [ ] Redimensionar um cômodo mantém aberturas ancoradas proporcionalmente na aresta
- [ ] Documento carregado da fixture `apto-44m2` produz área útil dentro de 0,05 m² dos valores da planta legal
