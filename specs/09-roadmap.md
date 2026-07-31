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

## M3 — Mobiliar

- Pacote `catalog` com o catálogo default completo
- Painel de catálogo com busca, categorias e recentes
- Ferramenta Mobília: inserir, mover, rotacionar, redimensionar, duplicar
- Snap a parede
- Faixa de circulação
- Avisos de sobreposição e de móvel fora de cômodo
- Taxa de ocupação por cômodo
- Salvar móvel no catálogo do usuário

**Pronto quando:** dá para responder "cabe uma cama queen com 60 cm de circulação dos dois lados no Quarto L?" em menos de um minuto.

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
