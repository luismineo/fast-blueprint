import { describe, expect, it } from 'vitest'
import { resolveFurnitureSnap, type FurnitureId, type SnapEdge } from '@planta/core'
import {
  furnitureToolTransition,
  initialFurnitureState,
  type FurnitureDraft,
  type FurnitureToolContext,
  type FurnitureToolEvent,
  type FurnitureToolState,
} from './furnitureTool'

const QUEEN: FurnitureDraft = {
  catalogId: 'bed-queen',
  name: 'Cama queen',
  width: 1580,
  depth: 1980,
  clearance: 600,
  outline: false,
}

/** Uma parede horizontal em y = 0, como a de cima de um cômodo. */
const WALL: SnapEdge = { a: { x: 0, y: 0 }, b: { x: 3200, y: 0 } }

function makeTool(edges: SnapEdge[] = []) {
  let state: FurnitureToolState = initialFurnitureState()
  let cursor = { x: 0, y: 0 }
  let seq = 0

  const ctx = (): FurnitureToolContext => ({
    cursor,
    snap: (placement, size) => resolveFurnitureSnap(placement, size, { edges, alt: false }),
    newFurnitureId: () => `f${++seq}` as FurnitureId,
  })

  return {
    drive(event: FurnitureToolEvent, at?: { x: number; y: number }) {
      if (at) cursor = at
      const result = furnitureToolTransition(state, event, ctx())
      state = result.state
      return result
    },
    get state() {
      return state
    },
  }
}

describe('Ferramenta Mobília', () => {
  it('começa ociosa, sem fantasma', () => {
    const tool = makeTool()
    const result = tool.drive({ type: 'pointerMove' }, { x: 100, y: 100 })

    expect(result.overlays).toEqual([])
    expect(result.commands).toEqual([])
  })

  it('clique sem item escolhido não insere nada', () => {
    const tool = makeTool()
    const result = tool.drive({ type: 'pointerDown' }, { x: 100, y: 100 })

    expect(result.commands).toEqual([])
    expect(result.placed).toBeNull()
  })

  it('escolher um item arma a ferramenta e desenha o fantasma sob o cursor', () => {
    const tool = makeTool()
    const result = tool.drive({ type: 'choose', draft: QUEEN }, { x: 1000, y: 1000 })

    expect(tool.state.kind).toBe('armed')
    expect(result.overlays).toEqual([
      {
        kind: 'polyline',
        role: 'ghost',
        closed: true,
        points: [
          { x: 210, y: 10 },
          { x: 1790, y: 10 },
          { x: 1790, y: 1990 },
          { x: 210, y: 1990 },
        ],
      },
    ])
  })

  it('o fantasma acompanha o cursor', () => {
    const tool = makeTool()
    tool.drive({ type: 'choose', draft: QUEEN }, { x: 1000, y: 1000 })
    const result = tool.drive({ type: 'pointerMove' }, { x: 2000, y: 1000 })
    const ghost = result.overlays[0]

    expect(ghost?.kind === 'polyline' && ghost.points[0]).toEqual({ x: 1210, y: 10 })
  })

  it('o fantasma já encosta na parede, com a guia da aresta', () => {
    const tool = makeTool([WALL])
    tool.drive({ type: 'choose', draft: QUEEN }, { x: 1600, y: 1050 })
    const result = tool.drive({ type: 'pointerMove' }, { x: 1600, y: 1050 })

    const ghost = result.overlays[0]
    expect(ghost?.kind === 'polyline' && ghost.points[0]!.y).toBe(0)
    expect(result.overlays[1]).toEqual({
      kind: 'segment',
      role: 'edgeHighlight',
      a: WALL.a,
      b: WALL.b,
    })
  })

  it('clicar posiciona o móvel e devolve a ferramenta para ociosa', () => {
    const tool = makeTool()
    tool.drive({ type: 'choose', draft: QUEEN }, { x: 1000, y: 1000 })
    const result = tool.drive({ type: 'pointerDown' }, { x: 1000, y: 1000 })

    expect(result.commands).toEqual([
      {
        type: 'AddFurniture',
        payload: {
          furnitureId: 'f1',
          catalogId: 'bed-queen',
          name: 'Cama queen',
          width: 1580,
          depth: 1980,
          center: { x: 1000, y: 1000 },
          rotation: 0,
          clearance: 600,
          outline: undefined,
        },
      },
    ])
    expect(result.placed).toBe('f1')
    expect(tool.state.kind).toBe('idle')
    expect(result.overlays).toEqual([])
  })

  it('posiciona já encostado quando há parede perto', () => {
    const tool = makeTool([WALL])
    tool.drive({ type: 'choose', draft: QUEEN }, { x: 1600, y: 1050 })
    const result = tool.drive({ type: 'pointerDown' }, { x: 1600, y: 1050 })
    const payload = result.commands[0]?.payload as { center: { x: number; y: number } }

    expect(payload.center).toEqual({ x: 1600, y: 990 })
  })

  it('gabarito de circulação nasce com outline', () => {
    const tool = makeTool()
    const gabarito: FurnitureDraft = {
      catalogId: 'clearance-wheelchair',
      name: 'Giro de cadeira de rodas',
      width: 1500,
      depth: 1500,
      clearance: 0,
      outline: true,
    }
    tool.drive({ type: 'choose', draft: gabarito }, { x: 0, y: 0 })
    const result = tool.drive({ type: 'pointerDown' }, { x: 0, y: 0 })

    expect((result.commands[0]?.payload as { outline?: boolean }).outline).toBe(true)
  })

  it('Esc desarma sem inserir', () => {
    const tool = makeTool()
    tool.drive({ type: 'choose', draft: QUEEN }, { x: 1000, y: 1000 })
    const result = tool.drive({ type: 'escape' })

    expect(tool.state.kind).toBe('idle')
    expect(result.commands).toEqual([])
    expect(result.overlays).toEqual([])
  })

  it('o centro do móvel inserido é inteiro mesmo com cursor fracionário', () => {
    const tool = makeTool()
    tool.drive({ type: 'choose', draft: QUEEN }, { x: 1000.4, y: 999.6 })
    const result = tool.drive({ type: 'pointerDown' }, { x: 1000.4, y: 999.6 })
    const payload = result.commands[0]?.payload as { center: { x: number; y: number } }

    expect(payload.center).toEqual({ x: 1000, y: 1000 })
  })
})
