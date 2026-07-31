# 00 — Visão e escopo

## Problema

Planejar um apartamento pequeno exige testar layouts: cabe uma cama queen com circulação de 60 cm dos dois lados? O sofá de 1,60 m deixa passagem até a varanda? Hoje as opções são CAD (complexo, curva de aprendizado alta, pago), planners de loja (fechados, presos ao catálogo da loja) ou papel quadriculado.

Falta a ferramenta do meio: você mediu as paredes com trena, quer digitar essas medidas e arrastar retângulos.

## Usuário

Uma pessoa planejando o próprio apartamento. Sabe usar computador, não sabe usar CAD, e não quer aprender. Tem uma lista de medidas anotadas no celular.

## Proposta de valor

Reproduzir a planta do seu apartamento em menos de 10 minutos, digitando as medidas que você anotou, e a partir daí testar quantos arranjos de mobília quiser.

## Princípios de design

1. **Medida digitada vence mouse.** O mouse escolhe direção, o teclado define comprimento. Nunca se exige precisão de pixel do usuário.
2. **Sem espessura de parede.** Parede é uma linha. É o que a trena mede (face a face) e é o suficiente para decidir layout.
3. **Zero configuração inicial.** Abre e desenha. Sem escolher escala, formato de papel, template ou sistema de unidades.
4. **Erro é reversível.** Undo ilimitado. Nada de diálogo de confirmação.
5. **Densidade de feature é custo.** Cada botão na tela precisa se justificar contra o princípio 1.

## Escopo v1

- Desenhar cômodos como polígonos fechados, com comprimento de aresta digitado
- Snap a nós, arestas, eixos e grid
- Editar geometria: mover nós, editar comprimento de aresta, renomear cômodo
- Área por cômodo, perímetro por cômodo, área útil total
- Mobília a partir de catálogo, com dimensões editáveis, rotação e snap a parede
- Salvar/abrir arquivo `.planta.json`
- Exportar PNG e SVG
- Rodar em `localhost` no browser e como app desktop

## Fora de escopo (v1)

| Item | Motivo |
|---|---|
| Espessura de parede | ADR-0002. Não muda decisão de layout em apê pequeno |
| 3D | Multiplica complexidade de render e de modelo, não ajuda a decidir layout |
| Portas e janelas | Chega na v1.5. Útil, mas não bloqueia o valor central |
| Múltiplos pavimentos | Apartamento é um pavimento |
| Elétrica, hidráulica, forro | Domínio de projeto executivo, não de planejamento |
| Colaboração, nuvem, contas | O arquivo é local. É uma feature, não uma limitação |
| Cotas manuais desenháveis | Cotas são derivadas automaticamente da geometria |
| Impressão em escala | v2. Exportar SVG resolve a maioria dos casos |

## Não-objetivos permanentes

O Planta nunca será um substituto de CAD para projeto executivo. Se um usuário precisa de espessura de parede, tolerâncias construtivas ou pranchas cotadas para obra, a resposta correta é "use QCAD ou FreeCAD".

## Índice de specs

| Spec | Cobre |
|---|---|
| `00-visao-e-escopo.md` | Este documento. Escopo, princípios, não-objetivos |
| `01-modelo-de-dominio.md` | Entidades, relações, invariantes |
| `02-unidades-e-geometria.md` | Milímetros, área, snap, algoritmos |
| `03-ferramentas-e-interacao.md` | Cada ferramenta, atalhos, máquinas de estado |
| `04-renderizacao.md` | Camadas de desenho, câmera, orçamento de performance |
| `05-formato-de-arquivo.md` | Schema do `.planta.json`, migrações, export |
| `06-catalogo-de-mobilia.md` | Estrutura e conteúdo do catálogo |
| `07-ui-e-layout.md` | Chrome, tokens visuais, textos de interface |
| `08-arquitetura.md` | Pacotes, comandos, undo, fronteiras |
| `09-roadmap.md` | Milestones e critérios de release |
| `10-testes.md` | Estratégia, fixtures, property testing |
| `adr/` | Decisões arquiteturais |
