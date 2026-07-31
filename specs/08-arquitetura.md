# 08 — Arquitetura

## Pacotes

Monorepo pnpm. Cinco pacotes com dependência estritamente unidirecional.

```
packages/core        →  (nada)
packages/catalog     →  core
packages/renderer    →  core
packages/app         →  core, catalog, renderer
desktop              →  packages/app (build artifact)
```

Violar a direção é o erro mais grave possível neste repositório. É verificado em CI por `dependency-cruiser`.

### `core`

Domínio puro. Zero dependência de DOM, canvas, framework ou browser. Roda em Node sem shim.

```
core/
  model/        tipos e schema Zod
  geometry/     shoelace, ponto-em-polígono, SAT, projeções
  snap/         resolvedor de snap
  commands/     comandos e seus inversos
  history/      pilha de undo
  document/     store, validação, invariantes
  format/       parse e formatação de medida
  io/           serialização, migrações
```

Única dependência externa: `zod` e `immer`.

Esta é a fronteira que garante testabilidade. Se um teste de geometria precisa de `jsdom`, algo está no pacote errado.

### `renderer`

Canvas 2D. Lê estado, desenha pixels. Nunca muta documento.

O renderer é composto por múltiplos elementos canvas sobrepostos no DOM, gerenciados pelo scheduler em `app/`. Os passes de desenho (`04-renderizacao.md`) rodam sobre um canvas principal; o underlay (imagem de referência, M7) usa um canvas de fundo separado, redesenhado apenas quando a câmera muda.

```
renderer/
  camera.ts
  theme.ts
  target/       DrawTarget: backend canvas e backend SVG
  passes/       um arquivo por pass de 04-renderizacao.md
  cache/        bbox, medição de texto
  profiler.ts
```

A função de render é pura (`render(doc, camera, selection, overlays): void`). Não mantém estado próprio além dos caches de medição. O loop de `requestAnimationFrame` e a dirty flag vivem no scheduler em `app/`, que assina o `DocumentStore`, marca dirty, e chama `render` no rAF.

### `catalog`

Dados do catálogo mais loader, busca e merge de catálogo do usuário.

### `app`

Svelte 5. Chrome de UI, roteamento de eventos, ferramentas, persistência.

```
app/
  tools/        implementações de Tool (03-ferramentas-e-interacao.md)
  components/   Svelte
  stores/       assinatura reativa ao DocumentStore
  persistence/  File System Access, IndexedDB, autosave
  main.ts
```

**Regra:** nenhum componente Svelte contém regra de negócio. Componente lê estado derivado e despacha comando. Se um `.svelte` tem cálculo geométrico, ele está no lugar errado.

### `desktop`

Tauri 2. Rust mínimo — só configuração de janela, menu nativo e permissões de filesystem. Nenhuma lógica de domínio em Rust.

## Documento e comandos

O documento é imutável. Toda mudança passa por um comando.

```ts
interface Command {
  type: CommandType
  payload: unknown
}

interface CommandResult {
  document: PlanDocument
  inversePatches: Patch[]
  label: string
}

function applyCommand(doc: PlanDocument, cmd: Command): CommandResult
```

`applyCommand` é pura. Recebe documento e comando, devolve documento novo. Implementada com `produceWithPatches` do Immer, que devolve os patches inversos de graça — e é isso que dá undo sem escrever código de undo por comando.

`label` é o texto mostrado no tooltip de desfazer ("Desfazer criar cômodo").

### Comandos v1

Todo comando tem `type: CommandType`, `payload` tipado, e `transient?: boolean`. Comandos com `transient: true` são aplicados ao documento e desenhados pelo renderer, mas **não entram no histórico** — ver § Histórico.

#### Comandos do M1

```ts
type Command =
  | { type: 'CreateRoom'; transient?: boolean; payload: CreateRoomPayload }
  | { type: 'DeleteRoom'; transient?: boolean; payload: DeleteRoomPayload }
  | { type: 'RenameRoom'; transient?: boolean; payload: RenameRoomPayload }
```

**CreateRoom:**
```ts
interface CreateRoomPayload {
  nodes: { id: NodeId; x: Millimeters; y: Millimeters }[]
  loop: NodeId[]
  name: string
  includeInUsableArea: boolean
  color: HexColor | null
  roomId?: RoomId  // se omitido, gerado
}
```
Cria os nós e o cômodo atomicamente. `loop` referencia ids em `nodes`. Se um nó em `nodes` tem coordenada idêntica a um nó já existente, o comando reusa o existente (invariante E6). O resolvedor de snap já tratou do merge antes de emitir o comando.

**DeleteRoom:**
```ts
interface DeleteRoomPayload {
  roomId: RoomId
}
```
Remove o cômodo. Nós que ficam órfãos (sem referência de nenhum cômodo ou parede) permanecem no documento e são removidos pelo GC ao salvar (W5).

**RenameRoom:**
```ts
interface RenameRoomPayload {
  roomId: RoomId
  name: string
}
```

#### Comandos de milestones posteriores

A lista abaixo está registrada para referência de planejamento. As assinaturas serão especificadas quando o milestone for iniciado.

| Comando | Milestone | Efeito |
|---|---|---|
| `SetRoomColor` | M2 | Cor de preenchimento do cômodo |
| `SetRoomUsable` | M2 | Alterna `includeInUsableArea` |
| `MoveNode` | M2 | Move um nó (arraste) |
| `MergeNodes` | M2 | Funde dois nós |
| `SplitNode` | M2 | Desconecta nó compartilhado |
| `SetEdgeLength` | M2 | Edita comprimento de aresta |
| `CreateWall` | M1 | Segmento avulso (a especificar) |
| `DeleteWall` | M1 | Remove parede avulsa (a especificar) |
| `AddFurniture` | M3 | Insere móvel |
| `MoveFurniture` | M3 | Move móvel |
| `TransformFurniture` | M3 | Rotação e redimensionamento |
| `UpdateFurniture` | M3 | Nome, cor, circulação, travar |
| `DeleteFurniture` | M3 | Remove móvel |
| `SetDocumentMeta` | M4 | Nome, unidade de exibição, grid |

Comandos compostos (mover uma seleção com 3 móveis e 2 nós) são um `BatchCommand` que agrega comandos e produz um único item de histórico.

### Histórico

```ts
interface History {
  undo: HistoryEntry[]
  redo: HistoryEntry[]
}
```

Regras:

- Undo ilimitado dentro da sessão. Limite duro de 500 entradas, descartando as mais antigas.
- Câmera, seleção e ferramenta ativa **não** entram no histórico.
- Comandos contínuos (arrastar um nó) usam o mecanismo de **comando transiente**:
  - Durante o arraste, a ferramenta emite comandos com `transient: true`. Eles são aplicados ao documento e desenhados pelo renderer, mas **não entram no histórico**.
  - Ao soltar, a ferramenta emite um único comando com `transient: false` (ou sem o campo, default `false`) representando a mudança do estado inicial ao estado final.
  - O histórico recebe exatamente uma entrada.
- Undo restaura o documento; a seleção é restaurada por "melhor esforço" (ids que ainda existem).
- Qualquer comando novo (não-transiente) limpa a pilha de redo.

### Store

```ts
class DocumentStore {
  get current(): PlanDocument
  dispatch(cmd: Command): void
  undo(): void
  redo(): void
  subscribe(fn: (doc: PlanDocument) => void): Unsubscribe
}
```

Single source of truth. Svelte assina via wrapper fino em `app/stores`. O renderer assina diretamente.

O documento **não** vive em store Svelte. Estado de UI (ferramenta ativa, seleção, câmera, painéis) vive em runes Svelte. A separação é o que permite testar todo o domínio sem Svelte.

## Fluxo de um evento

```
pointermove no canvas
  → app/canvas converte para coordenada de mundo via Camera
  → despacha para a Tool ativa com ToolContext
  → Tool devolve { state, commands, cursor }
  → commands vão para DocumentStore.dispatch
  → store aplica, notifica assinantes
  → scheduler (app/) detecta mudança, marca dirty, agenda rAF
  → rAF chama render(doc, camera, selection, overlays) → função pura
```

Nenhum passo desenha sincronamente. Nenhum passo muta documento fora do store.

O scheduler vive em `app/scheduler.ts`. Ele assina o `DocumentStore` e gerencia a dirty flag e o loop de `requestAnimationFrame`. O renderer exporta apenas a função pura `render` e os tipos necessários — não mantém estado de agendamento.

## Estado derivado

Grandezas derivadas (`01-modelo-de-dominio.md`) são calculadas por seletores memoizados com chave na identidade do documento. Como o documento é imutável, comparação por referência basta.

```ts
const usableArea = memoize((doc: PlanDocument) => ...)
```

Nunca armazene grandeza derivada no documento. Área não é dado, é consequência.

## Tratamento de erro

- Erro em comando: o comando não é aplicado, o documento fica intacto, e a UI mostra o motivo. Nunca deixe o documento em estado parcial.
- Erro em pass de render: o pass é pulado, o frame continua, e o erro vai ao console uma única vez (dedupe por assinatura). Um bug de cota nunca deve deixar a tela em branco.
- Erro em I/O: mensagem acionável por `07-ui-e-layout.md`, com o autosave intacto.

## Build

- Vite como bundler para web e como dev server do Tauri
- TypeScript strict, `noUncheckedIndexedAccess` ligado
- Alvo web: ES2022, browsers com suporte a `structuredClone` e módulos
- Alvo desktop: Tauri 2, webview do sistema
- Bundle web alvo: < 300 KB gzipped, sem contar o catálogo
- Fontes auto-hospedadas (Inter e IBM Plex Mono, subset latin), nunca CDN — o app precisa funcionar offline

## Critérios de aceitação

- [ ] `dependency-cruiser` em CI falha se `core` importar de qualquer outro pacote
- [ ] Todos os testes de `core` passam em Node puro, sem `jsdom`
- [ ] Property test: para todo comando e todo documento válido, aplicar e depois aplicar os patches inversos devolve o documento original
- [ ] Arrastar um nó por 40 frames produz uma única entrada de undo
- [ ] Undo após criar cômodo restaura documento e limpa seleção sem erro
- [ ] Nenhum componente `.svelte` importa de `core/geometry`
- [ ] Erro lançado dentro de um pass não interrompe os demais passes
- [ ] Bundle de produção fica abaixo de 300 KB gzipped
