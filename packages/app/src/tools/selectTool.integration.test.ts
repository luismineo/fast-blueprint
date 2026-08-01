import { describe, expect, it } from 'vitest'
import {
  DocumentStore,
  applyCommand,
  computeRoomArea,
  createEmptyDocument,
  hitTest,
  validateDocumentErrors,
  type NodeId,
  type PlanDocument,
  type Point,
  type RoomId,
  type Selection,
} from '@planta/core'
import {
  initialSelectState,
  selectToolTransition,
  type EditRequest,
  type SelectToolContext,
  type SelectToolEvent,
  type SelectToolState,
} from './selectTool'
import { resolveToolSnap } from './snapContext'

const n = (id: string): NodeId => id as NodeId
const LEFT = 'left' as RoomId
const RIGHT = 'right' as RoomId

function twoAdjacentRooms(): PlanDocument {
  const first = applyCommand(createEmptyDocument(), {
    type: 'CreateRoom',
    payload: {
      nodes: [
        { id: n('a'), x: 0, y: 0 },
        { id: n('b'), x: 3200, y: 0 },
        { id: n('c'), x: 3200, y: 2500 },
        { id: n('d'), x: 0, y: 2500 },
      ],
      loop: [n('a'), n('b'), n('c'), n('d')],
      name: 'Esquerda',
      roomId: LEFT,
    },
  })

  return applyCommand(first.document, {
    type: 'CreateRoom',
    payload: {
      nodes: [
        { id: n('e'), x: 3200, y: 0 },
        { id: n('f'), x: 6400, y: 0 },
        { id: n('g'), x: 6400, y: 2500 },
        { id: n('h'), x: 3200, y: 2500 },
      ],
      loop: [n('e'), n('f'), n('g'), n('h')],
      name: 'Direita',
      roomId: RIGHT,
    },
  }).document
}

/**
 * Dirige a Ferramenta Selecionar de ponta a ponta — tool → DocumentStore — e
 * assere contra o **documento resultante**, nunca contra o payload.
 */
function makeHarness(doc: PlanDocument = twoAdjacentRooms()) {
  const store = new DocumentStore(doc)
  let state: SelectToolState = initialSelectState()
  let selection: Selection = []
  let cursor: Point = { x: 0, y: 0 }
  let idSeq = 0
  let lastEdit: EditRequest | null = null

  function context(alt = false): SelectToolContext {
    const current = store.current
    return {
      doc: current,
      cursor,
      hit: hitTest(cursor, { doc: current, scale: 0.1 }),
      selection,
      snap: (point, exclude) =>
        resolveToolSnap(point, {
          doc: current,
          draft: [],
          scale: 0.1,
          shift: false,
          alt,
          exclude,
        }),
      newNodeId: () => `n_s${++idSeq}` as NodeId,
    }
  }

  function drive(event: SelectToolEvent, at?: Point, alt = false) {
    if (at) cursor = at
    const result = selectToolTransition(state, event, context(alt))
    state = result.state
    selection = result.selection
    if (result.edit) lastEdit = result.edit

    for (const command of result.commands) store.dispatch(command)
    if (result.historyBoundary === 'commit') store.sealPending()
    if (result.historyBoundary === 'abort') store.abortPending()

    return result
  }

  const nodeAt = (id: string) => {
    const node = store.current.nodes.find((candidate) => candidate.id === id)
    return node ? { x: node.x, y: node.y } : null
  }

  return {
    store,
    drive,
    nodeAt,
    get selection() {
      return selection
    },
    get lastEdit() {
      return lastEdit
    },
  }
}

function dragNode(
  harness: ReturnType<typeof makeHarness>,
  from: Point,
  path: readonly Point[],
  alt = false,
) {
  harness.drive({ type: 'pointerDown', clickCount: 1, additive: false }, from, alt)
  for (const step of path) harness.drive({ type: 'pointerMove' }, step, alt)
  harness.drive({ type: 'pointerUp' }, path[path.length - 1] ?? from, alt)
}

describe('Ferramenta Selecionar — seleção', () => {
  it('clique num nó seleciona o nó', () => {
    const h = makeHarness()
    h.drive({ type: 'pointerDown', clickCount: 1, additive: false }, { x: 0, y: 0 })

    expect(h.selection).toEqual([{ kind: 'node', nodeId: n('a') }])
  })

  it('clique em área vazia limpa a seleção', () => {
    const h = makeHarness()
    h.drive({ type: 'pointerDown', clickCount: 1, additive: false }, { x: 0, y: 0 })
    h.drive({ type: 'pointerUp' }, { x: 0, y: 0 })

    h.drive({ type: 'pointerDown', clickCount: 1, additive: false }, { x: 20000, y: 20000 })
    h.drive({ type: 'pointerUp' }, { x: 20000, y: 20000 })

    expect(h.selection).toEqual([])
  })

  it('Ctrl+clique acrescenta e remove', () => {
    const h = makeHarness()
    h.drive({ type: 'pointerDown', clickCount: 1, additive: false }, { x: 0, y: 0 })
    h.drive({ type: 'pointerUp' }, { x: 0, y: 0 })
    h.drive({ type: 'pointerDown', clickCount: 1, additive: true }, { x: 3200, y: 0 })

    expect(h.selection).toHaveLength(2)

    h.drive({ type: 'pointerDown', clickCount: 1, additive: true }, { x: 3200, y: 0 })
    expect(h.selection).toHaveLength(1)
  })

  it('clique sem movimento não abre entrada pendente nem empilha histórico', () => {
    const h = makeHarness()
    h.drive({ type: 'pointerDown', clickCount: 1, additive: false }, { x: 0, y: 0 })
    h.drive({ type: 'pointerUp' }, { x: 0, y: 0 })

    expect(h.store.hasPending).toBe(false)
    expect(h.store.canUndo).toBe(false)
  })

  it('retângulo seleciona só quem está completamente envolvido', () => {
    const h = makeHarness()
    h.drive({ type: 'pointerDown', clickCount: 1, additive: false }, { x: -500, y: -500 })
    h.drive({ type: 'pointerMove' }, { x: 3300, y: 2600 })
    h.drive({ type: 'pointerUp' }, { x: 3300, y: 2600 })

    expect(h.selection.filter((ref) => ref.kind === 'room')).toEqual([
      { kind: 'room', roomId: LEFT },
    ])
  })

  it('Ctrl+A seleciona todos os cômodos e Esc limpa', () => {
    const h = makeHarness()
    h.drive({ type: 'selectAll' })
    expect(h.selection).toHaveLength(2)

    h.drive({ type: 'escape' })
    expect(h.selection).toEqual([])
  })

  it('Delete exclui cômodo selecionado, e ignora nó e aresta', () => {
    const h = makeHarness()

    h.drive({ type: 'pointerDown', clickCount: 1, additive: false }, { x: 0, y: 0 })
    h.drive({ type: 'pointerUp' }, { x: 0, y: 0 })
    h.drive({ type: 'deleteSelection' })
    expect(h.store.current.rooms).toHaveLength(2)

    h.drive({ type: 'pointerDown', clickCount: 1, additive: false }, { x: 1600, y: 1250 })
    h.drive({ type: 'pointerUp' }, { x: 1600, y: 1250 })
    h.drive({ type: 'deleteSelection' })
    expect(h.store.current.rooms).toHaveLength(1)
  })
})

describe('Ferramenta Selecionar — arrastar nó', () => {
  it('arrastar nó compartilhado atualiza a área dos dois cômodos', () => {
    const h = makeHarness()
    const before = {
      left: computeRoomArea(h.store.current, LEFT),
      right: computeRoomArea(h.store.current, RIGHT),
    }

    dragNode(h, { x: 3200, y: 0 }, [
      { x: 3600, y: 0 },
      { x: 4000, y: 0 },
      { x: 4200, y: 0 },
    ])

    expect(computeRoomArea(h.store.current, LEFT)).toBeGreaterThan(before.left)
    expect(computeRoomArea(h.store.current, RIGHT)).toBeLessThan(before.right)
    expect(validateDocumentErrors(h.store.current)).toHaveLength(0)
  })

  it('um arraste inteiro é uma entrada de undo, e desfazer devolve a posição inicial', () => {
    const h = makeHarness()

    dragNode(h, { x: 3200, y: 0 }, [
      { x: 3600, y: 0 },
      { x: 4000, y: 0 },
      { x: 4200, y: 0 },
    ])

    expect(h.nodeAt('b')).toEqual({ x: 4200, y: 0 })
    expect(h.store.canUndo).toBe(true)

    h.store.undo()
    expect(h.nodeAt('b')).toEqual({ x: 3200, y: 0 })
    expect(h.store.canUndo).toBe(false)
  })

  it('Esc no meio do arraste reverte e não empilha entrada', () => {
    const h = makeHarness()

    h.drive({ type: 'pointerDown', clickCount: 1, additive: false }, { x: 3200, y: 0 })
    h.drive({ type: 'pointerMove' }, { x: 3600, y: 0 })
    h.drive({ type: 'pointerMove' }, { x: 4000, y: 0 })
    h.drive({ type: 'escape' })

    expect(h.nodeAt('b')).toEqual({ x: 3200, y: 0 })
    expect(h.store.canUndo).toBe(false)
    expect(h.store.hasPending).toBe(false)
  })

  it('soltar um nó sobre outro funde os dois', () => {
    const h = makeHarness()

    dragNode(h, { x: 0, y: 0 }, [
      { x: 1000, y: 1200 },
      { x: 2400, y: 2400 },
      { x: 3195, y: 2498 },
    ])

    expect(h.store.current.nodes).toHaveLength(5)
    expect(h.store.current.nodes.some((node) => node.id === n('a'))).toBe(false)
    expect(validateDocumentErrors(h.store.current)).toHaveLength(0)
  })

  it('Alt durante o arraste desliga o snap', () => {
    const h = makeHarness()

    // Sem Alt, o alvo cai sobre o grid de 100 mm.
    const comSnap = makeHarness()
    dragNode(comSnap, { x: 0, y: 0 }, [{ x: -1503, y: -2004 }])
    expect(comSnap.nodeAt('a')).toEqual({ x: -1500, y: -2000 })

    dragNode(h, { x: 0, y: 0 }, [{ x: -1503, y: -2004 }], true)
    expect(h.nodeAt('a')).toEqual({ x: -1503, y: -2004 })
  })
})

describe('Ferramenta Selecionar — arrastar aresta e cômodo', () => {
  it('arrastar aresta move os dois nós perpendicularmente a ela', () => {
    const h = makeHarness()

    // Aresta 3 do cômodo esquerdo: de (0, 2500) a (0, 0), vertical.
    h.drive({ type: 'pointerDown', clickCount: 1, additive: false }, { x: 0, y: 1250 })
    h.drive({ type: 'pointerMove' }, { x: -400, y: 1900 })
    h.drive({ type: 'pointerUp' }, { x: -400, y: 1900 })

    expect(h.nodeAt('a')).toEqual({ x: -400, y: 0 })
    expect(h.nodeAt('d')).toEqual({ x: -400, y: 2500 })
  })

  it('arrastar o interior de um cômodo desconecta os nós compartilhados', () => {
    const h = makeHarness()
    const rightBefore = computeRoomArea(h.store.current, RIGHT)

    h.drive({ type: 'pointerDown', clickCount: 1, additive: false }, { x: 1600, y: 1250 })
    h.drive({ type: 'pointerMove' }, { x: 1600, y: 1750 })
    h.drive({ type: 'pointerUp' }, { x: 1600, y: 1750 })

    expect(h.store.current.nodes).toHaveLength(8)
    expect(computeRoomArea(h.store.current, RIGHT)).toBe(rightBefore)
    expect(computeRoomArea(h.store.current, LEFT)).toBe(8_000_000)
    expect(validateDocumentErrors(h.store.current)).toHaveLength(0)
  })

  it('desfazer o arraste de cômodo devolve os seis nós', () => {
    const h = makeHarness()

    h.drive({ type: 'pointerDown', clickCount: 1, additive: false }, { x: 1600, y: 1250 })
    h.drive({ type: 'pointerMove' }, { x: 1600, y: 1750 })
    h.drive({ type: 'pointerUp' }, { x: 1600, y: 1750 })

    h.store.undo()

    expect(h.store.current.nodes).toHaveLength(6)
    expect(h.nodeAt('a')).toEqual({ x: 0, y: 0 })
  })
})

describe('Ferramenta Selecionar — duplo clique', () => {
  it('no interior de um cômodo pede edição de nome', () => {
    const h = makeHarness()
    h.drive({ type: 'pointerDown', clickCount: 2, additive: false }, { x: 1600, y: 1250 })

    expect(h.lastEdit).toEqual({ kind: 'roomName', roomId: LEFT })
  })

  it('numa aresta pede o comprimento e informa se o nó final é compartilhado', () => {
    const h = makeHarness()
    h.drive({ type: 'pointerDown', clickCount: 2, additive: false }, { x: 1600, y: 0 })

    expect(h.lastEdit).toMatchObject({
      kind: 'edgeLength',
      currentLength: 3200,
      endNodeShared: true,
    })
  })

  it('aresta com nó final não compartilhado não oferece a escolha', () => {
    const h = makeHarness()
    h.drive({ type: 'pointerDown', clickCount: 2, additive: false }, { x: 0, y: 1250 })

    expect(h.lastEdit).toMatchObject({ kind: 'edgeLength', endNodeShared: false })
  })
})
