# 04 — Renderização

## Tecnologia

Canvas 2D com renderer próprio. Sem biblioteca de canvas. Justificativa em `adr/0001-stack.md`.

O renderer é uma função pura de estado para pixels: recebe documento, câmera, seleção e overlays das ferramentas, e desenha. Não mantém estado próprio além de caches de medição de texto.

## Câmera

```ts
interface Camera {
  tx: number      // translação em px de tela
  ty: number
  scale: number   // px de tela por mm de mundo
}
```

Transformações:

```
tela = mundo · scale + t
mundo = (tela − t) / scale
```

Aplicada via `ctx.setTransform` uma vez por frame. Coordenadas de desenho ficam em milímetros dentro dos passes de geometria; passes de UI (handles, rótulos, guias) resetam a transformação e desenham em pixels.

### Zoom ancorado no cursor

Cada passo de zoom segue três operações, nesta ordem:

1. **Deriva o ponto de mundo** `P_world` sob o cursor: `P_world = (cursor_px − t) / scale`, usando a câmera atual.
2. **Define a nova escala** `scale' = scale × factor`, limitada a [0,05, 20] px/mm.
3. **Resolve a translação** `t'` para que `P_world` caia no mesmo pixel: `t' = cursor_px − P_world × scale'`.

O passo é autocorretivo: a posição de mundo é recalculada da câmera atual a cada evento, e a nova translação é derivada analiticamente. Nada é acumulado entre passos, portanto não há acúmulo de erro de ponto flutuante. A precisão é limitada apenas pela representação `float64` de `tx`, `ty` e `scale`, e o erro de round-trip é menor que 1 px de tela para qualquer sequência de zooms dentro dos limites da câmera.

### Espessura constante

Elementos de contorno e handles devem ter tamanho constante em pixels, independente do zoom. Com a transformação aplicada, isso significa `lineWidth = px / scale`.

Handles, texto e ícones são desenhados após `ctx.resetTransform()`, com posições convertidas manualmente. Nunca escale texto pela matriz — degrada o hinting.

### Device pixel ratio

O canvas tem `width = cssWidth · dpr`. A transformação base multiplica por `dpr`. Sem isso, tudo fica borrado em tela Retina.

Reagir a mudança de `dpr` (mover a janela entre monitores) via `matchMedia('(resolution: Xdppx)')`.

## Passes de desenho

Ordem fixa. Cada pass é uma função isolada, testável, que recebe `RenderContext`.

```ts
interface RenderContext {
  doc: PlanDocument
  camera: Camera
  selection: Selection
  hover: SelectionRef | null
  theme: Theme
  caches: {
    bbox: BBoxCache
    textMetrics: TextMetricsCache
  }
  target: DrawTarget
}
```

`Selection` e `SelectionRef` são definidos em `core/selection` (`03-ferramentas-e-interacao.md` § Selecionar). Ficam em `core` porque renderer e `app` precisam dos dois e a direção de dependência não admite outro lugar.

`hover` existe porque `03-ferramentas-e-interacao.md` § Handles distingue "nó selecionado" de "nó sob o cursor", e o pass de seleção precisa dos dois para desenhar handles diferentes. É estado efêmero de interação, como a seleção: não entra no documento nem no histórico.

| # | Pass | Conteúdo |
|---|---|---|
| 1 | `clear` | Fundo |
| 2 | `grid` | Grid adaptativo |
| 3 | `roomFills` | Preenchimento dos cômodos |
| 4 | `furnitureClearance` | Faixas de circulação (abaixo dos móveis) |
| 5 | `furniture` | Retângulos de móveis, rótulos, hachura de colisão |
| 6 | `walls` | Arestas de cômodos e paredes avulsas |
| 7 | `openings` | Portas e janelas, com arco de abertura (no-op no M1: itera array vazio; implementação entra em M6) |
| 8 | `dimensions` | Cotas de aresta |
| 9 | `roomLabels` | Nome e área no centroide |
| 10 | `snapGuides` | Guias de alinhamento e eixo |
| 11 | `toolOverlay` | Traço em andamento da ferramenta ativa |
| 12 | `selection` | Contornos de seleção e handles |
| 13 | `hud` | HUD de entrada numérica, escala gráfica |

Passes 1–9 desenham conteúdo do documento. Passes 10–13 desenham estado efêmero de interação.

O pass `hud` desenha apenas a **escala gráfica**. O HUD de entrada numérica (`03-ferramentas-e-interacao.md` § HUD de desenho) é elemento DOM sobreposto ao canvas, não pass de canvas: ele tem campos editáveis com foco, seleção e navegação por teclado, e uma armadilha de foco que precisa ser anunciada por leitor de tela — nada disso o canvas fornece.

Passes de geometria (2–8, 10, 11) desenham em **milímetros**, com a transformação da câmera aplicada, e usam `lineWidth = px / scale` para espessura constante. Passes que desenham **texto** (9 e as cotas de 8) resetam a transformação e convertem a posição manualmente — ver § Espessura constante. Um pass declara em qual dos dois espaços trabalha; o orquestrador aplica ou reseta a transformação antes de chamá-lo, e o pass nunca gerencia transformação por conta própria.

O underlay (imagem de referência) não está na lista de passes: ele usa um elemento canvas de fundo separado, sobreposto por z-index atrás do canvas principal, redesenhado apenas quando a câmera muda (ver § Orçamento de performance, regra 6). No M1 é no-op porque `doc.underlay` é sempre `null`.

## Grid adaptativo

Espaçamento do grid muda com o zoom para manter densidade visual entre 8 e 80 px por célula.

| Escala (px/mm) | Célula principal | Subdivisão |
|---|---|---|
| > 0,40 | 100 mm | 10 mm |
| 0,08 – 0,40 | 500 mm | 100 mm |
| 0,016 – 0,08 | 1000 mm | 500 mm |
| < 0,016 | 5000 mm | 1000 mm |

Linha principal e subdivisão têm opacidades distintas. Subdivisão desaparece por fade quando sua densidade cai abaixo de 6 px.

O grid desenha só a região visível, calculada a partir do viewport invertido para mundo. Nunca itere sobre um domínio fixo.

## Cotas

Toda aresta de cômodo tem cota, desenhada por fora do polígono (usando a normal da aresta, que é bem definida porque os ciclos são normalizados para horário).

- Offset de 14 px da aresta
- Texto rotacionado com a aresta, sempre legível (rotação normalizada para o intervalo −90°..90°)
- Suprimida quando o comprimento em tela é menor que a largura do texto mais 8 px
- Colisão entre cotas de arestas curtas adjacentes resolve deslocando alternadamente

Alternável com `L`.

## Rótulo de cômodo

No centroide do polígono. Duas linhas:

```
Quarto
8,00 m²
```

Suprimido se o polígono em tela é menor que a caixa do texto. O centroide de polígono côncavo pode cair fora; nesse caso usa o centro do maior retângulo inscrito aproximado por amostragem em grade 8×8 dentro do bounding box.

## Mobília

Retângulo com preenchimento sólido claro e contorno. Dentro, se couber:

```
Cama queen
158 × 198
```

Marca de orientação na face frontal: um traço de 2 px na borda oposta ao fundo. É o que permite ver de relance se o sofá está virado para a TV.

Faixa de circulação desenhada como retângulo expandido, preenchimento translúcido, sem contorno, com blend `multiply`.

## Tokens visuais

Definidos em `renderer/theme.ts`, consumidos por todos os passes. Nenhum literal de cor fora deste arquivo.

```ts
const light: Theme = {
  background:        '#FBFBF9',
  grid:              '#E8E7E2',
  gridMajor:         '#D8D6CF',
  wall:              '#1C1B18',
  wallWidth:         2.5,
  roomFill:          '#FFFFFF',
  roomFillAlt:       '#F4F3EF',
  roomLabel:         '#57544C',
  dimension:         '#8B877C',
  dimensionWidth:    1,
  furnitureFill:     '#E4E9EE',
  furnitureStroke:   '#7C8894',
  furnitureLabel:    '#4A545F',
  clearance:         '#DCE6DA',
  selection:         '#2F6FED',
  selectionFill:     'rgba(47,111,237,0.10)',
  snapGuide:         '#E0645A',
  snapNode:          '#2F6FED',
  collision:         '#D4735E',
  outsideRoom:       '#B9B4A8',
}
```

Paleta de papel: fundo levemente quente, paredes quase pretas, mobília em azul-cinza dessaturado. O único acento saturado é o azul de seleção e o coral das guias de snap — a planta em si é neutra para que o layout seja o que chama atenção.

### Cor de cômodo não é token de tema

`Room.color` (`01-modelo-de-dominio.md`) é **dado de documento**: o usuário escolhe, o valor é serializado no arquivo, e um tema escuro não o altera. A paleta de cores oferecidas no painel de propriedades vive portanto em `core`, junto do modelo, e não em `renderer/theme.ts`.

O critério "nenhuma string hexadecimal de cor existe fora de `renderer/theme.ts`" continua valendo para **token de apresentação**, que é o que ele sempre quis dizer: o que o tema decide. A regra de lint reconhece os dois arquivos, e nenhum outro.

Tema escuro invertido é v2. Os passes já leem tudo do objeto `Theme`, então é troca de objeto.

## Orçamento de performance

| Métrica | Alvo |
|---|---|
| Frame durante pan/zoom | < 8 ms |
| Frame ocioso | 0 (sem redesenho) |
| Elementos suportados a 60 fps | 2000 primitivas |
| Latência do primeiro pixel após abrir arquivo | < 100 ms |

Regras que sustentam o orçamento:

1. **Dirty flag.** Um `requestAnimationFrame` agendado só quando algo mudou. Eventos de mouse marcam sujo, não desenham.
2. **Sem alocação no loop.** Nenhum `map`, `filter`, spread, `Object.assign`, template string ou closure criada durante um pass. Buffers de ponto pré-alocados e reutilizados.
3. **Culling por bounding box.** Cada entidade tem bbox em cache invalidado por comando. Entidades fora do viewport são puladas antes de qualquer trabalho de desenho.
4. **Cache de medição de texto.** `ctx.measureText` é caro. Cache com chave `texto|fonte`.
5. **Batching por estilo.** Agrupe primitivas do mesmo estilo num único `beginPath`/`stroke`. Trocar `strokeStyle` é o custo dominante em cenas com muitas linhas.
6. **Canvas separado para o underlay.** A imagem de referência vai num canvas de fundo, redesenhada só quando a câmera muda, para não pagar `drawImage` de imagem grande a cada frame de overlay.

Instrumentação: `renderer/profiler.ts` acumula tempo por pass, exposto por `?debug=perf`, desenhado como overlay. Não incluído no bundle de produção.

## Export

**SVG.** Reusa a mesma lista de passes através de uma implementação alternativa da interface `DrawTarget`. Um pass, dois backends — é o que garante que o SVG exportado seja idêntico à tela.

**PNG.** `canvas.toBlob` numa câmera temporária enquadrando o conteúdo, com escala configurável (1×, 2×, 4×).

Ambos respeitam as alternâncias de grid e cotas no momento do export, e o export tem sua própria margem de 5%.

## Critérios de aceitação

- [ ] Espessura de parede na tela é idêntica em escala 0,02 e 2,0 px/mm
- [ ] Texto permanece nítido em `devicePixelRatio` 2
- [ ] Grid a escala 0,3 desenha células de 500 mm com subdivisão de 100 mm
- [ ] Cota de aresta de 200 mm em escala 0,05 é suprimida por falta de espaço
- [ ] Nenhum redesenho ocorre quando a aplicação está ociosa (verificável por contador de frames)
- [ ] Profiler reporta menos de 8 ms com a fixture `apto-44m2` acrescida de 40 móveis
- [ ] SVG exportado e PNG exportado da mesma cena têm geometria coincidente
- [ ] Nenhuma string hexadecimal de cor existe fora de `renderer/theme.ts` e da paleta de cor de cômodo em `core` (§ Cor de cômodo não é token de tema)
- [ ] Pass `selection` desenha handle de 8 px em nó selecionado, handle com contorno em nó sob o cursor, e aresta selecionada com espessura dobrada e rótulo de comprimento
