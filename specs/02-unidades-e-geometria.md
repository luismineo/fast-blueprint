# 02 — Unidades e geometria

## Unidade interna

**Milímetro inteiro.** Todas as coordenadas, comprimentos e dimensões no domínio.

```ts
type Millimeters = number & { readonly __brand: 'mm' }
```

Motivos:

- Uma trena mede em milímetros. Não há perda de precisão na entrada.
- Inteiro elimina drift de ponto flutuante. Fechar um polígono de 4 arestas com floats deixa resíduo de 1e-13 e quebra comparação de igualdade de nós.
- 32 bits cobrem ±2.147 km. Suficiente.

Ponto flutuante aparece apenas em: coordenadas de tela, escala de câmera, ângulos em radianos durante cálculo, e resultados de área antes da formatação.

Toda função que converte float → mm usa `Math.round`, nunca `Math.floor` ou truncamento.

## Unidade de exibição

Definida por `meta.displayUnit`, default `'m'`. Conversão vive só em `core/format`.

| Contexto | Formato | Exemplo |
|---|---|---|
| Comprimento de aresta (cota) | metros, 2 casas | `3,20 m` |
| Comprimento durante desenho (HUD) | centímetros inteiros | `320 cm` |
| Área | metros quadrados, 2 casas | `8,00 m²` |
| Dimensão de móvel | centímetros inteiros | `158 × 198 cm` |

Separador decimal é vírgula (pt-BR).

Durante o desenho o HUD usa centímetros porque é como as pessoas falam de medida de parede ("três e vinte" → digita `320`).

## Entrada numérica

O campo de comprimento aceita, todos resolvendo para o mesmo valor:

| Digitado | Resultado |
|---|---|
| `320` | 3200 mm (interpretado como cm, unidade default de entrada) |
| `3,20` ou `3.20` | 3200 mm (contém separador → interpretado como m) |
| `3200mm` | 3200 mm |
| `320cm` | 3200 mm |
| `3.2m` | 3200 mm |

Regra: número sem sufixo e sem separador decimal é centímetro. Número sem sufixo com separador decimal é metro. Sufixo explícito sempre vence.

Essa regra é configurável em `InputConfig.bareNumberUnit`, mas o default é o acima.

### Expressão aritmética

Todo campo numérico aceita soma e subtração de dois ou mais termos (`158+40` → 198 cm;
`3,20-0,15` → 3,05 m). É o que permite responder "e se eu tirar 15 cm daqui?" sem
calculadora, que é o gesto mais comum de quem está medindo.

Regras:

- **Cada termo é interpretado pela tabela acima, de forma independente.** Não existe
  unidade "da expressão": `158+40` é 158 cm + 40 cm, e `1,58+40` é 1,58 m + 40 cm —
  os dois dão 1980 mm, porque o `40` nu vale centímetro nos dois casos.
- Sufixo explícito num termo vale só para aquele termo: `1,58m+40cm` → 1980 mm.
- O arredondamento para milímetro inteiro acontece **na soma**, não termo a termo, para
  que uma cadeia longa não acumule o erro de cada arredondamento parcial.
- Só `+` e `-`. Sem multiplicação, divisão, parênteses ou precedência — não existe
  ambiguidade de ordem numa cadeia de somas e subtrações avaliada da esquerda para a
  direita, e qualquer coisa além disso é uma calculadora, não um campo de medida.
- Expressão malformada resolve para o mesmo que entrada malformada: o campo mantém o
  texto e o valor não é aplicado.

Este documento é o dono da regra de entrada numérica. `07-ui-e-layout.md` § Painel de
propriedades cita o comportamento e o critério de aceitação; a regra é definida aqui.

## Área

Shoelace (fórmula do cadarço) sobre o ciclo de nós:

```
A = |Σ (x[i] · y[i+1] − x[i+1] · y[i])| / 2
```

Resultado em mm², dividido por 1.000.000 para m². A divisão acontece só na formatação; o valor em mm² é o que trafega no domínio.

Arredondamento de exibição é meia-para-cima na segunda casa decimal em m².

### Orientação

O sinal do shoelace antes do valor absoluto dá a orientação. Com Y crescendo para baixo, resultado positivo é sentido horário.

Ciclos são normalizados para horário na criação do cômodo. Isso importa para: cálculo de normal de aresta (o lado "de dentro" do cômodo), posicionamento de aberturas e snap de mobília a parede.

### Área provisória durante desenho

Durante o estado Drawing da ferramenta Cômodo, a área exibida no HUD é calculada como o shoelace sobre `[n0, n1, ..., nk, n0]` onde `n0..nk` são os nós já confirmados. O segmento de fechamento `nk → n0` é implícito — o polígono é tratado como fechado para o cálculo, mesmo que ainda não tenha sido finalizado.

## Snap

O resolvedor de snap é a única porta de entrada para criação e movimentação de geometria. Recebe um ponto em coordenadas de mundo e o contexto, e devolve o ponto ajustado mais os alvos que participaram do ajuste.

O modelo completo está em `adr/0003-modelo-de-snap.md`. Esta seção resume o comportamento.

```ts
interface SnapResult {
  point: Point
  targets: SnapTarget[]
  merged: NodeId | null
}
```

- `targets` lista toda restrição que participou do resultado (âncora vencedora + retas que restringiram, se houver). Usado para desenhar guias visuais.
- `merged` é preenchido apenas quando uma âncora de nó existente disparou (invariante E6).

### Três classes, não uma lista linear

O resolvedor opera em três classes avaliadas em ordem. Ver `adr/0003-modelo-de-snap.md` para justificativa e alternativas rejeitadas.

#### Classe 1 — Âncora de ponto

Alvos: **nó existente**, **ponto médio de aresta**, e **canto de móvel** quando o contexto pede.

Produz um ponto exato. **Exclusiva:** se qualquer âncora disparar, a mais próxima do cursor vence e nenhuma restrição de reta é aplicada depois. O ponto retornado é a coordenada exata do alvo.

`merged` é preenchido apenas quando a âncora vencedora foi um nó. Ponto médio e canto de móvel preenchem `targets` mas deixam `merged = null`.

**Canto de móvel não é âncora por padrão.** Só a Ferramenta Medir o liga, por um flag no contexto de snap (`03-ferramentas-e-interacao.md` § Medir). Para as ferramentas de desenho ele seria um alvo errado: um nó de cômodo ancorado num canto de sofá ficaria para trás no instante em que o sofá fosse arrastado — geometria de construção não deve seguir mobília. Para medir, é o alvo mais frequente que existe.

Tolerância: 12 px de tela, limitada a [2, 200] mm (`adr/0005-tolerancias-de-snap.md`).

#### Classe 2 — Restrição de reta

Alvos: **projeção sobre aresta**, **extensão de aresta**, **eixo a partir da origem do traço**, **alinhamento com nó existente**.

Cada alvo que dispara restringe o ponto a uma reta. O resultado depende de quantas dispararam:

| Restrições | Comportamento |
|---|---|
| 0 | Cai para Classe 3 (grid) |
| 1 | Projeta o ponto do cursor sobre a reta |
| 2 ou mais | Intercepta as duas de maior prioridade |

Prioridade entre restrições (maior para menor):

1. Eixo a partir da origem do traço
2. Alinhamento com nó existente
3. Projeção sobre aresta
4. Extensão de aresta

Ângulo entre retas < 15° descarta a de menor prioridade (evita instabilidade numérica). Se a interseção cair fora da tolerância de 40 mm do cursor, projeta sobre a restrição de maior prioridade.

Tolerância: 8 px de tela, limitada a [2, 250] mm (`adr/0005-tolerancias-de-snap.md`).

**Fronteira aresta/extensão:** pé da projeção estritamente entre os extremos do segmento é aresta; fora, é extensão. Extensão avalia todas as arestas do documento — com ~30 arestas típicas, projeção ponto-reta é O(arestas) e cabe no orçamento de 8 ms.

**Retas de alinhamento:** cada nó existente contribui com duas retas, a horizontal e a vertical que passam por ele. Com `Shift`, contribui também com as duas de 45°, pela mesma regra que estende os eixos. É o alinhamento que permite pousar um vértice novo exatamente na altura de um vértice do outro lado da planta, que é o gesto que a guia tracejada anuncia.

**Origem do eixo fora da Ferramenta Cômodo:** "eixo a partir da origem do traço" pressupõe um traço em andamento. Num arraste da Ferramenta Selecionar não há traço, e a origem é a **posição da entidade no início do arraste**: o nó em `pointerdown` ao arrastar um nó, o ponto de agarre ao arrastar uma aresta ou um cômodo. É o que faz "empurrar uma parede" andar reto em vez de derivar.

#### Classe 3 — Grid

Fallback. Só se **nenhuma** restrição de reta disparou, e só se o grid está ligado.

Arredonda cada coordenada para o múltiplo mais próximo de `meta.gridSize`.

Tolerância: 6 px de tela, limitada a [1, min(300, gridSize/2)] mm. Distância > gridSize/2 → grid não dispara. Com o `gridSize` default de 100 mm, quem manda é a metade da célula (`adr/0005-tolerancias-de-snap.md`).

### Modificadores

| Tecla | Efeito |
|---|---|
| `Shift` | Inclui múltiplos de 45° nos eixos da Classe 2 |
| `Alt` | Desliga as três classes; resolvedor devolve o ponto de entrada sem alteração |

Todos os valores de tolerância vivem em `SnapConfig`, exposta nas preferências. Os limites em mm foram validados no M2 dirigindo o aplicativo; a medição e o raciocínio estão em `adr/0005-tolerancias-de-snap.md`.

### Guias visuais

Guias são derivadas de `targets` no `SnapResult`:

- Âncora de nó: marcador quadrado no nó alvo
- Âncora de ponto médio: losango no ponto médio
- Restrição de eixo: linha do traço em cor de eixo
- Restrição de alinhamento: linha tracejada até o nó de referência
- Restrição de aresta/extensão: highlight da aresta envolvida

Ver `04-renderizacao.md` para os passes de desenho.

## Hit testing

Executado em coordenadas de mundo, com tolerância convertida de pixels.

Ordem de prioridade quando múltiplos alvos estão sob o cursor:

1. Handle de seleção ativa (nó ou vértice de móvel)
2. Móvel (ordem inversa de `furniture`, último desenhado é o primeiro testado)
3. Abertura
4. Aresta de cômodo ou parede avulsa
5. Interior de cômodo

Tolerância para elementos lineares: 6 px. Para handles: 10 px.

Handle de móvel só existe para móvel selecionado e destravado, então o resolvedor recebe a seleção junto do documento. Isso não vale para nó: um nó que só ganhasse prioridade depois de selecionado seria inalcançável, porque o clique que o selecionaria acertaria a aresta que passa por ele — nó é testado antes da aresta e independentemente da seleção. Móvel não tem esse problema, porque o corpo dele continua agarrável.

Ponto-em-polígono usa ray casting com tratamento de vértice: raio horizontal para +X, aresta conta se `(y[i] > py) !== (y[j] > py)`.

## Geometria de mobília

Móvel é um retângulo orientado (OBB). Cantos calculados a partir de centro, dimensões e rotação:

```
c = cos(rotation), s = sin(rotation)
hw = width / 2, hd = depth / 2
canto[k] = center + R · (±hw, ±hd)
```

`rotation` é grau inteiro (`01-modelo-de-dominio.md` § FurnitureItem). O cosseno e o seno são float durante o cálculo, como qualquer ângulo; o canto resultante volta a milímetro inteiro por `Math.round`.

Colisão móvel-móvel usa SAT (separating axis theorem) sobre os 4 eixos candidatos. Só gera aviso visual, nunca bloqueia movimento. Item `outline` não participa: ele não tem massa física.

Contenção móvel-cômodo testa os 4 cantos com ponto-em-polígono. Todos dentro = contido; alguns = parcial; nenhum = fora.

**A fronteira conta como dentro.** O ray casting de § Hit testing é assimétrico na borda — no retângulo `(0,0) (3200,0) (3200,2500) (0,2500)` o ponto `(1000, 0)` cai dentro e `(1000, 2500)` cai fora —, e o snap a parede abaixo põe dois cantos exatamente sobre a aresta. Sem tratar a fronteira, a contenção de um móvel encostado dependeria de qual parede o usuário escolheu. A justificativa completa está em `01-modelo-de-dominio.md` § Invariantes; a implementação testa "sobre a fronteira" antes de recorrer ao ray casting.

### Snap a parede

Quando um móvel é arrastado a menos de 150 mm de uma aresta, ele encosta: a face traseira do móvel alinha com a aresta, e a rotação se ajusta para a direção da aresta.

**Aresta aqui é aresta de cômodo ou parede avulsa**, sem distinção. Uma divisória de closet é tão encostável quanto uma parede externa, e o resolvedor nunca soube diferenciar as duas — só não havia como criar a segunda antes da Ferramenta Parede (`03-ferramentas-e-interacao.md` § Parede).

A face traseira é a que encosta porque é a convenção de catálogo — cama, sofá e armário têm frente e fundo, e o fundo vai na parede.

**Qual borda é a traseira.** A borda em `−depth` local. `depth` cresce da parede para dentro do cômodo (`06-catalogo-de-mobilia.md` § Convenção de orientação, que é a dona desta regra): o fundo fica em `−hd`, a frente em `+hd`, e a marca de orientação do render vai na frente. Uma versão anterior deste documento dizia "borda no `+depth` local", o que contradizia a convenção do catálogo — se `+Y` entra no cômodo, a borda em `+depth` é a da frente.

**Qual distância são os 150 mm.** A menor distância entre o **retângulo do móvel** e o segmento da aresta, ou seja, a mínima entre os quatro cantos e o segmento. Não é a distância do centro: essa faria o limiar depender do tamanho do móvel, e "arrastar a 100 mm de uma parede" é uma frase sobre a borda do móvel, não sobre o meio dele.

**O snap a parede é exclusivo em relação às três classes**, pela mesma razão que a Classe 1 é exclusiva dentro do resolvedor: se uma aresta dispara, ela decide o centro **e** a rotação, e nem grid nem restrição de reta participam depois. Sem isso o grid arredondaria o centro e tiraria o móvel da parede em que ele acabou de encostar.

`Alt` desliga.

### Achatamento de arco

`writeArcPoints(out, center, radius, from, to, ...)` escreve num buffer pré-alocado os pontos que aproximam um arco por polilinha, com um segmento a cada 15° de varredura e no mínimo quatro. Um círculo completo sai com 24 lados.

É geometria pura e mora em `core/geometry` ao lado de `writeObbCorners`, mas o único consumidor é o renderer: os glifos de mobília declaram arco e o pass os achata na hora de desenhar, para que `DrawTarget` não precise de primitiva de curva (`adr/0006-glifos-de-mobilia.md`). Nada no domínio produz arco — não existe geometria curva em documento nenhum.

O arco é escrito em coordenadas da caixa unitária do glifo e escalado depois, por eixo. É essa ordem que faz um arco circular virar elipse num móvel não quadrado, sem nenhum tratamento de elipse.

## Precisão de fechamento

A aresta de fechamento (do último nó confirmado ao nó inicial) nunca é digitada — ela assume o comprimento que a geometria der. A fusão com o nó inicial via âncora de snap (Classe 1, nó existente) é o único mecanismo de fechamento. Se o usuário digitou também o último trecho, a âncora de nó dispara sobre o nó inicial, o `merged` funde os nós, e o comprimento digitado é sobrescrito pela fusão. A UI informa a diferença emitindo a mensagem `closeDeviation` (texto e parâmetros em `07-ui-e-layout.md` § Textos de interface) com o comprimento real do último trecho e o comprimento digitado.

A mensagem é informativa, sem limiar de recusa, sem algoritmo de ajuste, sem nó movido. Desaparece sozinha após 6 segundos.

## Critérios de aceitação

- [ ] `parseLength('320')` → 3200; `parseLength('3,20')` → 3200; `parseLength('3200mm')` → 3200
- [ ] `parseLength('158+40')` → 1980; `parseLength('1,58m+40cm')` → 1980; expressão malformada não aplica valor
- [ ] Área de polígono `(0,0) (3200,0) (3200,2500) (0,2500)` é 8.000.000 mm²
- [ ] Shoelace de ciclo em sentido anti-horário retorna área positiva após normalização
- [ ] Snap a nó existente dentro da tolerância devolve `merged` com o id do nó
- [ ] Ponto médio de aresta preenche `targets` mas deixa `merged = null`
- [ ] Duas restrições de reta com ângulo < 15° descartam a de menor prioridade
- [ ] Tolerância de snap respeita clamping em mm, independente da escala da câmera
- [ ] Em escala 0,06 px/mm, clique a 10 px de um nó existente dispara a âncora de nó; em 0,01 px/mm, clique a 500 mm não dispara (`adr/0005-tolerancias-de-snap.md`)
- [ ] `Alt` pressionado faz o resolvedor devolver o ponto de entrada sem alteração
- [ ] SAT detecta sobreposição entre dois retângulos rotacionados 30° e 60° com centros a 400 mm
- [ ] Canto de móvel dispara âncora de Classe 1 com o flag ligado, e não dispara sem ele
- [ ] Móvel a 100 mm de uma parede avulsa encosta nela; a 200 mm, não
- [ ] `writeArcPoints` de um círculo completo escreve 24 pontos, e o primeiro coincide com o último dentro de 1 mm
- [ ] Property test: para qualquer polígono simples gerado, área calculada por shoelace é igual à soma das áreas dos triângulos da sua triangulação por fan
- [ ] Property test: para qualquer sequência de comprimentos digitados, o polígono resultante fecha (primeiro nó igual ao último)
