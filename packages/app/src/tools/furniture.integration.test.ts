import { describe, expect, it } from 'vitest'
import {
  DocumentStore,
  applyCommand,
  computeOccupancy,
  createEmptyDocument,
  furnitureFlags,
  hitTest,
  obbCorners,
  resolveFurnitureSnap,
  validateDocumentErrors,
  type FurnitureId,
  type NodeId,
  type PlanDocument,
  type Point,
  type RoomId,
  type Selection,
} from '@planta/core'
import {
  initialSelectState,
  selectToolTransition,
  type SelectToolContext,
  type SelectToolEvent,
  type SelectToolState,
} from './selectTool'
import { resolveToolSnap, wallEdges } from './snapContext'
import { duplicateCommands, nudgeCommands, rotateCommands } from './furnitureActions'

const ROOM = 'r1' as RoomId
const BED = 'f1' as FurnitureId

/** Quarto 3200 × 2500 com uma cama queen no meio. */
function furnishedRoom(): PlanDocument {
  const room = applyCommand(createEmptyDocument(), {
    type: 'CreateRoom',
    payload: {
      nodes: [
        { id: 'a' as NodeId, x: 0, y: 0 },
        { id: 'b' as NodeId, x: 3200, y: 0 },
        { id: 'c' as NodeId, x: 3200, y: 2500 },
        { id: 'd' as NodeId, x: 0, y: 2500 },
      ],
      loop: ['a', 'b', 'c', 'd'] as NodeId[],
      name: 'Quarto',
      roomId: ROOM,
    },
  }).document

  return applyCommand(room, {
    type: 'AddFurniture',
    payload: {
      furnitureId: BED,
      catalogId: 'bed-queen',
      name: 'Cama queen',
      width: 1580,
      depth: 1980,
      center: { x: 1600, y: 1250 },
      rotation: 0,
      clearance: 600,
    },
  }).document
}

/**
 * Dirige a Ferramenta Selecionar sobre mobília até o `DocumentStore`, e assere
 * contra o **documento resultante** — a lição nº 1 do post-mortem do M1.
 */
function makeHarness(doc: PlanDocument = furnishedRoom()) {
  const store = new DocumentStore(doc)
  let state: SelectToolState = initialSelectState()
  let selection: Selection = []
  let cursor: Point = { x: 0, y: 0 }

  function context(alt: boolean, shift: boolean): SelectToolContext {
    const current = store.current
    return {
      doc: current,
      cursor,
      hit: hitTest(cursor, { doc: current, scale: 1, selection }),
      selection,
      snap: (point, exclude) =>
        resolveToolSnap(point, { doc: current, draft: [], scale: 1, shift, alt, exclude }),
      furnitureSnap: (placement, size) =>
        resolveFurnitureSnap(placement, size, { edges: wallEdges(current), alt }),
      shift,
      newNodeId: () => 'n_x' as NodeId,
    }
  }

  function drive(event: SelectToolEvent, at?: Point, alt = false, shift = false) {
    if (at) cursor = at
    const result = selectToolTransition(state, event, context(alt, shift))
    state = result.state
    selection = result.selection

    for (const command of result.commands) store.dispatch(command)
    if (result.historyBoundary === 'commit') store.sealPending()
    if (result.historyBoundary === 'abort') store.abortPending()

    return result
  }

  function drag(from: Point, path: readonly Point[], alt = false, shift = false) {
    drive({ type: 'pointerDown', clickCount: 1, additive: false }, from, alt, shift)
    for (const step of path) drive({ type: 'pointerMove' }, step, alt, shift)
    drive({ type: 'pointerUp' }, path[path.length - 1] ?? from, alt, shift)
  }

  return {
    store,
    drive,
    drag,
    get selection() {
      return selection
    },
    get bed() {
      return store.current.furniture[0]!
    },
  }
}

describe('mobília na Ferramenta Selecionar — seleção e arraste', () => {
  it('clique no móvel seleciona o móvel', () => {
    const h = makeHarness()
    h.drive({ type: 'pointerDown', clickCount: 1, additive: false }, { x: 1600, y: 1250 })

    expect(h.selection).toEqual([{ kind: 'furniture', furnitureId: BED }])
  })

  it('arrastar move o móvel e mantém o documento válido', () => {
    const h = makeHarness()
    h.drag({ x: 1600, y: 1250 }, [
      { x: 1700, y: 1250 },
      { x: 1800, y: 1250 },
    ])

    expect(h.bed.center).toEqual({ x: 1800, y: 1250 })
    expect(validateDocumentErrors(h.store.current)).toEqual([])
  })

  it('um arraste inteiro é uma entrada de undo', () => {
    const h = makeHarness()
    h.drag({ x: 1600, y: 1250 }, [
      { x: 1700, y: 1250 },
      { x: 1800, y: 1250 },
      { x: 1900, y: 1250 },
    ])

    h.store.undo()
    expect(h.store.current.furniture[0]!.center).toEqual({ x: 1600, y: 1250 })
    expect(h.store.canUndo).toBe(false)
  })

  it('Esc no meio do arraste devolve o móvel ao ponto de partida', () => {
    const h = makeHarness()
    h.drive({ type: 'pointerDown', clickCount: 1, additive: false }, { x: 1600, y: 1250 })
    h.drive({ type: 'pointerMove' }, { x: 2000, y: 1250 })
    h.drive({ type: 'escape' })

    expect(h.bed.center).toEqual({ x: 1600, y: 1250 })
    expect(h.store.canUndo).toBe(false)
  })

  it('clique sem movimento não gasta entrada de histórico', () => {
    const h = makeHarness()
    h.drive({ type: 'pointerDown', clickCount: 1, additive: false }, { x: 1600, y: 1250 })
    h.drive({ type: 'pointerUp' }, { x: 1600, y: 1250 })

    expect(h.store.canUndo).toBe(false)
  })

  it('arrastar até perto da parede encosta e alinha a rotação', () => {
    const h = makeHarness()
    h.drag({ x: 1600, y: 1250 }, [
      { x: 1600, y: 1150 },
      { x: 1600, y: 1050 },
    ])

    // Fundo exatamente sobre a parede de cima.
    const corners = obbCorners(h.bed.center, h.bed.width, h.bed.depth, h.bed.rotation)
    expect(corners[0]!.y).toBe(0)
    expect(h.bed.rotation).toBe(0)
  })

  it('Alt durante o arraste desliga o snap a parede', () => {
    const h = makeHarness()
    h.drag(
      { x: 1600, y: 1250 },
      [
        { x: 1600, y: 1150 },
        { x: 1600, y: 1050 },
      ],
      true,
    )

    expect(h.bed.center).toEqual({ x: 1600, y: 1050 })
  })

  it('móvel encostado continua contido no cômodo, sem aviso', () => {
    const h = makeHarness()
    h.drag({ x: 1600, y: 1250 }, [{ x: 1600, y: 1000 }])

    expect(furnitureFlags(h.store.current).outsideRoom.size).toBe(0)
  })

  it('móvel travado não se move ao arrastar', () => {
    const h = makeHarness()
    h.store.dispatch({
      type: 'UpdateFurniture',
      payload: { furnitureId: BED, locked: true },
    })

    h.drag({ x: 1600, y: 1250 }, [{ x: 2000, y: 1250 }])

    expect(h.bed.center).toEqual({ x: 1600, y: 1250 })
    expect(h.selection).toEqual([{ kind: 'furniture', furnitureId: BED }])
  })
})

describe('mobília na Ferramenta Selecionar — handles', () => {
  function selectBed(h: ReturnType<typeof makeHarness>) {
    h.drive({ type: 'pointerDown', clickCount: 1, additive: false }, { x: 1600, y: 1250 })
    h.drive({ type: 'pointerUp' }, { x: 1600, y: 1250 })
  }

  it('arrastar o handle de canto redimensiona mantendo o canto oposto', () => {
    const h = makeHarness()
    selectBed(h)

    // Canto 2 (frente-direita) em (2390, 2240).
    h.drag({ x: 2390, y: 2240 }, [{ x: 2590, y: 2440 }])

    expect(h.bed.width).toBe(1780)
    expect(h.bed.depth).toBe(2180)

    const corners = obbCorners(h.bed.center, h.bed.width, h.bed.depth, h.bed.rotation)
    expect(corners[0]).toEqual({ x: 810, y: 260 })
  })

  it('arrastar o handle de rotação gira o móvel', () => {
    const h = makeHarness()
    selectBed(h)

    // Handle de rotação: 24 px além da face frontal, a 1 px/mm.
    h.drag({ x: 1600, y: 2264 }, [{ x: 200, y: 1250 }])

    expect(h.bed.rotation).toBe(90)
    expect(h.bed.center).toEqual({ x: 1600, y: 1250 })
  })

  it('Shift trava a rotação em múltiplos de 15°', () => {
    const h = makeHarness()
    selectBed(h)

    h.drag({ x: 1600, y: 2264 }, [{ x: 1300, y: 2200 }], false, true)

    expect(h.bed.rotation % 15).toBe(0)
  })

  it('redimensionar não altera o catalogId nem o nome', () => {
    const h = makeHarness()
    selectBed(h)
    h.drag({ x: 2390, y: 2240 }, [{ x: 2590, y: 2440 }])

    expect(h.bed.catalogId).toBe('bed-queen')
    expect(h.bed.name).toBe('Cama queen')
  })
})

describe('mobília — ações escopadas à seleção', () => {
  const selected: Selection = [{ kind: 'furniture', furnitureId: BED }]

  it('Q e E giram 90°, e Shift+Q 15°', () => {
    const store = new DocumentStore(furnishedRoom())

    for (const command of rotateCommands(store.current, selected, 90)) store.dispatch(command)
    expect(store.current.furniture[0]!.rotation).toBe(90)

    for (const command of rotateCommands(store.current, selected, -15)) store.dispatch(command)
    expect(store.current.furniture[0]!.rotation).toBe(75)
  })

  it('setas movem 10 mm e, com Shift, 100 mm', () => {
    const store = new DocumentStore(furnishedRoom())

    for (const command of nudgeCommands(store.current, selected, 10, 0)) store.dispatch(command)
    expect(store.current.furniture[0]!.center).toEqual({ x: 1610, y: 1250 })

    for (const command of nudgeCommands(store.current, selected, 0, -100)) {
      store.dispatch(command)
    }
    expect(store.current.furniture[0]!.center).toEqual({ x: 1610, y: 1150 })
  })

  it('Ctrl+D duplica deslocado 200 mm, copiando os campos', () => {
    const store = new DocumentStore(furnishedRoom())
    let seq = 0

    for (const command of duplicateCommands(store.current, selected, () => `c${++seq}` as FurnitureId)) {
      store.dispatch(command)
    }

    expect(store.current.furniture).toHaveLength(2)
    expect(store.current.furniture[1]).toMatchObject({
      id: 'c1',
      catalogId: 'bed-queen',
      name: 'Cama queen',
      center: { x: 1800, y: 1450 },
      clearance: 600,
    })
  })

  it('móvel travado ignora rotação e seta, sem cancelar os outros', () => {
    let doc = furnishedRoom()
    doc = applyCommand(doc, {
      type: 'AddFurniture',
      payload: {
        furnitureId: 'f2' as FurnitureId,
        catalogId: null,
        name: 'Criado-mudo',
        width: 500,
        depth: 400,
        center: { x: 500, y: 500 },
        rotation: 0,
        clearance: 0,
        locked: true,
      },
    }).document

    const store = new DocumentStore(doc)
    const both: Selection = [
      { kind: 'furniture', furnitureId: BED },
      { kind: 'furniture', furnitureId: 'f2' as FurnitureId },
    ]

    for (const command of rotateCommands(store.current, both, 90)) store.dispatch(command)

    expect(store.current.furniture[0]!.rotation).toBe(90)
    expect(store.current.furniture[1]!.rotation).toBe(0)
  })

  it('rotacionar dois móveis é uma entrada de undo só', () => {
    let doc = furnishedRoom()
    doc = applyCommand(doc, {
      type: 'AddFurniture',
      payload: {
        furnitureId: 'f2' as FurnitureId,
        catalogId: null,
        name: 'Criado-mudo',
        width: 500,
        depth: 400,
        center: { x: 500, y: 500 },
        rotation: 0,
        clearance: 0,
      },
    }).document

    const store = new DocumentStore(doc)
    const both: Selection = [
      { kind: 'furniture', furnitureId: BED },
      { kind: 'furniture', furnitureId: 'f2' as FurnitureId },
    ]

    for (const command of rotateCommands(store.current, both, 90)) store.dispatch(command)
    store.undo()

    expect(store.current.furniture[0]!.rotation).toBe(0)
    expect(store.current.furniture[1]!.rotation).toBe(0)
  })

  it('Delete exclui o móvel selecionado', () => {
    const h = makeHarness()
    h.drive({ type: 'pointerDown', clickCount: 1, additive: false }, { x: 1600, y: 1250 })
    h.drive({ type: 'pointerUp' }, { x: 1600, y: 1250 })
    h.drive({ type: 'deleteSelection' })

    expect(h.store.current.furniture).toEqual([])
  })
})

describe('taxa de ocupação', () => {
  it('responde "cabe uma cama queen com 60 cm de circulação?"', () => {
    const doc = furnishedRoom()

    // 1,58 × 1,98 num quarto de 3,20 × 2,50.
    expect(computeOccupancy(doc, ROOM)).toBeCloseTo(3_128_400 / 8_000_000, 6)
  })
})
