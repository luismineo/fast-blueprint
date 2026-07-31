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

Alvos: **nó existente**, **ponto médio de aresta**.

Produz um ponto exato. **Exclusiva:** se qualquer âncora disparar, a mais próxima do cursor vence e nenhuma restrição de reta é aplicada depois. O ponto retornado é a coordenada exata do alvo.

`merged` é preenchido apenas quando a âncora vencedora foi um nó. Ponto médio preenche `targets` mas deixa `merged = null`.

Tolerância: 12 px de tela, limitada a [2, 30] mm.

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

Tolerância: 8 px de tela, limitada a [2, 40] mm.

**Fronteira aresta/extensão:** pé da projeção estritamente entre os extremos do segmento é aresta; fora, é extensão. Extensão avalia todas as arestas do documento — com ~30 arestas típicas, projeção ponto-reta é O(arestas) e cabe no orçamento de 8 ms.

#### Classe 3 — Grid

Fallback. Só se **nenhuma** restrição de reta disparou, e só se o grid está ligado.

Arredonda cada coordenada para o múltiplo mais próximo de `meta.gridSize`.

Tolerância: 6 px de tela, limitada a [1, gridSize/2] mm. Distância > gridSize/2 → grid não dispara.

### Modificadores

| Tecla | Efeito |
|---|---|
| `Shift` | Inclui múltiplos de 45° nos eixos da Classe 2 |
| `Alt` | Desliga as três classes; resolvedor devolve o ponto de entrada sem alteração |

Todos os valores de tolerância vivem em `SnapConfig`, exposta nas preferências. Os limites em mm são ponto de partida a validar no protótipo com a fixture `apto-44m2`.

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

Ponto-em-polígono usa ray casting com tratamento de vértice: raio horizontal para +X, aresta conta se `(y[i] > py) !== (y[j] > py)`.

## Geometria de mobília

Móvel é um retângulo orientado (OBB). Cantos calculados a partir de centro, dimensões e rotação:

```
c = cos(rotation), s = sin(rotation)
hw = width / 2, hd = depth / 2
canto[k] = center + R · (±hw, ±hd)
```

Colisão móvel-móvel usa SAT (separating axis theorem) sobre os 4 eixos candidatos. Só gera aviso visual, nunca bloqueia movimento.

Contenção móvel-cômodo testa os 4 cantos com ponto-em-polígono. Todos dentro = contido; alguns = parcial; nenhum = fora.

### Snap a parede

Quando um móvel é arrastado a menos de 150 mm de uma aresta, ele encosta: a face traseira do móvel (borda no `+depth` local) alinha com a aresta, e a rotação se ajusta para a direção da aresta.

A face traseira é a que encosta porque é a convenção de catálogo — cama, sofá e armário têm frente e fundo, e o fundo vai na parede.

`Alt` desliga.

## Precisão de fechamento

Ao desenhar um cômodo, se o traço voltar a menos de 12 px do nó inicial, o polígono fecha reusando o nó inicial. Não há tolerância de fechamento em milímetros — o fechamento é sempre exato, por reuso de nó.

Isso significa que a soma das medidas digitadas pode não fechar perfeitamente. Nesse caso, o último segmento é ajustado para fechar, e a UI avisa o desvio:

> Fechou com 4 cm de diferença do que você digitou. O último trecho foi ajustado.

O aviso desaparece sozinho após 6 segundos e não bloqueia nada.

## Critérios de aceitação

- [ ] `parseLength('320')` → 3200; `parseLength('3,20')` → 3200; `parseLength('3200mm')` → 3200
- [ ] Área de polígono `(0,0) (3200,0) (3200,2500) (0,2500)` é 8.000.000 mm²
- [ ] Shoelace de ciclo em sentido anti-horário retorna área positiva após normalização
- [ ] Snap a nó existente dentro da tolerância devolve `merged` com o id do nó
- [ ] Ponto médio de aresta preenche `targets` mas deixa `merged = null`
- [ ] Duas restrições de reta com ângulo < 15° descartam a de menor prioridade
- [ ] Tolerância de snap respeita clamping em mm, independente da escala da câmera
- [ ] `Alt` pressionado faz o resolvedor devolver o ponto de entrada sem alteração
- [ ] SAT detecta sobreposição entre dois retângulos rotacionados 30° e 60° com centros a 400 mm
- [ ] Property test: para qualquer polígono simples gerado, área calculada por shoelace é igual à soma das áreas dos triângulos da sua triangulação por fan
- [ ] Property test: para qualquer sequência de comprimentos digitados, o polígono resultante fecha (primeiro nó igual ao último)
