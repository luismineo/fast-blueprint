# 09 — Roadmap

Milestones são verticais: cada um entrega algo utilizável de ponta a ponta. Nenhum milestone é "construir a camada X".

## M0 — Esqueleto

Monorepo pnpm com os cinco pacotes, TypeScript strict, Vite, Vitest, ESLint, `dependency-cruiser` em CI.

Canvas em tela cheia com câmera funcional: pan, zoom ancorado no cursor, grid adaptativo, escala gráfica.

**Pronto quando:** dá para navegar num grid infinito a 60 fps, e `pnpm test` roda com um teste trivial em cada pacote.

## M1 — Desenhar e medir

O coração do produto. Se este milestone acerta, o resto é preenchimento.

- `core/model`, schema Zod, invariantes, `validateDocument`
- Comandos `CreateRoom`, `DeleteRoom`, `RenameRoom` e histórico com Immer patches
- Resolvedor de snap: nó, eixo, grid
- Ferramenta Cômodo completa, com entrada numérica e HUD
- Passes de render: preenchimento, paredes, cotas, rótulo de cômodo
- Cálculo de área e perímetro

**Pronto quando:** a sequência `R`, clique, `320 Enter`, `250 Enter`, `320 Enter`, `C`, `"Quarto" Enter` produz um cômodo de 8,00 m² corretamente cotado. E quando um usuário reproduz os 7 cômodos do apartamento de referência em menos de 10 minutos, sem instrução além do estado vazio.

Este é o momento de testar com gente de verdade. Se o fluxo de desenho não convence aqui, refaça a spec `03` antes de seguir.

## M2 — Editar

- Ferramenta Selecionar completa: clique, retângulo, multisseleção
- Arrastar nó, aresta, cômodo
- `SetEdgeLength` com o diálogo de nó compartilhado
- `MergeNodes`, `SplitNode`
- Snap de ponto médio, aresta, extensão e alinhamento, com guias visuais
- Painel de propriedades para cômodo, aresta e nó
- Undo e redo com coalescência
- **Entrada de ângulo no HUD.** O campo de ângulo do HUD de desenho passa a aceitar entrada numérica (graus, 0–359, referência: eixo X positivo). No M1 o campo é somente leitura e exibe a direção pós-snap de eixo.

**Pronto quando:** dá para corrigir um erro de medida sem redesenhar o cômodo, e mover uma parede compartilhada atualiza os dois cômodos.

**Fora do M2, e para onde foi.** O plano aprovado (`plans/m2-editar.md`) registra a lista completa com o critério de aceitação de cada item. Os desvios que mudam outro milestone:

- **Barra de ferramentas** (5 ícones, roving tabindex, `Home`/`End`, `Ctrl+B`) vai para o M3. Três dos cinco botões apontariam para ferramentas que não existem antes dele. Com isso, os critérios de `03` e `07` sobre foco na barra e recolhimento do painel também caem no M3.
- **`Ctrl/Cmd+D` duplicar seleção** vai para o M3: não existe comando de duplicação em `08`, e o único caso de uso descrito é mobília.
- **Regra de lint contra literal de texto em `.svelte`** (`07`) vai para o M3. O teste de chave órfã em `messages.ts` entra no M2 e cobre o caso comum sem plugin novo.
- **Ferramenta Parede (`W`)** e os comandos `CreateWall`/`DeleteWall`, que `08` marcava como M1 e nunca foram feitos, ficaram em aberto. Alocados ao M3.5 em 02/08/2026.

## M3 — Mobiliar

- Pacote `catalog` com o catálogo default completo
- Painel de catálogo com busca, categorias e recentes
- Ferramenta Mobília: inserir, mover, rotacionar, redimensionar, duplicar
- Snap a parede
- Faixa de circulação
- Avisos de sobreposição e de móvel fora de cômodo
- Taxa de ocupação por cômodo
- Salvar móvel no catálogo do usuário
- **Barra de ferramentas** e `Ctrl/Cmd+B`, herdados do M2 (§ M2, Fora do M2). Parede e Medir entram desabilitadas
- **Regra de lint contra literal de texto em `.svelte`**, herdada do M2

**Pronto quando:** dá para responder "cabe uma cama queen com 60 cm de circulação dos dois lados no Quarto L?" em menos de um minuto.

**Fora do M3, e para onde foi.** O plano aprovado (`plans/m3-mobiliar.md`) e a cobertura (`plans/m3-mobiliar-cobertura.md`) registram a lista completa. Os desvios que mudam outro milestone:

- **Ferramenta Medir (`M`)** nunca foi alocada a milestone nenhum por este roadmap. Alocada ao M3.5 em 02/08/2026.
- **Ferramenta Parede (`W`)** e `CreateWall`/`DeleteWall` seguiram em aberto desde o M1, visíveis como botão desabilitado. Alocadas ao M3.5.
- **Export CSV com tabela de móveis** (`05` § Export) vai com o resto do export, no M4.
- **Exportar e importar o catálogo do usuário como JSON** (`06` § Catálogo do usuário) vai para o M4: depende de diálogo de arquivo, que é de lá, e não tem critério de aceitação próprio.
- **`04-6` (profiler < 8 ms com 40 móveis)** fecha só na parte do renderer, medida por bench local. A medição com canvas real depende de carregar a fixture no aplicativo, e abrir arquivo é do M4.

## M3.5 — Símbolos, parede e medida

Milestone curto, inserido entre M3 e M4 em 02/08/2026. **Não renumera nada:** M4 e M5 continuam sendo M4 e M5, e as referências a "M4" e "M6" espalhadas pelas outras specs continuam corretas. Um `.5` é mais barato que uma renumeração em cascata que erra uma referência.

Fecha as duas ferramentas que ficaram para trás e troca o retângulo de móvel por símbolo de planta baixa.

- **Glifos de mobília** (`adr/0006-glifos-de-mobilia.md`, `06-catalogo-de-mobilia.md` § Glifos)
  - Tipo `FurnitureGlyph` em `core`, valores em `catalog/data/glyphs.json`
  - `writeArcPoints` em `core/geometry`: arco vira polilinha, `DrawTarget` não cresce
  - `RenderContext.glyphs` montado pelo `app` — `renderer` continua sem enxergar `catalog`
  - Vinte e um glifos cobrindo 43 dos 55 itens do catálogo default
  - Nível de detalhe: glifo acima de 24 × 24 px de tela, retângulo abaixo
  - Miniatura do painel de catálogo passa a usar o mesmo dado
- **Ferramenta Parede (`W`)** (`03-ferramentas-e-interacao.md` § Parede)
  - Máquina de estados da Ferramenta Cômodo sem fechamento, mesmo HUD e mesmo snap
  - `CreateWall` e `DeleteWall` (`08-arquitetura.md` § Comandos do M3.5), abertos desde o M1
  - Uma polilinha é uma entrada de histórico
  - Parede avulsa selecionável, excluível, com cota e com `SetEdgeLength`
  - Móvel encosta em parede avulsa pelo snap que já existe
- **Ferramenta Medir (`M`)** (`03-ferramentas-e-interacao.md` § Medir)
  - Máquina `Idle → Dragging → Done`; a medição fica na tela até `Esc`
  - Canto de móvel como âncora de Classe 1, ligada só por esta ferramenta
  - Zero comando emitido, em toda transição
- **Barra de ferramentas sem botão desabilitado.** Os cinco ícones de `07-ui-e-layout.md` § Layout passam a apontar para cinco ferramentas que existem

**Por que aqui e não depois do M4.** O M4 implementa o backend SVG do `DrawTarget`, e toda primitiva que existir naquele momento nasce com uma implementação a mais para escrever e manter em paridade com o canvas. A decisão da ADR-0006 foi **não** acrescentar primitiva nenhuma — e essa decisão só tem valor se for tomada antes de o segundo backend existir. Somado a isso, exportar uma planta em SVG vale mais quando a planta tem símbolos e não retângulos.

**Pronto quando:** dá para bater o olho na planta e reconhecer cama, sofá, vaso e fogão sem ler rótulo; a bancada da cozinha existe como parede avulsa, com sua medida na tela, e a geladeira encosta nela; e "quanto sobra entre a cama e a parede?" se responde arrastando o cursor, sem alterar o documento nem gastar undo.

**Fora do M3.5, e para onde vai.**

- **`arc` nativo em `DrawTarget`** — decisão do M6, quando o arco de abertura de porta trouxer o caso que o achatamento não cobre bem (`04-renderizacao.md` § DrawTarget)
- **Export SVG e PNG dos glifos** — M4, com o resto do export
- **Glifo para os 12 itens sem glifo** — não é milestone, é dado: quem quiser acrescenta uma entrada em `glyphs.json` (`06-catalogo-de-mobilia.md` § Glifos)
- **Converter polilinha de paredes em cômodo** — fora do roadmap. Adivinhar que quatro paredes avulsas queriam ser um cômodo produz área onde o usuário quis guarda-corpo
- **`04-6` (profiler < 8 ms) com glifos** — o bench local passa a rodar a fixture `furnished` com glifos; a medição com canvas real continua dependendo de abrir arquivo, que é do M4

## M4 — Persistir

- Serialização, migrações, validação na leitura com reparo
- Salvar e abrir: File System Access com fallback
- Autosave em IndexedDB e restauração
- Arquivos recentes com miniatura
- Export PNG, SVG e CSV

**Pronto quando:** fechar o navegador no meio de uma edição e reabrir não perde nada.

## M5 — Desktop

- Shell Tauri 2, janela com barra customizada
- Menu nativo e associação da extensão `.planta.json`
- Filesystem nativo substituindo o adaptador de browser
- Build para Linux (AppImage e deb), Windows (msi) e macOS (dmg)
- CI de release por tag

**Pronto quando:** existe um binário instalável para as três plataformas, abaixo de 15 MB, e a extensão de arquivo abre no app.

## Release 1.0

Corta em M5. Critérios:

- [ ] Todos os critérios de aceitação de `00` a `08` passam
- [ ] Fixture `apto-44m2` reproduzível do zero em menos de 10 minutos
- [ ] Zero erro de tipo, zero teste pulado
- [ ] README com GIF do fluxo de desenho
- [ ] Licença (AGPL-3.0 ou MIT — decidir e registrar em ADR)
- [ ] `CONTRIBUTING.md` explicando o processo spec-first
- [ ] Testado por pelo menos três pessoas que não escreveram o código

## Depois da 1.0

Ordem tentativa. Reavaliar com uso real antes de se comprometer.

**M6 — Portas e janelas.** `Opening` completo, arco de abertura no render, verificação de choque entre porta e móvel. É a feature mais pedida previsível: uma porta que abre em cima da cama é exatamente o erro que essa ferramenta deveria pegar. É também o milestone que decide se `arc` entra em `DrawTarget` — o arco de abertura é o primeiro arco em espaço de mundo com escala uniforme, único caso em que a primitiva nativa entrega o que o achatamento do M3.5 não entrega (`04-renderizacao.md` § DrawTarget).

**M7 — Imagem de referência.** `Underlay` com calibração de dois pontos. Deixa traçar por cima da planta em PDF da construtora, que é o caminho mais rápido quando ela existe.

**M8 — Comparar layouts.** Múltiplos arranjos de mobília sobre a mesma planta, alternáveis, lado a lado. Esta é a feature que distingue o Planta de um desenhador genérico: o valor está em testar arranjos, não em desenhar um.

**M9 — Impressão em escala.** Exportar PDF em escala real (1:50, 1:100) com carimbo e cotas, para imprimir e levar na loja de móveis.

**M10 — Acessibilidade do canvas.** Navegação por teclado entre entidades com anúncio por leitor de tela. Limitação assumida na v1 que merece ser resolvida.

## Fora do roadmap

3D, colaboração em tempo real, contas de usuário, integração com catálogo de loja, geração automática de layout. Cada um desses transforma o produto em outra coisa. Se surgir demanda real, é outro projeto.
