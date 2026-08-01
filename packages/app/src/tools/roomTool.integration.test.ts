import { describe, expect, it } from 'vitest'
import {
  DocumentStore,
  computeRoomArea,
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
import { exactNodeAt, resolveToolSnap } from './snapContext'

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
    // Pelo mesmo resolvedor que `App.svelte` usa: montar o `SnapContext` à mão
    // aqui deixaria o teste passar sobre um caminho que o app não percorre.
    const doc = store.current
    const draft = draftNodes()
    return {
      cursor,
      snap: resolveToolSnap(cursor, { doc, draft, scale: 0.1, shift, alt: false }),
      shift,
      nodeAt: (point) => exactNodeAt(point, { doc, draft }),
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
    for (const d of digits) drive({ type: 'digit', digit: d, field: 'length' }, cursor)
    return drive({ type: 'enter' }, cursor)
  }

  function typeAngle(digits: string, cursor: Point) {
    for (const d of digits) drive({ type: 'digit', digit: d, field: 'angle' }, cursor)
  }

  return { store, drive, type, typeAngle, get state() { return state } }
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

describe('Ferramenta Cômodo — entrada numérica que volta sobre um nó', () => {
  it('reusa o nó existente em vez de criar um segundo na mesma coordenada', () => {
    const h = makeHarness()
    h.drive({ type: 'pointerDown', clickCount: 1 }, { x: 0, y: 0 })
    h.type('50', { x: 4000, y: 0 })
    h.type('51', { x: 500, y: 4000 })
    // De volta para cima: o ponto confirmado cai exatamente sobre o segundo nó.
    h.type('51', { x: 500, y: -4000 })

    const nodes = h.state.kind === 'idle' ? [] : h.state.nodes
    const ids = nodes.map((node) => node.id)
    expect(new Set(ids).size).toBeLessThan(ids.length)
  })

  it('o documento nunca fica com nó coincidente nem ciclo repetido', () => {
    const h = makeHarness()
    h.drive({ type: 'pointerDown', clickCount: 1 }, { x: 0, y: 0 })
    h.type('50', { x: 4000, y: 0 })
    h.type('51', { x: 500, y: 4000 })
    h.type('51', { x: 500, y: -4000 })
    h.type('50', { x: 500, y: -4000 })
    h.drive({ type: 'close' })

    expect(validateDocumentErrors(h.store.current)).toEqual([])
  })
})

describe('Ferramenta Cômodo — entrada de ângulo no HUD (M2)', () => {
  it('o ângulo digitado congela a direção sem esperar Enter', () => {
    const h = makeHarness()
    h.drive({ type: 'pointerDown', clickCount: 1 }, { x: 0, y: 0 })

    // Cursor apontando para a direita; ângulo digitado aponta para baixo.
    const before = h.drive({ type: 'pointerMove' }, { x: 4000, y: 0 })
    expect(before.hud?.measuredAngleText).toBe('0,0')

    const after = h.drive({ type: 'inputChange', value: '90', field: 'angle' }, { x: 4000, y: 0 })
    expect(after.hud?.angleText).toBe('90')
    expect(after.hud?.measuredAngleText).toBe('90,0')
  })

  it('o segmento fantasma salta para o ângulo digitado antes de haver comprimento', () => {
    const h = makeHarness()
    h.drive({ type: 'pointerDown', clickCount: 1 }, { x: 0, y: 0 })
    const result = h.drive(
      { type: 'inputChange', value: '90', field: 'angle' },
      { x: 4000, y: 0 },
    )

    const ghost = result.overlays.find((o) => o.kind === 'segment' && o.role === 'ghost')
    expect(ghost).toBeDefined()
    if (ghost?.kind !== 'segment') throw new Error('fantasma ausente')
    expect(ghost.b.x).toBe(0)
    expect(ghost.b.y).toBe(4000)
  })

  it('ângulo e comprimento juntos produzem o segmento pedido', () => {
    const h = makeHarness()
    h.drive({ type: 'pointerDown', clickCount: 1 }, { x: 0, y: 0 })

    h.typeAngle('90', { x: 4000, y: 0 })
    h.type('250', { x: 4000, y: 0 })

    const nodes = h.state.kind === 'idle' ? [] : h.state.nodes
    expect(nodes).toHaveLength(2)
    expect({ x: nodes[1]!.x, y: nodes[1]!.y }).toEqual({ x: 0, y: 2500 })
  })

  it('o campo de ângulo é esvaziado a cada segmento confirmado', () => {
    const h = makeHarness()
    h.drive({ type: 'pointerDown', clickCount: 1 }, { x: 0, y: 0 })

    h.typeAngle('90', { x: 4000, y: 0 })
    const confirmed = h.type('250', { x: 4000, y: 0 })

    expect(confirmed.hud?.angleText).toBe('')
  })

  it('ângulo que não resolve não altera a direção', () => {
    const h = makeHarness()
    h.drive({ type: 'pointerDown', clickCount: 1 }, { x: 0, y: 0 })

    const result = h.drive(
      { type: 'inputChange', value: 'abc', field: 'angle' },
      { x: 4000, y: 0 },
    )

    expect(result.hud?.measuredAngleText).toBe('0,0')
  })

  it('ângulo fora de 0–359 é normalizado por módulo', () => {
    const h = makeHarness()
    h.drive({ type: 'pointerDown', clickCount: 1 }, { x: 0, y: 0 })

    h.typeAngle('450', { x: 4000, y: 0 })
    h.type('250', { x: 4000, y: 0 })

    const nodes = h.state.kind === 'idle' ? [] : h.state.nodes
    expect({ x: nodes[1]!.x, y: nodes[1]!.y }).toEqual({ x: 0, y: 2500 })
  })
})
