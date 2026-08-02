# ADR-0006 — Glifos de mobília como dados declarativos

**Status:** Aceita
**Data:** 2026-08-02
**Supersede:** Nada. Estende `04-renderizacao.md` § Mobília e `06-catalogo-de-mobilia.md` § Painel.

## Contexto

O M3 desenha todo móvel como retângulo com rótulo e marca de orientação. Funciona, e a planta é legível — mas só depois de ler os rótulos. Um símbolo de planta baixa (cama com travesseiros, vaso com bacia, fogão com bocas) é reconhecível de relance, e "de relance" é o que a `00-visao-e-escopo.md` § Proposta de valor promete: testar arranjos, não decifrá-los.

A pergunta desta ADR não é *se* vale desenhar símbolos, e sim **onde a forma mora** e **quanto do contrato de desenho ela quebra**. Cinco restrições existentes decidem quase tudo:

1. **`renderer` não pode importar `catalog`** (`08-arquitetura.md` § Pacotes, verificado por `dependency-cruiser`). É a mesma restrição que obrigou o campo `outline` a existir no documento em vez de ser derivado da categoria.
2. **`DrawTarget` tem oito primitivas e nenhuma curva** (`04-renderizacao.md` § DrawTarget). Toda primitiva nova é obrigação para o backend SVG do M4 — foi por isso que a hachura de colisão do M3 virou segmentos recortados em vez de `pattern` + `clip`.
3. **Nenhuma alocação dentro de um pass** (`04-renderizacao.md` § Orçamento de performance, regra 2), com orçamento de 8 ms.
4. **Nenhuma cor fora de `renderer/theme.ts`** (`04-renderizacao.md` § Tokens visuais).
5. **Toda dimensão é editável após inserir** (`06-catalogo-de-mobilia.md` § Objetivo). Uma cama queen de catálogo mede 1580 × 1980, mas o usuário digita 1600 × 2000 porque foi isso que a trena deu. O desenho precisa valer para a medida digitada, não para a de catálogo.

A restrição 5 é a que elimina a solução óbvia. "Imagem vetorizada" sugere um arquivo por móvel; um arquivo por móvel tem dimensão fixa, e a `06` já registrou por escrito por que 60 arquivos SVG mantidos em sincronia com as medidas é um custo que não queremos pagar.

## Decisão

Um **glifo** é geometria declarativa normalizada, vive no pacote `catalog` como dado, e é entregue ao renderer pelo `app`.

### 1. Caixa unitária, não medida absoluta

O glifo é definido em `[0,1]² ` no referencial local do móvel: `(0,0)` é o canto traseiro esquerdo, `(1,1)` o canto frontal direito. `y` cresce da parede para dentro do cômodo, seguindo `depth` (`06-catalogo-de-mobilia.md` § Convenção de orientação).

O renderer escala por `width × depth` do **item no documento**, não do item de catálogo. Redimensionar o móvel redesenha o símbolo na medida nova, de graça.

**Coordenada de glifo é fracionária, e isso não é o bug que a regra permanente descreve.** "Float em coordenada de nó é bug" fala de coordenada de domínio, que é milímetro inteiro. Um glifo não tem coordenada de domínio: ele tem proporção, e proporção é adimensional. A distinção está escrita aqui porque o próximo agente que ler um `0.18` num arquivo de glifo vai querer "consertá-lo".

### 2. Escala não uniforme é feature, não defeito

Escalar por `width` e `depth` separadamente distorce o glifo quando o móvel não é quadrado. Em vez de ser um problema a corrigir, é o mecanismo que produz o desenho certo: um círculo desenhado na caixa unitária de um vaso sanitário (380 × 700) vira a elipse que uma bacia de fato é, e o mesmo círculo na caixa de uma mesa redonda (1100 × 1100) continua círculo.

Onde a distorção incomodaria — travesseiro de cama que fica retangular quando o usuário digita 1600 em vez de 1580 — a diferença é de poucos por cento, invisível na escala de planta.

### 3. Curva é achatada pelo renderer; `DrawTarget` não cresce

O glifo pode declarar arco. O renderer achata arco em polilinha dentro do próprio pass, com `writeArcPoints` em `core/geometry` — a mesma forma de `writeObbCorners`, escrevendo num buffer pré-alocado.

Nenhuma primitiva nova entra em `DrawTarget`. As três razões, em ordem de peso:

- **Escala não uniforme mataria o `arc` de qualquer jeito.** `ctx.arc` desenha círculo; expressar o resultado da decisão 2 exigiria `ellipse` com rotação, que é a adição mais cara das três candidatas, não a mais barata.
- **O backend SVG é do M4, que é o próximo milestone.** Cada primitiva não adicionada agora é uma a menos para implementar duas vezes daqui a pouco.
- **O achatamento é geometria pura**, testável em `core` sem canvas, contra o mesmo `RecordingTarget` que já é o oráculo de render.

O custo aceito é que um círculo exportado em SVG sai como polígono de 24 lados. Na escala de impressão de planta a flecha é submilimétrica; quem ampliar 10× num editor vetorial vai ver as facetas. É um preço menor que uma primitiva a mais em três backends.

**Isto não decide o M6.** O arco de abertura de porta (`04-renderizacao.md`, pass 7) é arco de verdade em espaço de mundo com escala uniforme, e pode muito bem justificar `arc` em `DrawTarget`. Aquela decisão é do M6, tomada com aquele caso na mão.

### 4. Só traço, sem preenchimento

Primitivas de glifo são desenhadas como linha, nunca como área preenchida. O corpo do móvel já dá o preenchimento (`04-renderizacao.md` § Mobília); o glifo é o desenho por cima.

Isso resolve a restrição 4 sem nenhuma regra nova: um glifo não tem cor porque não tem nada que possa receber cor. O renderer usa um único token para todo traço de glifo, como já faz com `OverlayPrimitive` e papel semântico.

### 5. O `app` resolve; o documento não carrega

`RenderContext` ganha um mapa `catalogId → FurnitureGlyph`, montado pelo `app`, que é o único pacote que enxerga `catalog` e `renderer` ao mesmo tempo. O renderer olha `item.catalogId` e consulta o mapa; sem entrada, desenha o retângulo de hoje.

O glifo **não** vai para o documento, e isso é uma diferença deliberada em relação ao campo `outline`:

| | `outline` | glifo |
|---|---|---|
| O que é | Semântica: o item não tem massa física | Apresentação: como o item é desenhado |
| Muda cálculo? | Sim — ocupação, colisão, contenção | Não |
| Precisa sobreviver ao arquivo? | Sim, senão o cálculo muda ao reabrir | Não |
| Melhorar depois alcança arquivos antigos? | Irrelevante | Sim, e só se não estiver congelado no arquivo |

Congelar o desenho no arquivo faria um glifo corrigido em v1.2 não chegar a nenhuma planta salva antes. Resolver no render faz.

### 6. Glifo por família, não por item

`bed` serve às seis camas, `sofa` aos três sofás e à poltrona. O item de catálogo referencia um glifo por id (`glyph: "bed"`); vários itens referenciam o mesmo. Vinte e um glifos cobrem 43 dos 55 itens do catálogo default (`06-catalogo-de-mobilia.md` § Glifos), e os 12 restantes — criado-mudo, rack, micro-ondas, mesa de centro — são retângulos na vida real e continuam retângulos na tela.

## Consequências

**Positivas.** A planta fica legível sem rótulo. O mesmo dado alimenta a miniatura do painel de catálogo, que hoje é um retângulo proporcional: uma fonte, dois consumidores. O catálogo continua "puramente em dados", que era o motivo declarado da `06` para não ter assets. Acrescentar glifo depois é acrescentar dado, sem tocar em código nem em spec.

**Negativas.** Vinte e um glifos a desenhar e manter à mão — pequeno, mas real. Cada frame passa de ~1 primitiva por móvel para até ~20, o que exige a regra de nível de detalhe (`04-renderizacao.md` § Mobília) para não virar ruído em zoom aberto nem custo em cena densa. E o SVG exportado tem círculo facetado.

**Neutras.** `DrawTarget`, o formato de arquivo e o modelo de domínio não mudam. Um documento salvo antes e depois desta ADR é byte a byte o mesmo.

## Alternativa rejeitada — arquivos SVG por item

Um `.svg` por móvel, importado como asset. Rejeitada por três motivos independentes, qualquer um bastando: dimensão fixa contra a restrição 5; 55 arquivos em sincronia manual com as medidas, que a `06` já rejeitou uma vez; e `path` com bézier exigiria um parser de SVG dentro do renderer, já que `DrawTarget` não tem curva — ou seja, o formato mais próximo de "vetorial" é o mais distante do que o renderer sabe desenhar.

## Alternativa rejeitada — campo de forma no `FurnitureItem`

Guardar o glifo no documento, como o `outline`. Rejeitada pela tabela da decisão 5: congela apresentação em dado persistido e infla todo item com geometria que não muda cálculo nenhum.

## Alternativa rejeitada — `ellipse` em `DrawTarget`

Primitiva capaz de expressar o resultado da escala não uniforme. Rejeitada porque é a adição mais cara (centro, dois raios, rotação, dois ângulos) para o benefício de não achatar 24 pontos que o renderer já sabe calcular, e porque o backend SVG do M4 pagaria a conta.

## Critérios de aceitação

- [ ] Todo glifo do catálogo default valida contra o schema: coordenada em `[0,1]`, no máximo 48 primitivas
- [ ] O mesmo glifo desenhado numa cama 1580 × 1980 e numa 1600 × 2000 produz a mesma contagem de primitivas, em posições proporcionais
- [ ] Círculo de glifo em item não quadrado sai como elipse com os semieixos na proporção `width : depth`
- [ ] Móvel sem glifo (item de usuário, `catalogId: null`) desenha exatamente o retângulo do M3
- [ ] Nenhuma alocação por frame no pass de mobília com 40 móveis com glifo (bench)
- [ ] `DrawTarget` continua com as mesmas oito primitivas depois do milestone
