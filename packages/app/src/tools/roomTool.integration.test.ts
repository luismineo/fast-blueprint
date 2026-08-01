import { describe, expect, it } from 'vitest'
import {
  DocumentStore,
  computeRoomArea,
  resolveSnap,
  validateDocumentErrors,
  type NodeId,
  type Point,
  type RoomId,
} from '@planta/core'
import {
  initialRoomState,
  roomToolTransition,
  type DraftNode,
  type RoomToolContext,
  type RoomToolEvent,
  type RoomToolState,
} from './roomTool'

/**
 * Dirige a Ferramenta Cômodo de ponta a ponta — tool → DocumentStore — e
 * assere contra o **documento resultante**, nunca contra o payload.
 *
 * O teste unitário do M1 assertava `payload.nodes).toHaveLength(4)` e passava
 * com quatro ids idênticos, que o comando colapsava num polígono de área zero.
 */
function makeHarness() {
  const store = new DocumentStore()
  let state: RoomToolState = initialRoomState()
  let nodeSeq = 0
  let roomSeq = 0

  function draftNodes(): readonly DraftNode[] {
    return state.kind === 'idle' ? [] : state.nodes
  }

  function context(cursor: Point, shift = false): RoomToolContext {
    const doc = store.current
    const draft = draftNodes()
    const byId = new Map<string, { id: NodeId; x: number; y: number }>()
    for (const n of doc.nodes) byId.set(n.id, { id: n.id, x: n.x, y: n.y })
    for (const n of draft) byId.set(n.id, { id: n.id, x: n.x, y: n.y })

    const origin = draft.length > 0 ? draft[draft.length - 1]! : null

    return {
      cursor,
      snap: resolveSnap(cursor, {
        nodes: [...byId.values()],
        origin: origin ? { x: origin.x, y: origin.y } : null,
        gridSize: doc.meta.gridSize,
        scale: 0.1,
        shift,
        alt: false,
      }),
      shift,
      newNodeId: () => `n_t${++nodeSeq}` as NodeId,
      newRoomId: () => `r_t${++roomSeq}` as RoomId,
    }
  }

  function drive(event: RoomToolEvent, cursor: Point = { x: 0, y: 0 }, shift = false) {
    const result = roomToolTransition(state, event, context(cursor, shift))
    state = result.state
    for (const cmd of result.commands) store.dispatch(cmd)
    return result
  }

  function type(digits: string, cursor: Point) {
    for (const d of digits) drive({ type: 'digit', digit: d }, cursor)
    return drive({ type: 'enter' }, cursor)
  }

  return { store, drive, type, get state() { return state } }
}

describe('Ferramenta Cômodo — sequência de aceitação do M1', () => {
  it('R, clique, 320 Enter, 250 Enter, 320 Enter, C produz um cômodo de 8,00 m²', () => {
    const h = makeHarness()

    h.drive({ type: 'activate' })
    h.drive({ type: 'pointerDown', clickCount: 1 }, { x: 0, y: 0 })

    // Cursor deliberadamente fora do eixo (87°, não 90°): sem arredondamento
    // angular a direção sairia torta e a área não fecharia em 8,00 m².
    h.type('320', { x: 4000, y: 210 })
    h.type('250', { x: 170, y: 4000 })
    h.type('320', { x: -4000, y: 190 })

    const result = h.drive({ type: 'close' })

    const doc = h.store.current
    expect(doc.rooms).toHaveLength(1)

    const room = doc.rooms[0]!
    expect(new Set(room.loop).size).toBe(4)
    expect(doc.nodes).toHaveLength(4)
    expect(computeRoomArea(doc, room.id)).toBe(8_000_000)
    expect(validateDocumentErrors(doc)).toEqual([])
    expect(h.store.lastError).toBeNull()

    expect(doc.nodes.map((n) => `${n.x},${n.y}`).sort()).toEqual([
      '0,0',
      '0,2500',
      '3200,0',
      '3200,2500',
    ])

    expect(result.naming?.roomId).toBe(room.id)
  })

  it('undo depois de fechar devolve o documento vazio', () => {
    const h = makeHarness()
    h.drive({ type: 'pointerDown', clickCount: 1 }, { x: 0, y: 0 })
    h.type('320', { x: 4000, y: 0 })
    h.type('250', { x: 0, y: 4000 })
    h.type('320', { x: -4000, y: 0 })
    h.drive({ type: 'close' })

    expect(h.store.current.rooms).toHaveLength(1)
    h.store.undo()
    expect(h.store.current.rooms).toHaveLength(0)
  })

  it('clicar no nó inicial fecha reusando o nó, sem criar um quinto', () => {
    const h = makeHarness()
    h.drive({ type: 'pointerDown', clickCount: 1 }, { x: 0, y: 0 })
    h.type('320', { x: 4000, y: 0 })
    h.type('250', { x: 0, y: 4000 })
    h.type('320', { x: -4000, y: 0 })

    // Cursor sobre o nó inicial: o snap deve reusá-lo (causa raiz 6).
    h.drive({ type: 'pointerDown', clickCount: 1 }, { x: 2, y: 3 })

    const doc = h.store.current
    expect(doc.rooms).toHaveLength(1)
    expect(doc.nodes).toHaveLength(4)
    expect(new Set(doc.rooms[0]!.loop).size).toBe(4)
    expect(computeRoomArea(doc, doc.rooms[0]!.id)).toBe(8_000_000)
  })

  it('dois cômodos adjacentes compartilham a aresta: 6 nós, não 8', () => {
    const h = makeHarness()

    h.drive({ type: 'pointerDown', clickCount: 1 }, { x: 0, y: 0 })
    h.type('320', { x: 4000, y: 0 })
    h.type('250', { x: 0, y: 4000 })
    h.type('320', { x: -4000, y: 0 })
    h.drive({ type: 'close' })

    // Cursores relativos à origem corrente de cada segmento: o arredondamento
    // angular é medido a partir do último nó, não da origem do mundo.
    h.drive({ type: 'pointerDown', clickCount: 1 }, { x: 3200, y: 0 })
    h.type('320', { x: 7000, y: 0 })
    h.type('250', { x: 6400, y: 4000 })
    h.type('320', { x: 0, y: 2500 })
    h.drive({ type: 'close' })

    const doc = h.store.current
    expect(doc.rooms).toHaveLength(2)
    expect(doc.nodes).toHaveLength(6)
    expect(validateDocumentErrors(doc)).toEqual([])
  })

  it('todo nó confirmado recebe um id distinto', () => {
    const h = makeHarness()
    h.drive({ type: 'pointerDown', clickCount: 1 }, { x: 0, y: 0 })
    h.type('320', { x: 4000, y: 0 })
    h.type('250', { x: 0, y: 4000 })
    h.type('320', { x: -4000, y: 0 })

    const ids = h.state.kind === 'idle' ? [] : h.state.nodes.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toHaveLength(4)
  })
})
