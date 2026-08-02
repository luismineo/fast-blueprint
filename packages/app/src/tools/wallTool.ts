import type {
  Command,
  CreateWallCommand,
  NodeId,
  OverlayPrimitive,
  Point,
  SnapResult,
  WallId,
} from '@planta/core'
import {
  angle,
  distance,
  parseLength,
  pointAtDistance,
  snapAngle,
  tryParseAngle,
} from '@planta/core'

export interface DraftNode {
  readonly id: NodeId
  readonly x: number
  readonly y: number
  readonly reused: boolean
}

export interface NumericInput {
  readonly value: string
  readonly angleText: string
  readonly frozenDirection: number | null
}

export type WallToolState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'anchored'; readonly nodes: readonly DraftNode[]; readonly input: NumericInput }
  | { readonly kind: 'drawing'; readonly nodes: readonly DraftNode[]; readonly input: NumericInput }

export type HudField = 'length' | 'angle'

export type WallToolEvent =
  | { readonly type: 'activate' }
  | { readonly type: 'pointerMove' }
  | { readonly type: 'pointerDown'; readonly clickCount: number }
  | { readonly type: 'digit'; readonly digit: string; readonly field: HudField }
  | { readonly type: 'inputChange'; readonly value: string; readonly field: HudField }
  | { readonly type: 'enter' }
  | { readonly type: 'escape' }
  | { readonly type: 'backspace' }

export interface WallToolContext {
  readonly cursor: Point
  readonly snap: SnapResult
  readonly shift: boolean
  readonly nodeAt: (point: Point) => NodeId | null
  readonly newNodeId: () => NodeId
  readonly newWallId: () => WallId
}

export interface WallHudModel {
  readonly lengthText: string
  readonly measuredText: string
  readonly editing: boolean
  readonly angleText: string
  readonly measuredAngleText: string
  readonly nodeCount: number
  readonly areaText?: undefined
}

export interface WallToolResult {
  readonly state: WallToolState
  readonly commands: readonly Command[]
  readonly overlays: readonly OverlayPrimitive[]
  readonly hud: WallHudModel | null
}

const EMPTY_INPUT: NumericInput = { value: '', angleText: '', frozenDirection: null }
const MIN_SEGMENT_MM = 1

export function initialWallState(): WallToolState {
  return { kind: 'idle' }
}

interface Candidate {
  readonly point: Point
  readonly direction: number
  readonly length: number
  readonly merged: NodeId | null
}

function angleOverride(input: NumericInput): number | null {
  const degrees = tryParseAngle(input.angleText)
  return degrees === null ? null : (degrees * Math.PI) / 180
}

function candidateOf(
  nodes: readonly DraftNode[],
  input: NumericInput,
  ctx: WallToolContext,
): Candidate {
  const origin = nodes[nodes.length - 1]!
  const frozen = angleOverride(input) ?? input.frozenDirection

  if (frozen !== null) {
    const len = input.value !== '' ? parseLength(input.value) : distance(origin, ctx.snap.point)
    const raw = pointAtDistance(origin, frozen, len)
    const point = { x: Math.round(raw.x), y: Math.round(raw.y) }
    return {
      point,
      direction: frozen,
      length: len,
      merged: ctx.nodeAt(point),
    }
  }

  const point = { x: Math.round(ctx.snap.point.x), y: Math.round(ctx.snap.point.y) }
  return {
    point,
    direction: angle(origin, point),
    length: distance(origin, point),
    merged: ctx.snap.merged,
  }
}

function freezeDirection(nodes: readonly DraftNode[], ctx: WallToolContext): number {
  const origin = nodes[nodes.length - 1]!
  if (distance(origin, ctx.snap.point) < MIN_SEGMENT_MM) return 0
  return snapAngle(angle(origin, ctx.snap.point), ctx.shift)
}

export function wallToolTransition(
  state: WallToolState,
  event: WallToolEvent,
  ctx: WallToolContext,
): WallToolResult {
  if (state.kind === 'idle') return fromIdle(state, event, ctx)
  return fromActive(state, event, ctx)
}

function fromIdle(
  state: WallToolState & { kind: 'idle' },
  event: WallToolEvent,
  ctx: WallToolContext,
): WallToolResult {
  if (event.type === 'pointerDown') {
    const anchor = makeNode(ctx, ctx.snap)
    return present({ kind: 'anchored', nodes: [anchor], input: EMPTY_INPUT }, ctx)
  }
  return present(state, ctx)
}

function fromActive(
  state: WallToolState & { kind: 'anchored' | 'drawing' },
  event: WallToolEvent,
  ctx: WallToolContext,
): WallToolResult {
  const { nodes, input } = state

  switch (event.type) {
    case 'pointerMove':
      return present(state, ctx)

    case 'digit': {
      if (event.field === 'angle') {
        return present(
          withInput(state, { ...input, angleText: input.angleText + event.digit }),
          ctx,
        )
      }
      const frozen = input.frozenDirection ?? freezeDirection(nodes, ctx)
      return present(
        withInput(state, { ...input, value: input.value + event.digit, frozenDirection: frozen }),
        ctx,
      )
    }

    case 'inputChange': {
      if (event.field === 'angle') {
        return present(withInput(state, { ...input, angleText: event.value }), ctx)
      }
      const frozen = input.frozenDirection ?? freezeDirection(nodes, ctx)
      return present(
        withInput(state, { ...input, value: event.value, frozenDirection: frozen }),
        ctx,
      )
    }

    case 'pointerDown': {
      const candidate = candidateOf(nodes, input, ctx)
      if (event.clickCount >= 2 && nodes.length >= 1) {
        return finishWall(nodes, ctx)
      }
      if (coincidesWithLast(nodes, candidate)) return present(state, ctx)
      return present(confirm(nodes, candidate, ctx), ctx)
    }

    case 'enter': {
      if (input.value !== '') {
        const candidate = candidateOf(nodes, input, ctx)
        if (candidate.length < MIN_SEGMENT_MM) return present(state, ctx)
        return present(confirm(nodes, candidate, ctx), ctx)
      }
      return finishWall(nodes, ctx)
    }

    case 'escape':
      if (input.value !== '') {
        return present(
          withInput(state, { ...input, value: '', frozenDirection: null }),
          ctx,
        )
      }
      if (input.angleText !== '') {
        return present(withInput(state, { ...input, angleText: '' }), ctx)
      }
      return present(dropLast(nodes), ctx)

    case 'backspace':
      if (input.value !== '') {
        return present(withInput(state, { ...input, value: input.value.slice(0, -1) }), ctx)
      }
      if (input.angleText !== '') {
        return present(withInput(state, { ...input, angleText: input.angleText.slice(0, -1) }), ctx)
      }
      return present(dropLast(nodes), ctx)

    default:
      return present(state, ctx)
  }
}

function makeNode(ctx: WallToolContext, snap: SnapResult): DraftNode {
  return {
    id: snap.merged ?? ctx.newNodeId(),
    x: Math.round(snap.point.x),
    y: Math.round(snap.point.y),
    reused: snap.merged !== null,
  }
}

function confirm(
  nodes: readonly DraftNode[],
  candidate: Candidate,
  ctx: WallToolContext,
): WallToolState {
  const node: DraftNode = {
    id: candidate.merged ?? ctx.newNodeId(),
    x: candidate.point.x,
    y: candidate.point.y,
    reused: candidate.merged !== null,
  }
  return { kind: 'drawing', nodes: [...nodes, node], input: EMPTY_INPUT }
}

function coincidesWithLast(nodes: readonly DraftNode[], candidate: Candidate): boolean {
  const last = nodes[nodes.length - 1]!
  return candidate.point.x === last.x && candidate.point.y === last.y
}

function dropLast(nodes: readonly DraftNode[]): WallToolState {
  if (nodes.length <= 1) return { kind: 'idle' }
  const remaining = nodes.slice(0, -1)
  const kind = remaining.length >= 2 ? 'drawing' : 'anchored'
  return { kind, nodes: remaining, input: EMPTY_INPUT }
}

function withInput(
  state: WallToolState & { kind: 'anchored' | 'drawing' },
  input: NumericInput,
): WallToolState {
  return { kind: state.kind, nodes: state.nodes, input }
}

function finishWall(nodes: readonly DraftNode[], ctx: WallToolContext): WallToolResult {
  if (nodes.length < 2) {
    return { state: { kind: 'idle' }, commands: [], overlays: [], hud: null }
  }
  const command: CreateWallCommand = {
    type: 'CreateWall',
    payload: {
      nodes: nodes.filter((n) => !n.reused).map((n) => ({ id: n.id, x: n.x, y: n.y })),
      segments: segments(nodes),
    },
  }
  return {
    state: { kind: 'idle' },
    commands: [command],
    overlays: [],
    hud: null,
  }
}

function segments(nodes: readonly DraftNode[]): { a: NodeId; b: NodeId }[] {
  const result: { a: NodeId; b: NodeId }[] = []
  for (let i = 1; i < nodes.length; i += 1) {
    result.push({ a: nodes[i - 1]!.id, b: nodes[i]!.id })
  }
  return result
}

function present(state: WallToolState, ctx: WallToolContext): WallToolResult {
  return {
    state,
    commands: [],
    overlays: wallToolOverlay(state, ctx),
    hud: hudModel(state, ctx),
  }
}

function hudModel(state: WallToolState, ctx: WallToolContext): WallHudModel | null {
  if (state.kind === 'idle') return null
  const candidate = candidateOf(state.nodes, state.input, ctx)
  const editing = state.input.value !== ''
  return {
    lengthText: state.input.value,
    measuredText: formatCm(candidate.length),
    editing,
    angleText: state.input.angleText,
    measuredAngleText: formatDeg(candidate.direction),
    nodeCount: state.nodes.length,
  }
}

export function wallToolOverlay(
  state: WallToolState,
  ctx: WallToolContext,
): readonly OverlayPrimitive[] {
  if (state.kind === 'idle') {
    return ctx.snap.merged !== null
      ? [{ kind: 'marker', role: 'snapNode', position: ctx.snap.point }]
      : []
  }
  const overlays: OverlayPrimitive[] = []
  const points = state.nodes.map((n) => ({ x: n.x, y: n.y }))
  const candidate = candidateOf(state.nodes, state.input, ctx)
  if (points.length >= 2) {
    overlays.push({ kind: 'polyline', role: 'draft', points, closed: false })
  }
  overlays.push({ kind: 'segment', role: 'ghost', a: points[points.length - 1]!, b: candidate.point })
  if (candidate.merged !== null) {
    overlays.push({ kind: 'marker', role: 'snapNode', position: candidate.point })
  }
  if (ctx.snap.targets.some((t) => t.kind === 'axis')) {
    overlays.push({
      kind: 'segment',
      role: 'axisGuide',
      a: points[points.length - 1]!,
      b: candidate.point,
    })
  }
  return overlays
}

function formatCm(d: number): string { return d <= 0 ? '' : String(Math.round(d / 10)) }
function formatDeg(r: number): string {
  const deg = ((r * 180) / Math.PI + 360) % 360
  return deg.toFixed(1).replace('.', ',')
}
