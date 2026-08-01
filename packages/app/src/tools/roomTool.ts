// ============================================================
// Ferramenta Cômodo — spec 03 § Cômodo, máquina de estados pura
// ============================================================

import type { Point, SnapResult, NodeId, CreateRoomCommand } from '@planta/core'
import { computeRoomArea, formatLength, formatAngle, formatArea, parseLength } from '@planta/core'
import { angle, pointAtDistance } from '@planta/core'

// ============================================================
// Estado
// ============================================================

export type RoomToolState =
  | { kind: 'idle' }
  | { kind: 'anchored'; anchor: Point; anchors: SnapNode[] }
  | {
      kind: 'drawing'
      anchor: Point
      anchors: SnapNode[] // todos os pontos confirmados incluindo anchor
      confirmedNodes: SnapNode[]
      frozenDirection?: number // radianos, congelada após primeiro dígito
      inputValue?: string // valor atual do campo de comprimento
    }

export interface SnapNode {
  id: NodeId
  x: number
  y: number
}

// ============================================================
// Transições via eventos
// ============================================================

export type RoomToolEvent =
  | { type: 'pointerDown'; point: Point; snapResult: SnapResult }
  | { type: 'key'; key: string; shift: boolean }
  | { type: 'digit'; digit: string } // dígito '0'-'9'
  | { type: 'enter' } // confirma segmento ou fecha
  | { type: 'c' } // fecha polígono
  | { type: 'escape' } // desfaz último segmento
  | { type: 'backspace' } // desfaz último segmento (campo vazio)

export type RoomToolResult = {
  state: RoomToolState
  command: CreateRoomCommand | null
  direction: number | null // ângulo do mouse (rad), para HUD
  segmentLength: number // comprimento do segmento candidato, 0 em idle
  provisionalArea: number | null // mm², null se <3 pontos
  nodeCount: number // total de pontos confirmados (0 em idle, 1 em anchored)
}

// ============================================================
// Máquina de estados
// ============================================================

export function initialRoomState(): RoomToolState {
  return { kind: 'idle' }
}

export function roomToolTransition(
  state: RoomToolState,
  event: RoomToolEvent,
  cursor: Point,
  origin: Point | null, // último nó confirmado ou anchor
): RoomToolResult {
  switch (state.kind) {
    case 'idle':
      return handleIdle(event, cursor)
    case 'anchored':
      return handleAnchored(state, event, cursor)
    case 'drawing':
      return handleDrawing(state, event, cursor)
  }
}

// ============================================================
// Idle
// ============================================================

function handleIdle(event: RoomToolEvent, cursor: Point): RoomToolResult {
  if (event.type === 'pointerDown') {
    const point = event.snapResult.point
    const snapNode: SnapNode = {
      id: event.snapResult.merged ?? ('n_new' as NodeId),
      x: Math.round(point.x),
      y: Math.round(point.y),
    }
    return {
      state: {
        kind: 'anchored',
        anchor: { x: snapNode.x, y: snapNode.y },
        anchors: [snapNode],
      },
      command: null,
      direction: angle(cursor, cursor), // 0
      segmentLength: 0,
      provisionalArea: null,
      nodeCount: 1,
    }
  }
  return noopResult(stateFromIdle(cursor))
}

function stateFromIdle(_cursor: Point): RoomToolState {
  return { kind: 'idle' }
}

// ============================================================
// Anchored
// ============================================================

function handleAnchored(
  state: RoomToolState & { kind: 'anchored' },
  event: RoomToolEvent,
  cursor: Point,
): RoomToolResult {
  const origin = state.anchor

  switch (event.type) {
    case 'pointerDown': {
      const point = event.snapResult.point
      const snapNode: SnapNode = {
        id: event.snapResult.merged ?? ('n_tmp' as NodeId),
        x: Math.round(point.x),
        y: Math.round(point.y),
      }
      return {
        state: {
          kind: 'drawing',
          anchor: state.anchor,
          anchors: [...state.anchors, snapNode],
          confirmedNodes: [snapNode],
        },
        command: null,
        direction: angle(origin, point),
        segmentLength: Math.hypot(point.x - origin.x, point.y - origin.y),
        provisionalArea: null,
        nodeCount: 2,
      }
    }
    case 'digit': {
      const dir = angle(origin, cursor)
      return {
        state: {
          kind: 'drawing',
          anchor: state.anchor,
          anchors: state.anchors,
          confirmedNodes: [],
          frozenDirection: dir,
          inputValue: event.digit,
        },
        command: null,
        direction: dir,
        segmentLength: parseLength(event.digit),
        provisionalArea: null,
        nodeCount: 1,
      }
    }
    case 'enter': {
      // Enter com campo vazio = tentativa de fechar, mas < 3 nós → ignorado
      return anchoredResult(state)
    }
    case 'escape':
    case 'backspace':
      return {
        state: { kind: 'idle' },
        command: null,
        direction: null,
        segmentLength: 0,
        provisionalArea: null,
        nodeCount: 0,
      }
    case 'c':
      // C com <3 nós → ignorado
      return anchoredResult(state)
    default:
      return anchoredResult(state)
  }
}

function anchoredResult(
  state: RoomToolState & { kind: 'anchored' },
): RoomToolResult {
  const origin = state.anchor
  return {
    state,
    command: null,
    direction: null,
    segmentLength: 0,
    provisionalArea: null,
    nodeCount: 1,
  }
}

// ============================================================
// Drawing
// ============================================================

function handleDrawing(
  state: RoomToolState & { kind: 'drawing' },
  event: RoomToolEvent,
  cursor: Point,
): RoomToolResult {
  const origin =
    state.confirmedNodes.length > 0
      ? state.confirmedNodes[state.confirmedNodes.length - 1]!
      : state.anchor

  const allPoints = [state.anchor, ...state.confirmedNodes]
  const totalNodes = allPoints.length

  switch (event.type) {
    case 'pointerDown': {
      const point = event.snapResult.point
      const merged = event.snapResult.merged

      // Verifica se clicou no nó inicial → fecha
      if (merged && totalNodes >= 2) {
        const firstNode = state.anchors[0]!
        if (merged === firstNode.id || (point.x === firstNode.x && point.y === firstNode.y)) {
          const loop = [...state.anchors] // já inclui o nó inicial reusado
          return createRoomResult(loop, state.anchor)
        }
      }

      // Confirma segmento no ponto do snap
      const snapNode: SnapNode = {
        id: merged ?? ('n_tmp' as NodeId),
        x: Math.round(point.x),
        y: Math.round(point.y),
      }
      return {
        state: {
          kind: 'drawing',
          anchor: state.anchor,
          anchors: [...state.anchors, snapNode],
          confirmedNodes: [...state.confirmedNodes, snapNode],
          frozenDirection: undefined,
          inputValue: undefined,
        },
        command: null,
        direction: angle(origin, point),
        segmentLength: Math.hypot(point.x - origin.x, point.y - origin.y),
        provisionalArea: computeArea([...allPoints, point]),
        nodeCount: totalNodes + 1,
      }
    }

    case 'digit': {
      const dir = state.frozenDirection ?? angle(origin, cursor)
      return {
        state: {
          ...state,
          frozenDirection: dir,
          inputValue: (state.inputValue ?? '') + event.digit,
        },
        command: null,
        direction: dir,
        segmentLength: parseLength((state.inputValue ?? '') + event.digit),
        provisionalArea: state.confirmedNodes.length >= 1 ? computeArea(allPoints) : null,
        nodeCount: totalNodes,
      }
    }

    case 'enter': {
      // Se tem frozenDirection e inputValue → confirma segmento numérico
      if (state.frozenDirection !== undefined && state.inputValue) {
        const length = parseLength(state.inputValue)
        const nextPoint = pointAtDistance(origin, state.frozenDirection, length)
        const rounded: SnapNode = {
          id: ('n_num' as NodeId),
          x: Math.round(nextPoint.x),
          y: Math.round(nextPoint.y),
        }
        const newAllPoints = [...allPoints, rounded]
        return {
          state: {
            kind: 'drawing',
            anchor: state.anchor,
            anchors: [...state.anchors, rounded],
            confirmedNodes: [...state.confirmedNodes, rounded],
            frozenDirection: undefined,
            inputValue: undefined,
          },
          command: null,
          direction: state.frozenDirection,
          segmentLength: length,
          provisionalArea: computeArea(newAllPoints),
          nodeCount: totalNodes + 1,
        }
      }

      // Enter com campo vazio → fecha (se ≥ 3 nós)
      if (totalNodes >= 3) {
        return createRoomResult(state.anchors, state.anchor)
      }
      return drawingResult(state, origin, allPoints, totalNodes)
    }

    case 'c': {
      if (totalNodes >= 3) {
        return createRoomResult(state.anchors, state.anchor)
      }
      return drawingResult(state, origin, allPoints, totalNodes)
    }

    case 'escape':
    case 'backspace': {
      if (state.inputValue) {
        // Remove último dígito
        const newValue = state.inputValue.slice(0, -1)
        if (newValue === '') {
          return {
            state: { ...state, inputValue: undefined, frozenDirection: undefined },
            command: null,
            direction: angle(origin, cursor),
            segmentLength: Math.hypot(cursor.x - origin.x, cursor.y - origin.y),
            provisionalArea: state.confirmedNodes.length >= 1 ? computeArea(allPoints) : null,
            nodeCount: totalNodes,
          }
        }
        return {
          state: { ...state, inputValue: newValue },
          command: null,
          direction: state.frozenDirection ?? angle(origin, cursor),
          segmentLength: parseLength(newValue),
          provisionalArea: state.confirmedNodes.length >= 1 ? computeArea(allPoints) : null,
          nodeCount: totalNodes,
        }
      }

      // Remove último segmento
      if (state.confirmedNodes.length > 1) {
        const newConfirmed = state.confirmedNodes.slice(0, -1)
        const newAnchors = state.anchors.slice(0, -1)
        const newAll = [state.anchor, ...newConfirmed]
        return {
          state: {
            kind: 'drawing',
            anchor: state.anchor,
            anchors: newAnchors,
            confirmedNodes: newConfirmed,
          },
          command: null,
          direction: angle(origin, cursor),
          segmentLength: Math.hypot(cursor.x - origin.x, cursor.y - origin.y),
          provisionalArea: newConfirmed.length >= 2 ? computeArea(newAll) : null,
          nodeCount: 1 + newConfirmed.length,
        }
      }

      // Volta para Anchored
      return {
        state: {
          kind: 'anchored',
          anchor: state.anchor,
          anchors: [state.anchors[0]!],
        },
        command: null,
        direction: null,
        segmentLength: 0,
        provisionalArea: null,
        nodeCount: 1,
      }
    }

    default:
      return drawingResult(state, origin, allPoints, totalNodes)
  }
}

function drawingResult(
  state: RoomToolState & { kind: 'drawing' },
  origin: Point,
  allPoints: Point[],
  totalNodes: number,
): RoomToolResult {
  const hasFrozen = state.frozenDirection !== undefined
  return {
    state,
    command: null,
    direction: hasFrozen ? state.frozenDirection! : angle(origin, { x: 0, y: 0 } as Point),
    segmentLength: hasFrozen && state.inputValue ? parseLength(state.inputValue) : 0,
    provisionalArea: totalNodes >= 3 ? computeArea(allPoints) : null,
    nodeCount: totalNodes,
  }
}

// ============================================================
// Helpers
// ============================================================

function noopResult(state: RoomToolState): RoomToolResult {
  return {
    state,
    command: null,
    direction: null,
    segmentLength: 0,
    provisionalArea: null,
    nodeCount: 0,
  }
}

function computeArea(points: Point[]): number {
  if (points.length < 3) return 0
  // Fecha o polígono implicitamente
  const closed = [...points, points[0]!]
  let area = 0
  for (let i = 0; i < closed.length - 1; i++) {
    area += closed[i]!.x * closed[i + 1]!.y - closed[i + 1]!.x * closed[i]!.y
  }
  return Math.abs(area) / 2
}

function createRoomResult(
  anchors: SnapNode[],
  _anchor: Point,
): RoomToolResult {
  // Gera o comando CreateRoom
  const nodes = anchors.map((a) => ({
    id: a.id,
    x: a.x,
    y: a.y,
  }))
  const loop = anchors.map((a) => a.id)

  return {
    state: { kind: 'idle' },
    command: {
      type: 'CreateRoom',
      payload: {
        nodes,
        loop,
        name: '', // será preenchido pelo app com nome default
      },
    },
    direction: null,
    segmentLength: 0,
    provisionalArea: null,
    nodeCount: 0,
  }
}