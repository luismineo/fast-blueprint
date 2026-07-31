# 07 — Interface

## Princípio

O canvas é o produto. Todo pixel de chrome precisa se justificar. A meta é que a interface desapareça depois de 30 segundos de uso.

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Planta · Apartamento 44m²                            ⌄ ▢ ✕  │  32px
├────┬────────────────────────────────────────┬────────────────┤
│    │                                        │                │
│ V  │                                        │  PROPRIEDADES  │
│ R  │                                        │                │
│ W  │              C A N V A S               │  Quarto L      │
│ F  │                                        │  Área 8,00 m²  │
│ M  │                                        │  Perímetro     │
│    │                                        │  11,40 m       │
│ 48 │                                        │                │
│ px │                                        │  ─────────     │
│    │                                        │                │
│    │                                        │  CATÁLOGO      │
│    │                                        │  🔍            │
│    │   ┌──────────────┐                     │  Quarto     ⌄  │
│    │   │ 320 cm  90°  │  HUD junto ao cursor│  Sala       ⌄  │
│    │   └──────────────┘                     │  Cozinha    ⌄  │
│    │                                        │                │
│    │  ├──1m──┤   ⊕ 100%              ⚠ 2    │       264px    │
└────┴────────────────────────────────────────┴────────────────┘
```

**Barra de título** (32 px). Nome do arquivo, ponto de "não salvo", menu. No desktop, é a barra customizada do Tauri.

**Barra de ferramentas** (48 px, esquerda). Cinco ícones. Nada mais. Tooltip mostra nome e atalho.

**Painel direito** (264 px, recolhível com `Tab`). Duas seções empilhadas: propriedades da seleção no topo, catálogo abaixo. Quando não há seleção, propriedades mostra o resumo do documento (área útil, área total, contagem de cômodos).

**Rodapé do canvas.** Escala gráfica, indicador de zoom com clique para resetar, contador de avisos com clique para listar. Sobreposto ao canvas, não ocupa layout.

Nenhuma barra de menu tradicional. O menu do canto superior direito tem: Novo, Abrir, Recentes, Salvar, Salvar como, Exportar, Preferências, Atalhos, Sobre.

## Painel de propriedades

Muda conforme a seleção.

**Nada selecionado** — resumo do documento: área útil, área total, número de cômodos, número de móveis, lista de avisos ativos.

**Cômodo** — nome (editável), área, perímetro, número de móveis, taxa de ocupação, cor, alternância "contar na área útil", botão excluir.

**Aresta** — comprimento (editável), ângulo, cômodos adjacentes.

**Nó** — X, Y (editáveis), lista de cômodos conectados.

**Móvel** — nome, largura, profundidade, rotação, circulação, cor, travar, "salvar como item do catálogo", duplicar, excluir.

**Múltipla seleção** — contagem por tipo, e as ações que fazem sentido para todos.

Todo campo numérico aceita as mesmas regras de entrada de `02-unidades-e-geometria.md`, aceita expressão aritmética simples (`158+40`) e aplica em `Enter` ou blur, com `Esc` cancelando.

## Direção visual

O produto é sobre medida e papel. A referência não é software de CAD (cinza, denso, técnico) nem app de decoração (fotográfico, aspiracional) — é caderno de arquiteto: papel levemente quente, traço preto firme, cotas finas.

**Cor.** A UI usa a mesma paleta de papel do canvas (`04-renderizacao.md`), estendida:

| Token | Valor | Uso |
|---|---|---|
| `surface` | `#FBFBF9` | Fundo de painel |
| `surfaceRaised` | `#FFFFFF` | Cartão, campo, popover |
| `border` | `#E5E3DC` | Divisórias |
| `text` | `#1C1B18` | Texto primário |
| `textMuted` | `#7A766C` | Rótulo, unidade, ajuda |
| `accent` | `#2F6FED` | Seleção, foco, ferramenta ativa |
| `warning` | `#C2701F` | Avisos |

Um único acento. Sem gradiente, sem sombra colorida, sem cor de marca decorativa.

**Tipografia.**

- Interface: **Inter**, 13 px / 1,4. Rótulos em 11 px, uppercase, `letter-spacing: 0.06em`.
- Números (cotas, áreas, campos de medida): **IBM Plex Mono**, tabular. Toda medida no produto é monoespaçada.

O contraste entre a interface proporcional e os números monoespaçados é o elemento que dá identidade ao produto. Números são o conteúdo aqui, e eles devem parecer instrumento de medição, não texto corrido. É também funcional: números tabulares não dançam quando o valor muda durante o arraste.

**Forma.** Raio de 4 px em campos e botões, 6 px em popovers. Sem sombra além de um `0 1px 2px rgba(0,0,0,0.06)` em elementos flutuantes. Divisórias de 1 px.

**Movimento.** Transições de 120 ms em hover e foco, 180 ms em abertura de painel, curva `cubic-bezier(0.2, 0, 0, 1)`. O canvas nunca anima — pan e zoom são diretos, e interpolar posição de câmera arruína a sensação de precisão. `prefers-reduced-motion` remove todas as transições de chrome.

**Elemento de assinatura.** A escala gráfica no canto inferior esquerdo do canvas: uma régua com marcações que muda de unidade conforme o zoom (`10 cm`, `50 cm`, `1 m`, `5 m`), desenhada como régua de verdade, com tiques desiguais. É o único elemento decorativo do produto e o que comunica em um olhar que isso é uma ferramenta de medida.

## Textos de interface

Registro: direto, segunda pessoa, sentence case, sem ponto final em rótulos e botões.

| Situação | Texto |
|---|---|
| Canvas vazio | **Desenhe o primeiro cômodo**<br>Pressione `R`, clique para começar e digite a medida da parede em centímetros. |
| Catálogo sem resultado | Nenhum móvel com esse nome. Você pode criar um item com as medidas que quiser. |
| Sem seleção no painel | Selecione um cômodo ou móvel para ver as propriedades |
| Fechamento com desvio | Fechou com 4 cm de diferença do que você digitou. O último trecho foi ajustado. |
| Móvel fora de cômodo | Este móvel está fora de qualquer cômodo |
| Sobreposição de móveis | Cama queen e Criado-mudo estão sobrepostos |
| Alterações não salvas | Você tem alterações não salvas de 30/07 às 15:12 · **Restaurar** · **Descartar** |
| Erro ao abrir | Não foi possível abrir o arquivo. O cômodo "Quarto" aponta para um ponto que não existe. |
| Salvar no Firefox | Neste navegador, cada salvamento baixa um novo arquivo |

Erros dizem o que aconteceu e o que fazer. Não pedem desculpa. Estado vazio é convite para agir, com o atalho exato.

Nomes de ação são constantes ao longo do fluxo: o botão diz "Exportar PNG", o resultado diz "PNG exportado".

## Acessibilidade

Piso, não meta:

- Toda ferramenta e ação alcançável por teclado
- Foco visível com anel de 2 px em `accent`, nunca `outline: none` sem substituto
- Contraste mínimo 4,5:1 em texto, 3:1 em elementos de interface
- `prefers-reduced-motion` respeitado
- Painéis com marcação semântica e `aria-label` nos ícones da barra de ferramentas
- O canvas não é acessível a leitor de tela na v1. Isso é uma limitação assumida e documentada, não um esquecimento

## Responsividade

Alvo é desktop, mínimo 1024 × 640.

Abaixo de 1280 px, o painel direito recolhe por default. Abaixo de 900 px, vira drawer sobreposto. Não há suporte a toque na v1 — o modelo de interação depende de hover para preview de snap.

## Critérios de aceitação

- [ ] `Tab` recolhe e expande o painel direito
- [ ] Todo campo numérico aceita `158+40` e resolve para 198
- [ ] Nenhum controle depende exclusivamente de mouse
- [ ] Anel de foco visível em todos os controles interativos
- [ ] Texto de interface passa 4,5:1 contra o fundo
- [ ] Escala gráfica muda de unidade nos limiares de zoom de `04-renderizacao.md`
- [ ] Canvas não anima em mudança de câmera
- [ ] `prefers-reduced-motion: reduce` remove todas as transições
- [ ] Estado vazio menciona o atalho `R`
