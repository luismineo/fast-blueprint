# Prompt 01 — Milestone

Template reutilizável. Um milestone por sessão, com portão de plano. Rode em plan mode.

---

## Template

```
Implemente o {MILESTONE} de specs/09-roadmap.md.

LEIA ANTES
  {SPECS_RELEVANTES}
  specs/plans/{PLANO_ANTERIOR}.md, para saber o que já existe e por quê.

ESCOPO
  {LISTA_DO_ROADMAP}

FORA DE ESCOPO
  {O_MILESTONE_SEGUINTE}
  Não crie abstração para necessidade futura. Se o milestone seguinte vai
  precisar de generalização, ela entra no milestone seguinte.

ANTES DE CODAR
  Apresente o plano, contendo:
    - a ordem das tarefas e por que essa ordem
    - para cada tarefa: arquivos tocados, e qual critério de aceitação da
      spec ela satisfaz, citado por spec e número
    - os critérios de aceitação que este milestone NÃO satisfaz, e em qual
      milestone eles caem
    - as decisões que você teve que tomar porque a spec não dizia
  Pare e aguarde. Não grave arquivo e não comece a implementar.

DEPOIS DE APROVADO
  Primeira ação: gravar o plano aprovado em specs/plans/{SLUG}.md,
  em commit próprio, antes de qualquer código.
  Depois, uma tarefa por commit.
  Teste antes da implementação quando o critério de aceitação já descreve
  o comportamento — a spec já escreveu o teste, transcreva.
  pnpm typecheck && pnpm test && pnpm depcruise verdes antes de cada commit.

CRITÉRIO DE ENCERRAMENTO
  Todo critério de aceitação de {SPECS_RELEVANTES} que caia no escopo passa
  como teste automatizado. Ao terminar, liste cada critério e o teste que o
  cobre, num arquivo specs/plans/{SLUG}-cobertura.md.

QUANDO PARAR E PERGUNTAR
  - Spec ambígua ou contraditória. Não resolva inventando.
  - Um critério de aceitação que você acha errado. Diga por quê; não o ignore
    nem o reescreva sozinho.
  - Necessidade de dependência nova.
  - Necessidade de violar a direção de dependência de specs/08. Isso nunca é
    a resposta certa; é sinal de que algo está no pacote errado.

REGRAS PERMANENTES
  Zero comentário em código de produção.
  Domínio em milímetro inteiro. Float em coordenada de nó é bug.
  Nenhum componente .svelte com cálculo geométrico.
  Nenhuma mutação de documento fora de um comando.
  Nenhuma alocação dentro de um pass de render.
```

---

## Instância preenchida: M1

O milestone que decide o produto. Se o fluxo de desenho não convence aqui, nada depois salva.

```
Implemente o M1 — Desenhar e medir, de specs/09-roadmap.md.

LEIA ANTES
  specs/01-modelo-de-dominio.md
  specs/02-unidades-e-geometria.md
  specs/03-ferramentas-e-interacao.md, seção "Ferramenta Cômodo"
  specs/04-renderizacao.md, passes 4, 7, 9, 10
  specs/08-arquitetura.md
  specs/adr/0002-modelo-geometrico.md
  specs/plans/m0-esqueleto.md

ESCOPO
  core/model com schema Zod, invariantes e validateDocument
  Comandos CreateRoom, DeleteRoom, RenameRoom
  Histórico com produceWithPatches do Immer
  Resolvedor de snap: nó, eixo, grid (só esses três nesta etapa)
  Ferramenta Cômodo completa, com entrada numérica e HUD
  Passes de render: roomFills, walls, dimensions, roomLabels
  Cálculo de área e perímetro, com seletores memoizados

FORA DE ESCOPO
  Ferramenta Selecionar, arrastar nó, editar aresta — isso é M2.
  Snap de ponto médio, aresta, extensão e alinhamento — M2.
  Mobília, catálogo, persistência.
  Painel de propriedades além do resumo do documento.

ANTES DE CODAR
  Apresente o plano conforme o template acima. Depois de aprovado ele vira
  specs/plans/m1-desenhar-e-medir.md.

  Inclua explicitamente a sua leitura da máquina de estados da Ferramenta
  Cômodo: os estados, as transições, e o que acontece em cada uma das três
  formas de confirmar um segmento. Se a spec deixou alguma transição
  indefinida, liste — provavelmente deixou.

  Mostre o plano e pare.

CRITÉRIO DE ENCERRAMENTO
  Além dos critérios de aceitação de specs/01, specs/02 e specs/03:

  1. A sequência R, clique, "320 Enter", "250 Enter", "320 Enter", C
     produz um cômodo de exatamente 3200 x 2500 mm, área 8,00 m², cotado
     nos quatro lados. Isto é um teste de integração, não manual.

  2. Os property tests de specs/10 relativos a área, fechamento e
     invertibilidade de comando existem e passam com 200 runs.

  3. Você autora specs/fixtures/apto-44m2.planta.json usando o próprio app,
     com as medidas de specs/fixtures/README.md. Se não der para autorar a
     fixture pelo app, o milestone não terminou — o objetivo do M1 é
     exatamente essa capacidade.

  4. A área útil da fixture bate com a planta legal dentro de 0,50 m².
     Se não bater, investigue antes de afrouxar a tolerância. Afrouxar
     tolerância para o teste passar é a coisa errada a fazer.

  Ao terminar, além do arquivo de cobertura, escreva em uma página o que a
  spec 03 errou. Você acabou de implementar a máquina de estados; você sabe
  onde ela é desconfortável. Não seja diplomático.
```

---

## Nota sobre o item 3 do M1

Fazer o agente autorar a fixture pelo próprio app, em vez de escrever o JSON à mão, é o único critério aqui que não dá para falsificar acidentalmente. Um agente consegue escrever código que passa em teste de unidade e mesmo assim entrega um fluxo de desenho intragável. Não consegue autorar uma planta de sete cômodos por esse fluxo sem que ele funcione de verdade.

Vale replicar esse padrão nos milestones seguintes: sempre que possível, o critério de encerramento é o agente **usar** o que construiu, não descrever.