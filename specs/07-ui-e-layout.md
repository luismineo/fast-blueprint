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

Do M3 ao M3.5, Parede e Medir aparecem indisponíveis — com `aria-disabled`, nunca `disabled`, para não sair da ordem de foco e quebrar o padrão ARIA de toolbar. A partir do M3.5 nenhum dos cinco está indisponível, e o tratamento visual de indisponível continua existindo porque é o mesmo de qualquer botão que dependa de contexto.

**Painel direito** (264 px, recolhível com o atalho da tabela de `03-ferramentas-e-interacao.md`, hoje `Ctrl/Cmd+B`). Duas seções empilhadas: propriedades da seleção no topo, catálogo abaixo. Quando não há seleção, propriedades mostra o resumo do documento (área útil, área total, contagem de cômodos).

Uma versão anterior desta linha dizia "recolhível com `Tab`", o que contradizia a tabela unificada — que é a dona única da lista de atalhos — e colidia com `Tab` como travessia de foco (§ Acessibilidade).

**Rodapé do canvas.** Escala gráfica, indicador de zoom com clique para resetar, contador de avisos com clique para listar. Sobreposto ao canvas, não ocupa layout.

Nenhuma barra de menu tradicional. O menu do canto superior direito tem: Novo, Abrir, Recentes, Salvar, Salvar como, Exportar, Preferências, Atalhos, Sobre.

## Painel de propriedades

Muda conforme a seleção.

**Nada selecionado** — resumo do documento: área útil, área total, número de cômodos, número de móveis, lista de avisos ativos.

A lista de avisos é a saída de `validateDocument` de nível `warning` (`01-modelo-de-dominio.md` § Invariantes), na ordem W1 a W5. `core` devolve issue estruturada com código e ids; o app mapeia o código para a mensagem, como já faz com erro de I/O (§ Erros de `core`).

**Cômodo** — nome (editável), área, perímetro, número de móveis, taxa de ocupação, cor, alternância "contar na área útil", botão excluir.

**Aresta** — comprimento (editável), ângulo, cômodos adjacentes.

Aresta de **parede avulsa** (`01-modelo-de-dominio.md` § Wall) usa a mesma variante, com duas diferenças: no lugar de "cômodos adjacentes" aparece que ela não pertence a cômodo nenhum, e existe botão excluir, porque `DeleteWall` existe e `DeleteEdge` não (`03-ferramentas-e-interacao.md` § Selecionar). Não é variante nova: os campos são os mesmos e o comportamento de edição de comprimento é o mesmo.

**Nó** — X, Y (editáveis), lista de cômodos conectados.

**Móvel** — nome, largura, profundidade, rotação, circulação, cor, travar, "salvar como item do catálogo", duplicar, excluir.

Largura, profundidade e circulação em centímetros; rotação em graus inteiros, 0–359. Com o móvel travado, os campos de dimensão e rotação ficam desabilitados: a trava é do comando (`08-arquitetura.md` § Comandos do M3), e um campo que aceita valor para vê-lo recusado em silêncio é pior que um campo desabilitado. Excluir continua disponível.

"Salvar como item do catálogo" pergunta nome e categoria e grava no catálogo do usuário (`06-catalogo-de-mobilia.md` § Catálogo do usuário).

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

`packages/app/src/messages.ts` é a fonte da verdade de todo texto de interface visível ao usuário. Nenhum literal de texto aparece em componente `.svelte`. Specs de comportamento (`02`, `03`, `05`) citam a **chave** da mensagem, nunca o texto entre aspas — o texto pode mudar sem tocar a spec de comportamento, e não fica órfão quando o comportamento muda. Foi isso que quebrou quando C3 mudou o algoritmo de fechamento e a tabela desta spec não acompanhou; uma tabela central de strings apodrece pelo mesmo motivo que changelog manual apodrece.

### Registro e tom

- Direto, segunda pessoa, sentence case.
- Sem ponto final em rótulo e botão.
- Erro diz o que aconteceu e o que fazer. Não pede desculpa.
- Estado vazio é convite para agir, com o atalho exato quando existe um.
- Nomes de ação são constantes ao longo do fluxo: o botão diz "Exportar PNG", o resultado diz "PNG exportado".

### Convenção de nomeação de chave

`camelCase`, nomeando a situação, não o texto: `closeDeviation`, não `mensagemDeFechamentoComDesvio`. Erros de I/O são agrupados por código, sob um só objeto: `ioErrors.orphanNodeRef`, não uma chave solta por mensagem de erro.

### Mensagens com dado interpolado

`messages.ts` guarda **função**, não string, sempre que a mensagem depende de um valor em tempo de execução. Sem mini-linguagem de template, sem placeholder textual, sem parser — a assinatura da função é o contrato, e o compilador rejeita uma chamada com o tipo errado. Mensagens sem dado interpolado são string simples, não função.

```ts
export const messages = {
  emptyCanvas: `...`,
  closeDeviation: (actualCm: number, typedCm: number) => `...`,
  furnitureOverlap: (nameA: string, nameB: string) => `...`,
  unsavedChanges: (formattedTimestamp: string) => `...`,
  restoreLabel: `Restaurar`,
  discardLabel: `Descartar`,
  ioErrors: {
    orphanNodeRef: (roomName: string) => `...`,
  },
} as const
```

Todas as mensagens com dado interpolado que hoje aparecem nas specs de comportamento seguem essa forma:

| Chave | Onde o comportamento é definido | Parâmetros |
|---|---|---|
| `closeDeviation` | `02-unidades-e-geometria.md` § Precisão de fechamento | comprimento real do último trecho e comprimento digitado, em centímetros — a diferença é calculada dentro da função, não recebida pronta |
| `furnitureOverlap` | `03-ferramentas-e-interacao.md` § Mobília | nome dos dois móveis sobrepostos |
| `unsavedChanges` | `05-formato-de-arquivo.md` § Autosave | timestamp já formatado por `core/format` — a função só compõe o texto, não formata data |
| `ioErrors.orphanNodeRef` | `05-formato-de-arquivo.md` § Validação | nome do cômodo com a referência órfã |

Mensagens sem dado interpolado (`emptyCanvas`, `catalogNoResults`, `noSelection`, `furnitureOutsideRoom`, `firefoxDownloadNotice`, `restoreLabel`, `discardLabel`, `underlayTooLarge`, entre outras) são string simples. A lista completa de chaves vive só no código — esta spec não mantém inventário, pelo mesmo motivo que `specs/fixtures/README.md` e não `10-testes.md` é quem mantém o inventário de fixtures.

### Elementos interativos embutidos numa mensagem

Uma mensagem que embute um controle — o botão "Restaurar" e o botão "Descartar" dentro do aviso de alterações não salvas — não vira uma única string com marcação embutida. Cada controle tem sua **própria chave** de rótulo (`restoreLabel`, `discardLabel`, strings simples, sem interpolação). O componente Svelte monta a composição de texto e botões; o glifo separador entre eles (`·`) é estrutura de layout do componente, não texto de mensagem.

### Exceção à regra "nenhum literal em componente"

A regra de lint (§ Acessibilidade e critérios) não é violada por:

- Glifos estruturais/decorativos sem significado lexical próprio: separadores (`·`), setas (`→`), multiplicação de dimensão (`×`).
- Saída de `core/format` (número, unidade, data já formatados — `02-unidades-e-geometria.md`). Isso é dado formatado, não mensagem de interface.

### Erros de `core`

`core/io` não produz texto em pt-BR. Produz erro estruturado com código e dados — `{ code: 'ORPHAN_NODE_REF', roomName }`. O app mapeia o código para a função correspondente em `messages.ioErrors`. Isso mantém `core` testável sem string de idioma embutida e respeita a direção de dependência de `08-arquitetura.md`.

### Estado vazio e erro

- Estado vazio: convite a agir, menciona o atalho exato quando existe um (ex.: `emptyCanvas` cita `R`).
- Erro: nomeia o que quebrou e o que fazer a respeito, nunca um stack trace.

## Acessibilidade

Piso, não meta:

- Toda ferramenta e ação alcançável por teclado
- Foco visível com anel de 2 px em `accent`, nunca `outline: none` sem substituto
- Contraste mínimo 4,5:1 em texto, 3:1 em elementos de interface
- `prefers-reduced-motion` respeitado
- Painéis com marcação semântica e `aria-label` nos ícones da barra de ferramentas
- Barra de ferramentas implementa o padrão ARIA de toolbar completo (roving tabindex, `Home`/`End`, ver `03-ferramentas-e-interacao.md` § Regra de precedência) — não é reduzida para acomodar atalho de câmera
- Armadilha de foco do HUD de desenho (`03-ferramentas-e-interacao.md` § Cômodo/HUD): enquanto ativa, o HUD inteiro recebe o mesmo anel de foco de 2 px em `accent` usado nos demais controles. Não é um tratamento visual novo — é a aplicação do mesmo token a um container em vez de a um controle único, sinalizando que o `Tab` está contido ali antes que o usuário precise descobrir isso tentando escapar
- Nenhum literal de texto visível ao usuário em componente `.svelte` (regra de lint, `eslint-plugin` a definir na implementação). Exceções em § Textos de interface
- Teste automatizado garante que toda chave referenciada em componente existe em `messages.ts` e que toda chave de `messages.ts` é referenciada por algum componente (nenhuma chave órfã nos dois sentidos)
- O canvas não é acessível a leitor de tela na v1. Isso é uma limitação assumida e documentada, não um esquecimento

## Responsividade

Alvo é desktop, mínimo 1024 × 640.

Abaixo de 1280 px, o painel direito recolhe por default. Abaixo de 900 px, vira drawer sobreposto. Não há suporte a toque na v1 — o modelo de interação depende de hover para preview de snap.

## Critérios de aceitação

- [ ] Painel direito recolhe e expande com o atalho definido em `03-ferramentas-e-interacao.md` (tabela unificada)
- [ ] Todo campo numérico aceita `158+40` e resolve para 198
- [ ] Nenhum controle depende exclusivamente de mouse
- [ ] Anel de foco visível em todos os controles interativos
- [ ] Texto de interface passa 4,5:1 contra o fundo
- [ ] Escala gráfica muda de unidade nos limiares de zoom de `04-renderizacao.md`
- [ ] Canvas não anima em mudança de câmera
- [ ] `prefers-reduced-motion: reduce` remove todas as transições
- [ ] Estado vazio menciona o atalho `R`
- [ ] Tabela de atalhos de `03-ferramentas-e-interacao.md` verificada em teclado ABNT2 (todas as teclas de pontuação como `?` testadas)
- [ ] Lint falha se houver literal de texto visível ao usuário em componente `.svelte`, exceto glifo estrutural e saída de `core/format`
- [ ] Nenhuma chave órfã em `messages.ts` (definida e não usada, ou usada e não definida)
- [ ] Com foco na barra de ferramentas, `Home`/`End` movem o foco para o primeiro/último botão; fora dela, `Home` enquadra tudo
- [ ] Os cinco botões da barra ativam ferramenta, e nenhum tem `aria-disabled` verdadeiro
- [ ] Parede avulsa selecionada mostra a variante de aresta com botão excluir; aresta de cômodo mostra a mesma variante sem ele
- [ ] HUD com armadilha de foco ativa exibe o anel de foco de `accent` no container
