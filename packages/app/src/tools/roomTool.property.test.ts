import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  DocumentStore,
  computeRoomArea,
  pointAtDistance,
  validateDocumentErrors,
  type NodeId,
  type Point,
  type RoomId,
} from '@planta/core'
import {
  initialRoomState,
  roomToolTransition,
  type RoomToolContext,
  type RoomToolEvent,
  type RoomToolState,
} from './roomTool'
import { exactNodeAt, resolveToolSnap } from './snapContext'

/**
 * "Fechamento sempre fecha" (`10-testes.md` § Property tests).
 *
 * O ciclo é implícito no modelo — a última aresta liga `loop[n-1]` a `loop[0]`,
 * e o primeiro nó não é repetido no fim (`01-modelo-de-dominio.md`). Fechar,
 * então, é o cômodo sair com um nó por segmento confirmado, área não nula e
 * documento sem issue de nível `error`.
 */
function drawPolygon(segments: readonly { length: number; quadrant: number }[]) {
  const store = new DocumentStore()
  let state: RoomToolState = initialRoomState()
  let cursor: Point = { x: 0, y: 0 }
  let seq = 0

  function context(): RoomToolContext {
    const draft = state.kind === 'idle' ? [] : state.nodes
    const doc = store.current
    return {
      cursor,
      snap: resolveToolSnap(cursor, { doc, draft, scale: 0.1, shift: false, alt: false }),
      shift: false,
      nodeAt: (point) => exactNodeAt(point, { doc, draft }),
      newNodeId: () => `n_prop${++seq}` as NodeId,
      newRoomId: () => `r_prop${++seq}` as RoomId,
    }
  }

  function drive(event: RoomToolEvent) {
    const result = roomToolTransition(state, event, context())
    state = result.state
    for (const command of result.commands) store.dispatch(command)
    return result
  }

  drive({ type: 'pointerDown', clickCount: 1 })

  let at: Point = { x: 0, y: 0 }
  for (const segment of segments) {
    // Cursor deliberadamente fora do eixo: a direção vem do arredondamento
    // angular, não da posição bruta (`03` § Confirmar um segmento).
    const radians = (segment.quadrant * 90 + 3) * (Math.PI / 180)
    cursor = pointAtDistance(at, radians, 4000)
    for (const digit of String(Math.round(segment.length / 10))) {
      drive({ type: 'digit', digit, field: 'length' })
    }
    drive({ type: 'enter' })
    at = pointAtDistance(at, (segment.quadrant * 90 * Math.PI) / 180, segment.length)
    at = { x: Math.round(at.x), y: Math.round(at.y) }
  }

  drive({ type: 'close' })

  return store
}

const arbSegments = fc.array(
  fc.record({
    length: fc.integer({ min: 500, max: 6000 }).map((mm) => Math.round(mm / 10) * 10),
    quadrant: fc.integer({ min: 0, max: 3 }),
  }),
  { minLength: 2, maxLength: 6 },
)

describe('property — fechamento sempre fecha', () => {
  it('toda sequência de comprimentos e direções produz documento válido', () => {
    fc.assert(
      fc.property(arbSegments, (segments) => {
        const store = drawPolygon(segments)
        expect(validateDocumentErrors(store.current)).toEqual([])
      }),
      { numRuns: 200 },
    )
  })

  it('quando um cômodo é criado, o ciclo tem nós distintos e área não nula', () => {
    fc.assert(
      fc.property(arbSegments, (segments) => {
        const store = drawPolygon(segments)
        const room = store.current.rooms[0]
        if (!room) return

        expect(new Set(room.loop).size).toBe(room.loop.length)
        expect(room.loop.length).toBeGreaterThanOrEqual(3)
        expect(computeRoomArea(store.current, room.id)).toBeGreaterThan(0)
      }),
      { numRuns: 200 },
    )
  })

  it('todo nó do ciclo existe no documento', () => {
    fc.assert(
      fc.property(arbSegments, (segments) => {
        const store = drawPolygon(segments)
        const doc = store.current
        const room = doc.rooms[0]
        if (!room) return

        for (const nodeId of room.loop) {
          expect(doc.nodes.some((node) => node.id === nodeId)).toBe(true)
        }
      }),
      { numRuns: 200 },
    )
  })
})
