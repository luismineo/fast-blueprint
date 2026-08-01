import type {
  Command,
  CreateRoomCommand,
  NodeId,
  OverlayPrimitive,
  Point,
  RoomId,
  SnapResult,
} from '@planta/core'
import {
  angle,
  centroid,
  degreesToRadians,
  distance,
  formatArea,
  parseLength,
  pointAtDistance,
  polygonArea,
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

export type RoomToolState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'anchored'; readonly nodes: readonly DraftNode[]; readonly input: NumericInput }
  | { readonly kind: 'drawing'; readonly nodes: readonly DraftNode[]; readonly input: NumericInput }

export type HudField = 'length' | 'angle'

export type RoomToolEvent =
  | { readonly type: 'activate' }
  | { readonly type: 'pointerMove' }
  | { readonly type: 'pointerDown'; readonly clickCount: number }
  | { readonly type: 'digit'; readonly digit: string; readonly field: HudField }
  | { readonly type: 'inputChange'; readonly value: string; readonly field: HudField }
  | { readonly type: 'enter' }
  | { readonly type: 'close' }
  | { readonly type: 'escape' }
  | { readonly type: 'backspace' }

export interface RoomToolContext {
  readonly cursor: Point
  readonly snap: SnapResult
  readonly shift: boolean
  /**
   * Nó exatamente nesta coordenada, ou `null`.
   *
   * A entrada numérica calcula o ponto confirmado a partir da direção travada
   * e do comprimento digitado, sem passar pelo resolvedor de snap — que moveria
   * o ponto e estragaria o comprimento exato. Sem esta consulta o traço pode
   * voltar sobre um nó já confirmado e criar um segundo nó na mesma
   * coordenada, violando E6.
   */
  readonly nodeAt: (point: Point) => NodeId | null
  readonly newNodeId: () => NodeId
  readonly newRoomId: () => RoomId
}

export interface RoomHudModel {
  /** Dígitos já digitados. Vazio enquanto o usuário não digitou nada. */
  readonly lengthText: string
  /** Comprimento do candidato sob o cursor, em cm. Mostrado como dica. */
  readonly measuredText: string
  readonly editing: boolean
  /** Graus digitados. Vazio significa "sem override de direção". */
  readonly angleText: string
  /** Direção do candidato, mostrada como dica quando o campo está vazio. */
  readonly measuredAngleText: string
  readonly nodeCount: number
  readonly areaText: string | null
}

export interface NamingRequest {
  readonly roomId: RoomId
  readonly centroid: Point
}

export interface RoomToolResult {
  readonly state: RoomToolState
  readonly commands: readonly Command[]
  readonly overlays: readonly OverlayPrimitive[]
  readonly hud: RoomHudModel | null
  readonly naming: NamingRequest | null
}

const EMPTY_INPUT: NumericInput = { value: '', angleText: '', frozenDirection: null }
const MIN_NODES_TO_CLOSE = 3
const MIN_SEGMENT_MM = 1

export function initialRoomState(): RoomToolState {
  return { kind: 'idle' }
}

interface Candidate {
  readonly point: Point
  readonly direction: number
  readonly length: number
  readonly merged: NodeId | null
}

/**
 * Direção do ângulo digitado, ou `null` quando o campo está vazio ou não
 * resolve.
 *
 * O override é derivado do texto a cada avaliação em vez de guardado: uma
 * segunda cópia da direção poderia discordar do que o campo mostra.
 */
function angleOverride(input: NumericInput): number | null {
  const degrees = tryParseAngle(input.angleText)
  return degrees === null ? null : degreesToRadians(degrees)
}

/**
 * Ponto que o próximo segmento atingiria se fosse confirmado agora.
 *
 * Com direção travada — pelo primeiro dígito de comprimento ou pelo campo de
 * ângulo — o comprimento vem do campo quando ele tem valor, e da distância do
 * cursor quando não tem. É o que faz o segmento fantasma saltar para o ângulo
 * digitado antes de o comprimento existir.
 */
function candidateOf(
  nodes: readonly DraftNode[],
  input: NumericInput,
  ctx: RoomToolContext,
): Candidate {
  const origin = nodes[nodes.length - 1]!
  const frozen = angleOverride(input) ?? input.frozenDirection

  if (frozen !== null) {
    const length =
      input.value !== '' ? parseLength(input.value) : distance(origin, ctx.snap.point)
    const raw = pointAtDistance(origin, frozen, length)
    const point = { x: Math.round(raw.x), y: Math.round(raw.y) }
    return {
      point,
      direction: frozen,
      length,
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

/**
 * Direção travada no primeiro dígito: arredondamento angular sobre a direção
 * do cursor, não a Classe 2 do resolvedor de snap, cuja tolerância é de
 * distância perpendicular e não alcançaria 87° → 90° (`specs/03` § Confirmar
 * um segmento).
 */
function freezeDirection(nodes: readonly DraftNode[], ctx: RoomToolContext): number {
  const origin = nodes[nodes.length - 1]!
  if (distance(origin, ctx.snap.point) < MIN_SEGMENT_MM) return 0
  return snapAngle(angle(origin, ctx.snap.point), ctx.shift)
}

export function roomToolTransition(
  state: RoomToolState,
  event: RoomToolEvent,
  ctx: RoomToolContext,
): RoomToolResult {
  if (state.kind === 'idle') return fromIdle(state, event, ctx)
  return fromActive(state, event, ctx)
}

function fromIdle(
  state: RoomToolState & { kind: 'idle' },
  event: RoomToolEvent,
  ctx: RoomToolContext,
): RoomToolResult {
  if (event.type === 'pointerDown') {
    const anchor = makeNode(ctx.snap, ctx)
    return present({ kind: 'anchored', nodes: [anchor], input: EMPTY_INPUT }, ctx)
  }
  return present(state, ctx)
}

function fromActive(
  state: RoomToolState & { kind: 'anchored' | 'drawing' },
  event: RoomToolEvent,
  ctx: RoomToolContext,
): RoomToolResult {
  const { nodes, input } = state

  switch (event.type) {
    case 'activate':
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
      // O campo de ângulo trava a direção no `oninput`, não no `Enter`: o salto
      // do segmento fantasma é o retorno visual de que a direção travou
      // (`03-ferramentas-e-interacao.md` § HUD de desenho).
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

      if (closesOnFirstNode(nodes, candidate)) return closeRoom(nodes, ctx)
      if (event.clickCount >= 2 && nodes.length >= MIN_NODES_TO_CLOSE) {
        return closeRoom(nodes, ctx)
      }
      if (coincidesWithLast(nodes, candidate)) return present(state, ctx)

      return present(confirm(nodes, candidate, ctx), ctx)
    }

    case 'enter': {
      if (input.value !== '') {
        const candidate = candidateOf(nodes, input, ctx)
        if (candidate.length < MIN_SEGMENT_MM) return present(state, ctx)
        if (closesOnFirstNode(nodes, candidate)) return closeRoom(nodes, ctx)
        return present(confirm(nodes, candidate, ctx), ctx)
      }
      return nodes.length >= MIN_NODES_TO_CLOSE ? closeRoom(nodes, ctx) : present(state, ctx)
    }

    case 'close':
      return nodes.length >= MIN_NODES_TO_CLOSE ? closeRoom(nodes, ctx) : present(state, ctx)

    case 'escape':
      // `Esc` limpa o campo de comprimento inteiro numa pressão; o ângulo
      // digitado sobrevive, porque corrigir a medida não é motivo para perder
      // a direção que já estava travada.
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
        return present(
          withInput(state, { ...input, angleText: input.angleText.slice(0, -1) }),
          ctx,
        )
      }
      return present(dropLast(nodes), ctx)
  }
}

function makeNode(snap: SnapResult, ctx: RoomToolContext): DraftNode {
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
  ctx: RoomToolContext,
): RoomToolState {
  const node: DraftNode = {
    id: candidate.merged ?? ctx.newNodeId(),
    x: candidate.point.x,
    y: candidate.point.y,
    reused: candidate.merged !== null,
  }
  return { kind: 'drawing', nodes: [...nodes, node], input: EMPTY_INPUT }
}

function closesOnFirstNode(nodes: readonly DraftNode[], candidate: Candidate): boolean {
  if (nodes.length < MIN_NODES_TO_CLOSE) return false
  const first = nodes[0]!
  if (candidate.merged !== null) return candidate.merged === first.id
  return candidate.point.x === first.x && candidate.point.y === first.y
}

function coincidesWithLast(nodes: readonly DraftNode[], candidate: Candidate): boolean {
  const last = nodes[nodes.length - 1]!
  return candidate.point.x === last.x && candidate.point.y === last.y
}

function dropLast(nodes: readonly DraftNode[]): RoomToolState {
  if (nodes.length <= 1) return { kind: 'idle' }
  const remaining = nodes.slice(0, -1)
  const kind = remaining.length >= 2 ? 'drawing' : 'anchored'
  return { kind, nodes: remaining, input: EMPTY_INPUT }
}

function withInput(
  state: RoomToolState & { kind: 'anchored' | 'drawing' },
  input: NumericInput,
): RoomToolState {
  return { kind: state.kind, nodes: state.nodes, input }
}

function closeRoom(nodes: readonly DraftNode[], ctx: RoomToolContext): RoomToolResult {
  const roomId = ctx.newRoomId()
  const command: CreateRoomCommand = {
    type: 'CreateRoom',
    payload: {
      nodes: nodes.filter((n) => !n.reused).map((n) => ({ id: n.id, x: n.x, y: n.y })),
      loop: nodes.map((n) => n.id),
      name: '',
      roomId,
    },
  }

  return {
    state: { kind: 'idle' },
    commands: [command],
    overlays: [],
    hud: null,
    naming: { roomId, centroid: centroid(nodes.map((n) => ({ x: n.x, y: n.y }))) },
  }
}

function present(state: RoomToolState, ctx: RoomToolContext): RoomToolResult {
  return {
    state,
    commands: [],
    overlays: roomToolOverlay(state, ctx),
    hud: hudModel(state, ctx),
    naming: null,
  }
}

function hudModel(state: RoomToolState, ctx: RoomToolContext): RoomHudModel | null {
  if (state.kind === 'idle') return null

  const candidate = candidateOf(state.nodes, state.input, ctx)
  const editing = state.input.value !== ''
  const provisional = [...state.nodes.map((n) => ({ x: n.x, y: n.y })), candidate.point]

  return {
    lengthText: state.input.value,
    measuredText: formatCentimeters(candidate.length),
    editing,
    angleText: state.input.angleText,
    measuredAngleText: formatDegrees(candidate.direction),
    nodeCount: state.nodes.length,
    areaText:
      state.nodes.length >= MIN_NODES_TO_CLOSE ? formatArea(polygonArea(provisional)) : null,
  }
}

/**
 * Traço em andamento como geometria declarativa: polilinha confirmada,
 * segmento fantasma até o candidato, e marcadores de snap.
 */
export function roomToolOverlay(
  state: RoomToolState,
  ctx: RoomToolContext,
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

  if (closesOnFirstNode(state.nodes, candidate)) {
    overlays.push({ kind: 'marker', role: 'closeTarget', position: points[0]! })
  } else if (candidate.merged !== null) {
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

function formatCentimeters(lengthMm: number): string {
  return lengthMm <= 0 ? '' : String(Math.round(lengthMm / 10))
}

function formatDegrees(directionRad: number): string {
  const deg = ((directionRad * 180) / Math.PI + 360) % 360
  return `${deg.toFixed(1).replace('.', ',')}°`
}
