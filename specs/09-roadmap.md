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
- **Ferramenta Parede (`W`)** e os comandos `CreateWall`/`DeleteWall`, que `08` marca como M1 e nunca foram feitos, seguem em aberto.

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

**Fora do M3, e para onde foi.** O plano aprovado (`plans/m3-mobiliar.md`) registra a lista completa. Os desvios que mudam outro milestone:

- **Ferramenta Medir (`M`)** nunca foi alocada a milestone nenhum por este roadmap, e continua assim. A barra de ferramentas a mostra desabilitada, junto com Parede.
- **Ferramenta Parede (`W`)** e `CreateWall`/`DeleteWall` seguem em aberto desde o M1, agora visíveis como botão desabilitado.
- **Export CSV com tabela de móveis** (`05` § Export) vai com o resto do export, no M4.

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

**M6 — Portas e janelas.** `Opening` completo, arco de abertura no render, verificação de choque entre porta e móvel. É a feature mais pedida previsível: uma porta que abre em cima da cama é exatamente o erro que essa ferramenta deveria pegar.

**M7 — Imagem de referência.** `Underlay` com calibração de dois pontos. Deixa traçar por cima da planta em PDF da construtora, que é o caminho mais rápido quando ela existe.

**M8 — Comparar layouts.** Múltiplos arranjos de mobília sobre a mesma planta, alternáveis, lado a lado. Esta é a feature que distingue o Planta de um desenhador genérico: o valor está em testar arranjos, não em desenhar um.

**M9 — Impressão em escala.** Exportar PDF em escala real (1:50, 1:100) com carimbo e cotas, para imprimir e levar na loja de móveis.

**M10 — Acessibilidade do canvas.** Navegação por teclado entre entidades com anúncio por leitor de tela. Limitação assumida na v1 que merece ser resolvida.

## Fora do roadmap

3D, colaboração em tempo real, contas de usuário, integração com catálogo de loja, geração automática de layout. Cada um desses transforma o produto em outra coisa. Se surgir demanda real, é outro projeto.
