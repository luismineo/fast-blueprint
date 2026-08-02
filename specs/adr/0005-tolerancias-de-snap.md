# ADR-0005 — Tolerâncias de snap medidas no protótipo

**Status:** Aceita
**Data:** 2026-08-01
**Supersede:** A tabela de tolerâncias em mm de `adr/0003-modelo-de-snap.md`. O modelo de três classes daquela ADR permanece integralmente em vigor — o que muda aqui são três números.

## Contexto

A ADR-0003 fecha com uma ressalva explícita:

> Os limites em mm [min, max] são ponto de partida a validar no protótipo do resolvedor de snap. Não são derivados de fórmula — são o que parece razoável para uso com mouse em tela de ~100 DPI. O protótipo com a fixture `apto-44m2` vai confirmá-los ou ajustá-los antes que qualquer outra linha de código dependa deles.

Esta ADR é essa validação. Ela foi feita no M2, dirigindo o aplicativo no navegador, e o resultado é que os limites precisam subir.

**O que quebrou.** Desenhar um cômodo adjacente clicando no canto compartilhado do vizinho não funciona com mouse. A âncora de nó tem tolerância de 12 px de tela, limitada a 30 mm. O limite em mm é convertido de volta para tela pela escala da câmera, e no zoom de trabalho ele domina:

| Zoom | Escala (px/mm) | Tolerância aplicada | Em pixels de tela |
|---|---|---|---|
| Documento vazio enquadrado (10 × 10 m) | 0,060 | 30 mm (cortada) | **1,8 px** |
| `apto-44m2` enquadrado | 0,126 | 30 mm (cortada) | **3,8 px** |
| Um cômodo de 3,20 m na tela toda | 0,40 | 30 mm (no limite) | 12,0 px |
| Zoom aproximado | 1,00 | 12 mm (não cortada) | 12,0 px |

O teto de 30 mm só deixa de cortar a partir de 0,40 px/mm — zoom em que 3,20 m já ocupam 1280 px, ou seja, mais que a largura útil da tela. **Em todo zoom que mostra um cômodo inteiro, a área clicável de um nó é de um a quatro pixels.**

**Por que os testes não pegaram.** O critério de aceitação de `03-ferramentas-e-interacao.md` — "desenhar dois retângulos adjacentes com snap a nó produz documento com 6 nós, não 8" — passa. Ele passa porque o teste desenha por entrada numérica, que produz a coordenada exata do nó vizinho: distância zero, dentro de qualquer tolerância. O caminho que falha é o do mouse, que nenhum teste de unidade percorre.

É o mesmo padrão do post-mortem do M1: suíte verde, aplicativo inutilizável, porque o teste não atravessa a fronteira onde o defeito mora.

## Decisão

Os tetos em mm das Classes 1 e 2 sobem para valores que não cortam no zoom de trabalho. O piso e as tolerâncias em pixels não mudam.

| Classe | Alvo | Antes | Agora |
|---|---|---|---|
| 1 | Âncora de ponto (nó, ponto médio) | 12 px, [2, **30**] mm | 12 px, [2, **200**] mm |
| 2 | Restrição de reta | 8 px, [2, **40**] mm | 8 px, [2, **250**] mm |
| 3 | Grid | 6 px, [1, **50**] mm | 6 px, [1, **300**] mm |

Com 200 mm, a âncora de nó entrega os 12 px cheios em qualquer zoom acima de 0,06 px/mm — que é o zoom do documento vazio, o mais aberto que o aplicativo abre sozinho.

**O teto continua existindo, e não é decoração.** Sem ele, em zoom muito aberto os 12 px viram metros de mundo e o cursor passa a agarrar nós do outro lado do apartamento. Com 200 mm, o pior caso é agarrar um nó a 20 cm — a espessura de uma parede, distância em que o usuário de fato quis aquele nó.

**A Classe 3 tem um segundo teto, estrutural, que não muda.** A tolerância de grid é limitada também a `gridSize / 2`, porque além de meia célula todo ponto teria um ponto de grid dentro da tolerância e o snap deixaria de significar coisa alguma. Com o `gridSize` default de 100 mm, esse teto de 50 mm continua sendo o que vale, e subir a constante de 50 para 300 só tem efeito em documentos com grid grande. A constante sobe assim mesmo para as três ficarem coerentes entre si.

## Consequências

**Positivas.** Desenhar cômodos adjacentes com o mouse passa a funcionar, que é o gesto central de ADR-0002 — nós compartilhados são o que faz mover uma parede atualizar os dois cômodos. O ponto médio de aresta, que entrou no M2, fica alcançável pelo mesmo motivo.

**Negativas.** Em cenas densas o cursor agarra nó com mais facilidade, e alcançar uma posição livre a menos de 20 cm de um nó existente exige `Alt`. A tecla já existe para isso (`02-unidades-e-geometria.md` § Modificadores) e já está testada.

**Neutras.** Nenhuma estrutura muda: três classes, mesma ordem, mesma exclusividade da Classe 1, mesmo `SnapResult`. Ferramentas e renderer não sabem que os números mudaram.

## Alternativa rejeitada — tolerância em pixels pura na Classe 1

Remover o teto em mm da âncora de nó e deixar só os 12 px resolveria o caso do zoom de trabalho sem nenhum número novo. Foi rejeitada porque o teto é o que protege o zoom aberto: a 0,01 px/mm — que a câmera permite, o limite é 0,005 — 12 px são 1200 mm, e o cursor agarraria um nó a mais de um metro. O teto certo não é nenhum; é um maior que 30 mm.

## Critérios de aceitação

- [ ] Em escala 0,06 px/mm, um clique a 10 px de um nó existente dispara a âncora de nó
- [ ] Em escala 0,01 px/mm, um clique a 500 mm de um nó existente **não** dispara a âncora de nó
- [ ] Desenhar dois cômodos adjacentes clicando no canto compartilhado produz 6 nós, não 8, no zoom em que os dois cabem na tela
