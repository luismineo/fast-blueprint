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

---

## Instância preenchida: M3.5

Milestone curto entre M3 e M4: troca o retângulo de móvel por símbolo de planta baixa e fecha as duas ferramentas que ficaram para trás desde o M1.

```
Implemente o M3.5 — Símbolos, parede e medida, de specs/09-roadmap.md.

LEIA ANTES
  specs/adr/0006-glifos-de-mobilia.md, inteira — é a ADR que decide onde o
  glifo mora e por que DrawTarget não ganha primitiva nova
  specs/02-unidades-e-geometria.md, seções "Snap" (Classe 1, canto de móvel),
  "Snap a parede" e "Achatamento de arco"
  specs/03-ferramentas-e-interacao.md, seções "Ferramenta Parede", "Ferramenta
  Medir", e a parte de "Selecionar" sobre Delete em parede avulsa
  specs/04-renderizacao.md, seções "DrawTarget", "Mobília" (Glifo e Nível de
  detalhe), "Cotas" (parede avulsa) e "Tokens visuais"
  specs/06-catalogo-de-mobilia.md, seção "Glifos" e o trecho de "Catálogo do
  usuário" sobre herança de glifo
  specs/07-ui-e-layout.md, "Painel de propriedades" (variante de parede) e
  "Layout" (barra sem botão desabilitado)
  specs/08-arquitetura.md, "Comandos do M3.5" e o trecho de "catalog" em
  "Pacotes"
  specs/plans/m3-mobiliar.md e specs/plans/m3-mobiliar-cobertura.md, para
  saber o que já existe e por quê — Ferramenta Cômodo, resolvedor de snap,
  hit testing, OverlayPrimitive e o pacote catalog já estão prontos; este
  milestone estende os três, não os recria.

ESCOPO
  Glifos de mobília: tipo FurnitureGlyph em core (junto de OverlayPrimitive),
    valores em catalog/data/glyphs.json
  writeArcPoints em core/geometry: arco de glifo vira polilinha no pass,
    DrawTarget não ganha primitiva
  RenderContext.glyphs, montado pelo app (renderer continua sem importar
    catalog)
  21 glifos cobrindo 43 dos 55 itens do catálogo default (tabela em specs/06
    § Glifos)
  Nível de detalhe: glifo só acima de 24x24 px de tela
  Miniatura do painel de catálogo passa a desenhar o glifo quando existe
  Herança de glifo: item de usuário sem glyph, com id colidindo com o
    default, herda o glifo do default
  Ferramenta Parede (W): máquina de estados igual à Cômodo sem fechamento
  Comandos CreateWall e DeleteWall
  Uma polilinha de parede = uma entrada de histórico
  Parede avulsa: selecionável, excluível (Delete), com cota, com
    SetEdgeLength (já existe, só precisa aceitar EdgeRef de kind 'wall')
  Móvel encosta em parede avulsa pelo snap a parede que já existe
  Ferramenta Medir (M): máquina Idle -> Dragging -> Done
  Canto de móvel como âncora de snap Classe 1, ligada só por esta ferramenta
  Ferramenta Medir não emite comando em nenhuma transição
  Barra de ferramentas: os cinco ícones ativam ferramenta, nenhum
    aria-disabled

FORA DE ESCOPO
  arc nativo em DrawTarget — decisão do M6, quando o arco de abertura de
    porta trouxer o caso que o achatamento não cobre bem.
  Export SVG e PNG dos glifos, e de resto qualquer export — M4.
  Glifo para os 12 itens que ficam sem glifo (nightstand, coffee-table etc.)
    — não é código, é dado; quem quiser acrescenta depois em glyphs.json.
  Qualquer inferência de cômodo a partir de paredes avulsas fechadas em
    polígono — fora do roadmap inteiro, não só deste milestone.
  Persistência, migração, autosave, arquivos recentes.
  Não crie abstração para necessidade futura. Se o M4 ou o M6 vão precisar
  de generalização, ela entra lá.

ANTES DE CODAR
  Apresente o plano conforme o template acima. Depois de aprovado ele vira
  specs/plans/m3-5-simbolos-parede-e-medida.md.

  Inclua explicitamente:
    - a máquina de estados da Ferramenta Parede e da Ferramenta Medir: os
      estados, as transições, e o que cada uma faz em Esc, Enter e campo
      vazio. Se a spec deixou alguma transição indefinida, liste.
    - como CreateWall trata segmento que reproduz uma parede já existente
      (specs/08 diz "omitido, resto do comando aplicado" — confirme que
      entendeu o caso e como vai testá-lo)
    - como o glifo escalado por width x depth não-uniforme afeta um arco
      (vira elipse) e onde esse cálculo mora
    - o plano para os 21 glifos: você vai desenhá-los como coordenada em
      [0,1] à mão, primitiva por primitiva. Mostre pelo menos dois exemplos
      completos (ex.: bed, toilet) no plano antes de aprovação, para eu
      avaliar o nível de detalhe antes de você desenhar os outros 19.

  Pare e aguarde. Não grave arquivo e não comece a implementar.

DEPOIS DE APROVADO
  Primeira ação: gravar o plano aprovado em
  specs/plans/m3-5-simbolos-parede-e-medida.md, em commit próprio, antes de
  qualquer código.
  Depois, uma tarefa por commit.
  Teste antes da implementação quando o critério de aceitação já descreve
  o comportamento — a spec já escreveu o teste, transcreva.
  pnpm typecheck && pnpm test && pnpm depcruise verdes antes de cada commit.

CRITÉRIO DE ENCERRAMENTO
  Além dos critérios de aceitação de specs/02, specs/03, specs/04, specs/06,
  specs/07 e specs/08 que caem no escopo acima:

  1. Um e2e desenha uma bancada com W (clique, "2400 Enter", Enter), confere
     que ela aparece com sua cota, e que uma geladeira do catálogo, inserida
     perto dela, encosta e alinha rotação — contra o build de produção, como
     os demais e2e de furniture.spec.ts.

  2. Um e2e mede a distância entre dois pontos com M, confere que o número
     fica na tela depois do pointerup, e que Esc limpa sem gastar undo
     (Ctrl+Z depois de medir desfaz o comando anterior à medição, não a
     medição).

  3. specs/fixtures/furnished.planta.json ganha pelo menos duas paredes
     avulsas, autoradas com a Ferramenta Parede dentro do próprio app (ou
     via script que dirige o app, como o bench já faz), não escritas à mão
     no JSON.

  4. Rode pnpm bench com a fixture furnished atualizada (móveis com glifo +
     paredes avulsas) e confirme que o pass de mobília continua dentro do
     orçamento de 8 ms, sem alocação por frame.

  5. Abra pnpm dev, insira uma cama, um vaso e um sofá do catálogo, e
     confirme visualmente que os três são reconhecíveis sem ler o rótulo.
     Isto é o critério que a spec 00 promete e nenhum teste automatizado
     prova sozinho — registre no arquivo de cobertura que foi conferido à
     mão e o que você viu.

  Ao terminar, liste cada critério e o teste que o cobre em
  specs/plans/m3-5-simbolos-parede-e-medida-cobertura.md.

QUANDO PARAR E PERGUNTAR
  - Spec ambígua ou contraditória. Não resolva inventando.
  - Um critério de aceitação que você acha errado. Diga por quê; não o ignore
    nem o reescreva sozinho.
  - Necessidade de dependência nova.
  - Necessidade de violar a direção de dependência de specs/08. Isso nunca é
    a resposta certa; é sinal de que algo está no pacote errado.
  - Se desenhar algum dos 21 glifos exigir mais de 48 primitivas ou revelar
    que a caixa unitária não basta (por exemplo, um detalhe que precisaria
    de coordenada fora de [0,1]), pare — é sinal de que o limite do schema
    está errado, não que o glifo deve ser aproximado.

REGRAS PERMANENTES
  Zero comentário em código de produção.
  Domínio em milímetro inteiro. Float em coordenada de nó é bug — mas
  coordenada de glifo é fração em [0,1], não coordenada de nó, e não é bug
  (adr/0006-glifos-de-mobilia.md).
  Nenhum componente .svelte com cálculo geométrico.
  Nenhuma mutação de documento fora de um comando.
  Nenhuma alocação dentro de um pass de render.
```