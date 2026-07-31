# ADR-0002 — Modelo geométrico: parede sem espessura, cômodo como ciclo

**Status:** Aceita
**Data:** 2026-07-30

## Contexto

Um editor de planta baixa precisa decidir duas coisas antes de qualquer código:

1. Parede tem espessura?
2. Cômodo é desenhado explicitamente ou detectado a partir das paredes?

As duas decisões definem o modelo de dados, o fluxo de desenho e o teto de complexidade do produto.

## Decisão 1 — Parede é uma linha, sem espessura

## Justificativa

**É o que a trena mede.** O usuário-alvo mede face interna a face interna. Ele não sabe, e não tem como saber, se a parede tem 12 cm de bloco cerâmico com 2 cm de reboco de cada lado. Pedir espessura é pedir um dado que ele não tem.

**Não muda a decisão que ele está tomando.** A pergunta é "cabe a cama com circulação?". A resposta depende do vão interno, que é exatamente o que ele mediu. Espessura de parede só importa para área construída e para obra.

**Espessura infecta todo o modelo.** Com espessura vêm: eixo versus face, junção de paredes de espessuras diferentes, mitragem de canto, offset de polígono, e a distinção entre área de piso e área de eixo. Cada uma dessas é uma fonte de bug e uma decisão que o usuário passa a ter que tomar.

## Consequência aceita

As áreas do Planta não batem com as da planta legal da construtora. Para o apartamento de referência, a divergência fica na casa de 0,1 a 0,3 m² por cômodo.

Isso é documentado como comportamento esperado, com tolerância explícita nos testes (`10-testes.md`), e mencionado no README. Não é bug e não será "corrigido".

## Decisão 2 — Cômodo é um ciclo de nós desenhado explicitamente

Um `Room` referencia uma lista ordenada de `NodeId`. As arestas do ciclo **são** as paredes daquele cômodo. Não existe entidade de parede separada para elas.

Nós são compartilhados entre cômodos adjacentes, então mover um canto move os dois cômodos.

## Alternativa rejeitada — detecção automática de faces

O usuário desenharia paredes soltas e o app extrairia os cômodos como faces mínimas de um grafo planar (estrutura half-edge, escolhendo em cada vértice a aresta mais à direita).

Elegante, e é o que o SweetHome3D e ferramentas similares fazem. Rejeitada para a v1 por três motivos:

**Exige subdivisão planar.** Toda interseção de segmentos precisa ser detectada e virar nó. Fazer isso de forma robusta com aritmética inteira é trabalho real, e fazer errado produz cômodo fantasma.

**O modo de falha é opaco.** Quando o usuário deixa um vão de 3 mm entre duas paredes, o cômodo simplesmente não aparece, e nada na tela explica por quê. Depurar topologia é tarefa de quem escreveu o algoritmo, não de quem está desenhando a própria sala.

**Não é como a pessoa pensa.** O usuário mediu **cômodo por cômodo**: "o quarto tem 3,20 por 2,50". Ele não mediu um conjunto de paredes do qual cômodos emergem. Desenhar cômodo por cômodo é o mapeamento direto do que está anotado no celular dele.

Face detection continua sendo o caminho certo para plantas complexas com muitas paredes internas, e pode entrar depois como modo alternativo. Não é o caminho certo para reproduzir sete retângulos.

## Paredes avulsas

A entidade `Wall` existe para segmentos que não delimitam cômodo: divisória parcial, bancada de cozinha, guarda-corpo de varanda. São segmentos simples, sem participação em nenhum ciclo, e não afetam cálculo de área.

## Aberturas ancoradas a aresta

`Opening` guarda `EdgeRef` mais `offset` ao longo da aresta, não coordenada absoluta. Assim uma porta continua na mesma posição relativa quando o cômodo é redimensionado.

É o comportamento que o usuário espera: mudar a medida da parede não deve fazer a porta escapar dela.

## Consequências

**Positivas.** Modelo simples o bastante para caber na cabeça. Fluxo de desenho que espelha como a medição foi feita. Fechamento exato por reuso de nó, sem tolerância de tolerância. Área trivial de calcular e sem ambiguidade. Nada de aritmética de interseção robusta na v1.

**Negativas.** Cômodos adjacentes precisam ser desenhados com snap aos nós existentes, ou ficam desconectados — mitigado pelo snap a nó ser a primeira prioridade do resolvedor. Sobreposição de cômodos é possível, e só gera aviso (W2). Paredes internas espessas não são representáveis, por decisão.

**Neutras.** A representação como ciclo de nós é justamente a saída que um algoritmo de detecção de faces produziria. Se a detecção automática entrar depois, ela alimenta o mesmo modelo, sem migração.
