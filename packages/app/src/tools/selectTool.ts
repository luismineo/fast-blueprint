import type {
  Command,
  EdgeRef,
  HitResult,
  NodeId,
  OverlayPrimitive,
  PlanDocument,
  Point,
  RoomId,
  Selection,
  SelectionRef,
  SnapResult,
} from '@planta/core'
import {
  affectedNodes,
  edgePoints,
  rectFromPoints,
  replaceWith,
  selectWithin,
  selectedRooms,
  selectionKey,
  toggle,
} from '@planta/core'
import { snapOverlays } from './snapOverlays'

export interface DragNode {
  readonly id: NodeId
  readonly startX: number
  readonly startY: number
}

export type SelectToolState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'marquee'; readonly anchor: Point; readonly cursor: Point }
  | {
      readonly kind: 'dragging'
      readonly subject: SelectionRef
      readonly nodes: readonly DragNode[]
      readonly grab: Point
      readonly primary: DragNode
      readonly moved: boolean
    }

export type SelectToolEvent =
  | { readonly type: 'pointerMove' }
  | { readonly type: 'pointerDown'; readonly clickCount: number; readonly additive: boolean }
  | { readonly type: 'pointerUp' }
  | { readonly type: 'escape' }
  | { readonly type: 'deleteSelection' }
  | { readonly type: 'selectAll' }

export type EditRequest =
  | { readonly kind: 'roomName'; readonly roomId: RoomId }
  | {
      readonly kind: 'edgeLength'
      readonly edge: EdgeRef
      readonly currentLength: number
      readonly endNodeShared: boolean
      readonly at: Point
    }

export interface SelectToolContext {
  readonly doc: PlanDocument
  readonly cursor: Point
  readonly hit: HitResult
  readonly selection: Selection
  readonly snap: (point: Point, exclude: readonly NodeId[]) => SnapResult
  readonly newNodeId: () => NodeId
}

export interface SelectToolResult {
  readonly state: SelectToolState
  readonly commands: readonly Command[]
  readonly overlays: readonly OverlayPrimitive[]
  readonly selection: Selection
  readonly hover: SelectionRef | null
  readonly historyBoundary?: 'commit' | 'abort'
  readonly edit: EditRequest | null
}

export function initialSelectState(): SelectToolState {
  return { kind: 'idle' }
}

export function selectToolTransition(
  state: SelectToolState,
  event: SelectToolEvent,
  ctx: SelectToolContext,
): SelectToolResult {
  switch (event.type) {
    case 'pointerDown':
      return onPointerDown(state, event, ctx)
    case 'pointerMove':
      return onPointerMove(state, ctx)
    case 'pointerUp':
      return onPointerUp(state, ctx)
    case 'escape':
      return onEscape(state, ctx)
    case 'deleteSelection':
      return onDelete(ctx)
    case 'selectAll':
      return onSelectAll(ctx)
  }
}

// ============================================================
// pointerDown
// ============================================================

function onPointerDown(
  state: SelectToolState,
  event: { clickCount: number; additive: boolean },
  ctx: SelectToolContext,
): SelectToolResult {
  if (state.kind !== 'idle') return present(state, ctx, ctx.selection)

  const hit = ctx.hit

  if (event.clickCount >= 2) {
    const edit = editRequestFor(hit, ctx)
    if (edit) return { ...present(state, ctx, ctx.selection), edit }
  }

  if (!hit) {
    return present({ kind: 'marquee', anchor: ctx.cursor, cursor: ctx.cursor }, ctx, ctx.selection)
  }

  const ref = refFor(hit)
  if (!ref) return present(state, ctx, ctx.selection)

  if (event.additive) {
    return present(state, ctx, toggle(ctx.selection, ref))
  }

  const selection = isInSelection(ctx.selection, ref) ? ctx.selection : replaceWith(ref)
  const drag = beginDrag(ref, ctx)

  return present(drag ?? state, ctx, selection)
}

function editRequestFor(hit: HitResult, ctx: SelectToolContext): EditRequest | null {
  if (!hit) return null

  if (hit.kind === 'roomInterior') {
    return { kind: 'roomName', roomId: hit.roomId }
  }

  if (hit.kind === 'edge') {
    const ends = edgePoints(ctx.doc, hit.edge)
    if (!ends) return null
    return {
      kind: 'edgeLength',
      edge: hit.edge,
      currentLength: Math.round(Math.hypot(ends[1].x - ends[0].x, ends[1].y - ends[0].y)),
      endNodeShared: isEndNodeShared(ctx.doc, hit.edge),
      at: { x: (ends[0].x + ends[1].x) / 2, y: (ends[0].y + ends[1].y) / 2 },
    }
  }

  return null
}

/**
 * Nada é emitido no `pointerdown`: o primeiro `pointermove` com deslocamento
 * diferente de zero é que abre a entrada pendente. Um clique que só seleciona
 * não gasta entrada de histórico, e o arraste de cômodo consegue emitir
 * `SplitNode` já com o destino deslocado, sem violar E6.
 */
function beginDrag(ref: SelectionRef, ctx: SelectToolContext): SelectToolState | null {
  const ids = affectedNodes(ctx.doc, [ref])
  if (ids.length === 0) return null

  const nodes: DragNode[] = []
  for (const id of ids) {
    const node = ctx.doc.nodes.find((candidate) => candidate.id === id)
    if (node) nodes.push({ id, startX: node.x, startY: node.y })
  }
  if (nodes.length === 0) return null

  return {
    kind: 'dragging',
    subject: ref,
    nodes,
    grab: ctx.cursor,
    primary: nodes[0]!,
    moved: false,
  }
}

// ============================================================
// pointerMove
// ============================================================

function onPointerMove(state: SelectToolState, ctx: SelectToolContext): SelectToolResult {
  if (state.kind === 'marquee') {
    return present({ ...state, cursor: ctx.cursor }, ctx, ctx.selection)
  }

  if (state.kind !== 'dragging') {
    return present(state, ctx, ctx.selection)
  }

  const moving = state.nodes.map((node) => node.id)
  const target = {
    x: state.primary.startX + (ctx.cursor.x - state.grab.x),
    y: state.primary.startY + (ctx.cursor.y - state.grab.y),
  }

  const snap = ctx.snap(target, moving)
  const delta = deltaFor(state, snap.point)

  if (delta.x === 0 && delta.y === 0) {
    return present(state, ctx, ctx.selection, snapOverlays(snap.targets))
  }

  const commands = moveCommands(state, delta, ctx)
  if (commands.length === 0) {
    return present(state, ctx, ctx.selection, snapOverlays(snap.targets))
  }

  return {
    ...present({ ...state, moved: true }, ctx, ctx.selection, snapOverlays(snap.targets)),
    commands,
  }
}

/**
 * Arrastar aresta empurra os dois nós **perpendicularmente** a ela
 * (`03-ferramentas-e-interacao.md` § Edição de geometria).
 *
 * O resolvedor de snap participa mesmo assim — ele pode puxar o ponto ao longo
 * da normal para alinhar com um nó ou com o grid —, mas o resultado volta a
 * ser projetado na normal, senão a parede deixaria de andar reta.
 */
function deltaFor(
  state: SelectToolState & { kind: 'dragging' },
  resolved: Point,
): Point {
  const raw = {
    x: Math.round(resolved.x - state.primary.startX),
    y: Math.round(resolved.y - state.primary.startY),
  }

  if (state.subject.kind !== 'edge') return raw

  const normal = edgeNormal(state)
  if (!normal) return raw

  const along = raw.x * normal.x + raw.y * normal.y
  return {
    x: Math.round(normal.x * along),
    y: Math.round(normal.y * along),
  }
}

function edgeNormal(state: SelectToolState & { kind: 'dragging' }): Point | null {
  if (state.nodes.length < 2) return null
  const from = state.nodes[0]!
  const to = state.nodes[1]!
  const dx = to.startX - from.startX
  const dy = to.startY - from.startY
  const length = Math.hypot(dx, dy)
  if (length === 0) return null
  return { x: -dy / length, y: dx / length }
}

/**
 * Um comando por nó movido, num lote transiente.
 *
 * Nós que o cômodo arrastado compartilha com outro saem por `SplitNode`, já na
 * posição deslocada: o cômodo arrastado ganha cópias e o vizinho fica onde
 * estava (`03-ferramentas-e-interacao.md` § Edição de geometria).
 */
function moveCommands(
  state: SelectToolState & { kind: 'dragging' },
  delta: Point,
  ctx: SelectToolContext,
): Command[] {
  const detachFrom = state.subject.kind === 'room' ? state.subject.roomId : null
  const inner: Command[] = []

  for (const node of state.nodes) {
    const to = { x: node.startX + delta.x, y: node.startY + delta.y }
    const current = ctx.doc.nodes.find((candidate) => candidate.id === node.id)
    if (!current) continue
    if (current.x === to.x && current.y === to.y) continue

    if (detachFrom !== null && isSharedNode(ctx.doc, node.id, detachFrom)) {
      inner.push({
        type: 'SplitNode',
        transient: true,
        payload: { nodeId: node.id, roomId: detachFrom, to, newNodeId: ctx.newNodeId() },
      })
      continue
    }

    inner.push({ type: 'MoveNode', transient: true, payload: { nodeId: node.id, ...to } })
  }

  if (inner.length === 0) return []
  if (inner.length === 1) return inner

  return [{ type: 'Batch', transient: true, payload: { label: 'Mover', commands: inner } }]
}

// ============================================================
// pointerUp
// ============================================================

function onPointerUp(state: SelectToolState, ctx: SelectToolContext): SelectToolResult {
  if (state.kind === 'marquee') {
    const moved = state.anchor.x !== state.cursor.x || state.anchor.y !== state.cursor.y
    const selection = moved
      ? selectWithin(ctx.doc, rectFromPoints(state.anchor, state.cursor))
      : replaceWith(null)
    return present({ kind: 'idle' }, ctx, selection)
  }

  if (state.kind !== 'dragging') return present(state, ctx, ctx.selection)

  if (!state.moved) return present({ kind: 'idle' }, ctx, ctx.selection)

  const merge = mergeOnDrop(state, ctx)

  return {
    ...present({ kind: 'idle' }, ctx, ctx.selection),
    commands: merge ? [merge] : [],
    historyBoundary: 'commit',
  }
}

/**
 * Soltar um nó sobre outro funde os dois (`03` § Edição de geometria).
 *
 * O snap é resolvido sobre o **alvo do cursor**, não sobre a posição corrente
 * do nó: o último `MoveNode` do arraste é rejeitado justamente quando o
 * destino já está ocupado, então o nó nunca chega a pousar em cima do alvo. É
 * o cursor que sabe onde o usuário soltou.
 *
 * Sai transiente para entrar na mesma entrada pendente do arraste: desfazer
 * uma vez precisa devolver o nó ao ponto de partida, não parar num estado
 * intermediário em que ele já foi movido mas ainda não fundido.
 */
function mergeOnDrop(
  state: SelectToolState & { kind: 'dragging' },
  ctx: SelectToolContext,
): Command | null {
  if (state.subject.kind !== 'node') return null

  const dragged = state.nodes[0]
  if (!dragged) return null

  const target = {
    x: dragged.startX + (ctx.cursor.x - state.grab.x),
    y: dragged.startY + (ctx.cursor.y - state.grab.y),
  }

  const snap = ctx.snap(target, [dragged.id])
  if (snap.merged === null || snap.merged === dragged.id) return null

  return {
    type: 'MergeNodes',
    transient: true,
    payload: { keep: snap.merged, remove: dragged.id },
  }
}

// ============================================================
// Teclado
// ============================================================

function onEscape(state: SelectToolState, ctx: SelectToolContext): SelectToolResult {
  if (state.kind === 'dragging' && state.moved) {
    return {
      ...present({ kind: 'idle' }, ctx, ctx.selection),
      historyBoundary: 'abort',
    }
  }

  if (state.kind !== 'idle') {
    return present({ kind: 'idle' }, ctx, ctx.selection)
  }

  return present(state, ctx, replaceWith(null))
}

/**
 * Exclui apenas os cômodos da seleção.
 *
 * Não existe `DeleteNode` nem `DeleteEdge` na lista de comandos de
 * `08-arquitetura.md`, e não é a tecla que decide que eles deveriam existir:
 * apagar um nó de um ciclo fechado ou deixa o cômodo abaixo de três nós ou
 * muda a forma dele de um jeito que arrastar resolve melhor.
 */
function onDelete(ctx: SelectToolContext): SelectToolResult {
  const rooms = selectedRooms(ctx.selection)
  const commands: Command[] = rooms.map((roomId) => ({
    type: 'DeleteRoom',
    payload: { roomId },
  }))

  if (commands.length === 0) return present({ kind: 'idle' }, ctx, ctx.selection)

  return {
    ...present({ kind: 'idle' }, ctx, replaceWith(null)),
    commands,
  }
}

function onSelectAll(ctx: SelectToolContext): SelectToolResult {
  const selection: SelectionRef[] = ctx.doc.rooms.map((room) => ({
    kind: 'room',
    roomId: room.id,
  }))
  return present({ kind: 'idle' }, ctx, selection)
}

// ============================================================
// Apresentação
// ============================================================

function present(
  state: SelectToolState,
  ctx: SelectToolContext,
  selection: Selection,
  guides: readonly OverlayPrimitive[] = [],
): SelectToolResult {
  return {
    state,
    commands: [],
    overlays: [...marqueeOverlay(state), ...guides],
    selection,
    hover: state.kind === 'idle' ? refFor(ctx.hit) : null,
    edit: null,
  }
}

function marqueeOverlay(state: SelectToolState): OverlayPrimitive[] {
  if (state.kind !== 'marquee') return []

  const rect = rectFromPoints(state.anchor, state.cursor)
  return [
    {
      kind: 'polyline',
      role: 'marquee',
      closed: true,
      points: [
        { x: rect.minX, y: rect.minY },
        { x: rect.maxX, y: rect.minY },
        { x: rect.maxX, y: rect.maxY },
        { x: rect.minX, y: rect.maxY },
      ],
    },
  ]
}

// ============================================================
// Auxiliares
// ============================================================

/**
 * Handle de móvel resolve para o próprio móvel: agarrar um canto do que já
 * está selecionado não muda a seleção, muda o que o arraste vai fazer.
 */
export function refFor(hit: HitResult): SelectionRef | null {
  if (!hit) return null
  switch (hit.kind) {
    case 'node':
      return { kind: 'node', nodeId: hit.nodeId }
    case 'edge':
      return { kind: 'edge', edge: hit.edge }
    case 'roomInterior':
      return { kind: 'room', roomId: hit.roomId }
    case 'furniture':
    case 'furnitureCorner':
    case 'furnitureRotation':
      return { kind: 'furniture', furnitureId: hit.furnitureId }
  }
}

function isInSelection(selection: Selection, ref: SelectionRef): boolean {
  const key = selectionKey(ref)
  return selection.some((candidate) => selectionKey(candidate) === key)
}

function isSharedNode(doc: PlanDocument, nodeId: NodeId, roomId: RoomId): boolean {
  for (const room of doc.rooms) {
    if (room.id !== roomId && room.loop.includes(nodeId)) return true
  }
  for (const wall of doc.walls) {
    if (wall.a === nodeId || wall.b === nodeId) return true
  }
  return false
}

export function isEndNodeShared(doc: PlanDocument, edge: EdgeRef): boolean {
  if (edge.kind === 'wall') return false

  const room = doc.rooms.find((candidate) => candidate.id === edge.roomId)
  if (!room || edge.index < 0 || edge.index >= room.loop.length) return false

  const endId = room.loop[(edge.index + 1) % room.loop.length]!
  return isSharedNode(doc, endId, room.id)
}
