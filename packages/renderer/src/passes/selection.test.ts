import { describe, it, expect } from 'vitest'
import {
  applyCommand,
  createEmptyDocument,
  type FurnitureId,
  type NodeId,
  type PlanDocument,
  type RoomId,
  type Selection,
} from '@planta/core'
import { selectionPass } from './selection'
import { RecordingTarget } from '../target/RecordingTarget'
import { lightTheme } from '../theme'
import type { RenderContext } from '../renderContext'

const n = (id: string): NodeId => id as NodeId
const ROOM = 'r1' as RoomId
const SOFA = 'f1' as FurnitureId

function oneRoom(): PlanDocument {
  return applyCommand(createEmptyDocument(), {
    type: 'CreateRoom',
    payload: {
      nodes: [
        { id: n('a'), x: 0, y: 0 },
        { id: n('b'), x: 3200, y: 0 },
        { id: n('c'), x: 3200, y: 2500 },
        { id: n('d'), x: 0, y: 2500 },
      ],
      loop: [n('a'), n('b'), n('c'), n('d')],
      name: 'Quarto',
      roomId: ROOM,
    },
  }).document
}

function withSofa(locked = false): PlanDocument {
  return applyCommand(oneRoom(), {
    type: 'AddFurniture',
    payload: {
      furnitureId: SOFA,
      catalogId: null,
      name: 'Sofá',
      width: 2000,
      depth: 900,
      center: { x: 1600, y: 1250 },
      rotation: 0,
      clearance: 0,
      locked,
    },
  }).document
}

function context(overrides: Partial<RenderContext> = {}): {
  ctx: RenderContext
  target: RecordingTarget
} {
  const target = new RecordingTarget()
  const ctx: RenderContext = {
    camera: { tx: 0, ty: 0, scale: 1 },
    viewport: { width: 800, height: 600 },
    theme: lightTheme,
    target,
    doc: oneRoom(),
    ...overrides,
  }
  return { ctx, target }
}

describe('pass selection', () => {
  it('sem seleção e sem hover não desenha nada', () => {
    const { ctx, target } = context()

    selectionPass(ctx)

    expect(target.polylines).toHaveLength(0)
    expect(target.lines).toHaveLength(0)
    expect(target.texts).toHaveLength(0)
  })

  it('nó selecionado vira um handle de 8 px', () => {
    const selection: Selection = [{ kind: 'node', nodeId: n('b') }]
    const { ctx, target } = context({ selection })

    selectionPass(ctx)

    expect(target.polylines).toHaveLength(1)
    const points = target.polylines[0]!.points
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    expect(Math.max(...xs) - Math.min(...xs)).toBe(8)
    expect(Math.max(...ys) - Math.min(...ys)).toBe(8)
  })

  it('o handle tem 8 px em qualquer zoom', () => {
    const selection: Selection = [{ kind: 'node', nodeId: n('b') }]

    for (const scale of [0.05, 1, 20]) {
      const { ctx, target } = context({
        selection,
        camera: { tx: 0, ty: 0, scale },
      })

      selectionPass(ctx)

      const xs = target.polylines[0]!.points.map((p) => p.x)
      expect(Math.max(...xs) - Math.min(...xs)).toBe(8)
    }
  })

  it('nó sob o cursor recebe handle com contorno mais fino que o selecionado', () => {
    const selected = context({ selection: [{ kind: 'node', nodeId: n('b') }] })
    selectionPass(selected.ctx)

    const hovered = context({ hover: { kind: 'node', nodeId: n('b') } })
    selectionPass(hovered.ctx)

    expect(hovered.target.polylines).toHaveLength(1)
    expect(hovered.target.polylines[0]!.style.width).toBeLessThan(
      selected.target.polylines[0]!.style.width,
    )
  })

  it('nó selecionado e sob o cursor é desenhado uma vez só', () => {
    const { ctx, target } = context({
      selection: [{ kind: 'node', nodeId: n('b') }],
      hover: { kind: 'node', nodeId: n('b') },
    })

    selectionPass(ctx)

    expect(target.polylines).toHaveLength(1)
  })

  it('cômodo selecionado tem contorno fechado com espessura dobrada', () => {
    const { ctx, target } = context({ selection: [{ kind: 'room', roomId: ROOM }] })

    selectionPass(ctx)

    expect(target.polylines).toHaveLength(1)
    const outline = target.polylines[0]!
    expect(outline.points).toHaveLength(5)
    expect(outline.points[0]).toEqual(outline.points[4])
    expect(outline.style.width).toBe(lightTheme.wallWidth * 2)
  })

  it('aresta selecionada tem rótulo de comprimento sempre visível', () => {
    const { ctx, target } = context({
      selection: [{ kind: 'edge', edge: { kind: 'room', roomId: ROOM, index: 0 } }],
    })

    selectionPass(ctx)

    expect(target.lines).toHaveLength(1)
    expect(target.lines[0]!.style.width).toBe(lightTheme.wallWidth * 2)
    expect(target.texts.map((t) => t.content)).toContain('3,20 m')
  })

  it('o rótulo fica ao lado da aresta, não em cima dela', () => {
    const { ctx, target } = context({
      selection: [{ kind: 'edge', edge: { kind: 'room', roomId: ROOM, index: 0 } }],
    })

    selectionPass(ctx)

    const label = target.texts[0]!
    expect(label.x).toBe(1600)
    expect(Math.abs(label.y)).toBe(12)
  })

  it('referência que não resolve não quebra o pass', () => {
    const { ctx, target } = context({
      selection: [
        { kind: 'room', roomId: 'zzz' as RoomId },
        { kind: 'node', nodeId: n('zzz') },
        { kind: 'edge', edge: { kind: 'room', roomId: ROOM, index: 9 } },
      ],
    })

    expect(() => selectionPass(ctx)).not.toThrow()
    expect(target.polylines).toHaveLength(0)
  })

  it('sem documento não desenha nada', () => {
    const { ctx, target } = context({
      doc: undefined,
      selection: [{ kind: 'node', nodeId: n('b') }],
    })

    selectionPass(ctx)

    expect(target.polylines).toHaveLength(0)
  })

  it('móvel selecionado tem contorno na cor de seleção, 4 handles de canto e um de rotação com haste', () => {
    const { ctx, target } = context({
      doc: withSofa(),
      selection: [{ kind: 'furniture', furnitureId: SOFA }],
    })

    selectionPass(ctx)

    // 1 contorno + 4 cantos + 1 rotação.
    expect(target.polylines).toHaveLength(6)
    const outline = target.polylines[0]!
    expect(outline.points).toHaveLength(5)
    expect(outline.points[0]).toEqual(outline.points[4])
    expect(outline.style.color).toBe(lightTheme.selection)

    for (const handle of target.polylines.slice(1)) {
      const xs = handle.points.map((p) => p.x)
      const ys = handle.points.map((p) => p.y)
      expect(Math.max(...xs) - Math.min(...xs)).toBe(8)
      expect(Math.max(...ys) - Math.min(...ys)).toBe(8)
    }

    // Haste ligando a face frontal ao handle de rotação.
    expect(target.lines).toHaveLength(1)
  })

  it('móvel travado mantém o contorno mas não desenha handle nenhum', () => {
    const { ctx, target } = context({
      doc: withSofa(true),
      selection: [{ kind: 'furniture', furnitureId: SOFA }],
    })

    selectionPass(ctx)

    expect(target.polylines).toHaveLength(1)
    expect(target.lines).toHaveLength(0)
  })

  it('handle de rotação fica a 24 px da face frontal em qualquer zoom', () => {
    for (const scale of [0.05, 1, 20]) {
      const { ctx, target } = context({
        doc: withSofa(),
        selection: [{ kind: 'furniture', furnitureId: SOFA }],
        camera: { tx: 0, ty: 0, scale },
      })

      selectionPass(ctx)

      const [haste] = target.lines
      const dx = haste!.x2 - haste!.x1
      const dy = haste!.y2 - haste!.y1
      expect(Math.hypot(dx, dy)).toBeCloseTo(24, 0)
    }
  })

  it('referência de móvel que não resolve não quebra o pass', () => {
    const { ctx, target } = context({
      doc: withSofa(),
      selection: [{ kind: 'furniture', furnitureId: 'zzz' as FurnitureId }],
    })

    expect(() => selectionPass(ctx)).not.toThrow()
    expect(target.polylines).toHaveLength(0)
  })
})
