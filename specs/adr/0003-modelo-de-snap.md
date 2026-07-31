# ADR-0003 — Modelo de snap: três classes, não lista linear

**Status:** Aceita
**Data:** 2026-07-30
**Supersede:** Substitui a seção "Snap" de `specs/02-unidades-e-geometria.md`

## Contexto

A especificação original de snap em `specs/02` organizava os alvos de snap como uma lista linear de prioridade: nó, ponto médio, aresta, extensão, eixo, alinhamento, grid. O primeiro que casasse dentro da tolerância vencia.

Essa estrutura esconde dois modos de operação diferentes: snaps que produzem um ponto exato (nó, ponto médio) e snaps que restringem o ponto a uma reta (aresta, extensão, eixo, alinhamento). Tratá-los como iguais na mesma lista força cenários onde o tipo errado dispara primeiro.

O caso concreto que quebrou o modelo linear: desenhar um cômodo adjacente a um existente. O usuário ancora no nó do cômodo vizinho, move o mouse para a direita, digita `320`. O snap de eixo (#5) dispara e alinha a direção a 90°. Mas se houver um nó a 10 px do cursor — o nó inicial do próprio traço — o snap de nó (#1, prioridade máxima) dispara primeiro, e o eixo é ignorado. O usuário não consegue traçar um segmento horizontal a partir de um nó existente.

A alternativa de tratar eixo como pré-filtro (restringir o ponto ao eixo antes de avaliar âncoras) foi considerada e **rejeitada** — ver seção "Alternativa rejeitada" abaixo.

## Decisão

O resolvedor de snap opera em **três classes**, avaliadas em ordem. Cada classe tem regras internas de seleção.

### Classe 1 — Âncora de ponto

Alvos: **nó existente**, **ponto médio de aresta**.

Produz um ponto exato. É **exclusiva**: se qualquer âncora de ponto disparar, a mais próxima do cursor vence e **nenhuma restrição de reta é aplicada depois**. O ponto retornado é a coordenada exata do alvo, sem projeção.

`merged` é preenchido **apenas** quando a âncora vencedora foi um nó. Ponto médio preenche `targets` mas deixa `merged = null`.

Tolerância: 12 px de tela, limitada a [2, 30] mm. Se múltiplas âncoras disparam, a mais próxima em mm (distância euclidiana ao cursor) vence.

### Classe 2 — Restrição de reta

Alvos: **projeção sobre aresta**, **extensão de aresta**, **eixo a partir da origem do traço**, **alinhamento com nó existente**.

Cada alvo que dispara restringe o ponto a uma reta. O resultado depende de quantas dispararam:

| Restrições | Comportamento |
|---|---|
| 0 | Cai para Classe 3 (grid) |
| 1 | Projeta o ponto do cursor sobre a reta da restrição |
| 2 ou mais | Intercepta as duas de maior prioridade |

Prioridade entre restrições (maior para menor):

1. Eixo a partir da origem do traço
2. Alinhamento com nó existente
3. Projeção sobre aresta
4. Extensão de aresta

Quando duas ou mais restrições disparam, as duas de maior prioridade são selecionadas. Se o ângulo absoluto entre as retas for **menor que 15°**, a de menor prioridade é descartada e o ponto é projetado sobre a reta restante (evita instabilidade numérica na interseção de retas quase paralelas). Caso contrário, calcula-se a interseção das duas retas.

Se a interseção cair fora do segmento (no caso de aresta/extensão) ou fora da tolerância de 40 mm do ponto original do cursor, o ponto é projetado sobre a restrição de maior prioridade.

Tolerância: 8 px de tela, limitada a [2, 40] mm.

### Classe 3 — Grid

Fallback. Só é avaliada se **nenhuma** restrição de reta disparou, e só se o grid está ligado (`G`).

Arredonda cada coordenada para o múltiplo mais próximo de `meta.gridSize`.

Tolerância: 6 px de tela, limitada a [1, gridSize/2] mm. Se a distância ao grid mais próximo exceder `gridSize/2`, o grid não dispara e o ponto volta sem alteração.

### Modificadores globais

| Tecla | Efeito |
|---|---|
| `Shift` | Inclui múltiplos de 45° nos eixos da Classe 2 (além de 0°, 90°, 180°, 270°) |
| `Alt` | Desliga as três classes. O resolvedor devolve o ponto de entrada sem alteração |

### SnapResult

```ts
interface SnapResult {
  point: Point
  targets: SnapTarget[]
  merged: NodeId | null
}
```

- `targets` lista toda restrição que participou do resultado (âncora vencedora + retas que restringiram, se houver). Usado para desenhar guias visuais.
- `merged` é preenchido apenas quando a Classe 1 disparou sobre um nó existente.

### Nota sobre os valores de tolerância

Os limites em mm [min, max] são ponto de partida a validar no protótipo do resolvedor de snap. Não são derivados de fórmula — são o que parece razoável para uso com mouse em tela de ~100 DPI. O protótipo com a fixture `apto-44m2` vai confirmá-los ou ajustá-los antes que qualquer outra linha de código dependa deles.

## Alternativa rejeitada — Eixo como pré-filtro

Neste modelo, o snap de eixo seria aplicado antes da avaliação de âncoras: o ponto do cursor seria projetado sobre o eixo mais próximo, e então as âncoras de ponto seriam avaliadas sobre o ponto já restrito.

**Por que foi rejeitada:**

O caso do cômodo adjacente expõe o problema. Ao desenhar o segundo cômodo encostado no primeiro, o usuário ancora no nó compartilhado e move o mouse para a direita. Se o eixo é pré-filtro, o ponto é projetado sobre a reta horizontal que passa pelo nó. Depois, a âncora de nó é avaliada sobre essa reta — e como o ponto já está exatamente sobre a reta, o nó mais próximo ao longo dela pode ser o nó inicial do próprio traço, e não o nó do cômodo vizinho que o usuário pretendia referenciar. O snap gruda no lugar errado.

Com o modelo de três classes, o fluxo correto é: o cursor está próximo de um nó existente → Classe 1 dispara → o ponto é o nó exato → Classe 2 nunca é avaliada. O segmento parte do nó correto, e a direção do mouse (com ou sem eixo) define apenas o próximo ponto.

O pré-filtro também tem um problema conceitual: ele acopla o modificador de direção a toda a avaliação de snap, quando na verdade o usuário quer coisas diferentes em momentos diferentes — às vezes quer direção travada (eixo), às vezes quer ponto exato (nó), e o modelo deve permitir que o contexto (proximidade do cursor) decida.

## Consequências

**Positivas.** O modelo reflete a intenção do usuário, não a ordem de uma tabela. Âncoras de ponto são exclusivas e previsíveis. Restrições de reta se compõem de forma bem definida. O caso do cômodo adjacente funciona sem surpresa. O protótipo pode ajustar tolerâncias sem reestruturar o algoritmo.

**Negativas.** Três classes com regras internas é mais complexo de aprender que uma lista linear — para o desenvolvedor. Para o usuário, o comportamento é mais previsível, o que é o que importa. O resolvedor também é marginalmente mais caro (duas passadas em vez de uma), mas com ~30 arestas típicas o custo é desprezível.

**Neutras.** A estrutura de classes não afeta o `SnapResult` — a interface persiste. Guias visuais continuam sendo derivadas de `targets`. O contrato com as ferramentas não muda.