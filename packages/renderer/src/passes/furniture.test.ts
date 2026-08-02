import { describe, expect, it } from 'vitest'
import { applyCommand, createEmptyDocument } from '@planta/core'
import type { FurnitureId, NodeId, PlanDocument, RoomId } from '@planta/core'
import { furniturePass } from './furniture'
import { furnitureClearancePass } from './furnitureClearance'
import { openingsPass } from './openings'
import { RecordingTarget } from '../target/RecordingTarget'
import { lightTheme } from '../theme'
import type { RenderContext } from '../renderContext'

const ROOM = 'r1' as RoomId
const BED = 'f1' as FurnitureId

interface ItemSpec {
  readonly id?: string
  readonly name?: string
  readonly width?: number
  readonly depth?: number
  readonly center?: { x: number; y: number }
  readonly rotation?: number
  readonly clearance?: number
  readonly outline?: boolean
}

function room(): PlanDocument {
  return applyCommand(createEmptyDocument(), {
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
}

function withItem(doc: PlanDocument, spec: ItemSpec = {}): PlanDocument {
  return applyCommand(doc, {
    type: 'AddFurniture',
    payload: {
      furnitureId: (spec.id ?? BED) as FurnitureId,
      catalogId: 'bed-queen',
      name: spec.name ?? 'Cama queen',
      width: spec.width ?? 1580,
      depth: spec.depth ?? 1980,
      center: spec.center ?? { x: 1600, y: 1250 },
      rotation: spec.rotation ?? 0,
      clearance: spec.clearance ?? 0,
      outline: spec.outline,
    },
  }).document
}

function context(doc: PlanDocument, target: RecordingTarget, scale = 1): RenderContext {
  return {
    doc,
    camera: { tx: 0, ty: 0, scale },
    viewport: { width: 800, height: 600 },
    theme: lightTheme,
    target,
  }
}

describe('pass furniture', () => {
  it('desenha preenchimento, contorno fechado e marca de orientação', () => {
    const target = new RecordingTarget()
    furniturePass(context(withItem(room()), target))

    expect(target.polygons).toHaveLength(1)
    expect(target.polylines).toHaveLength(1)
    expect(target.polylines[0]!.points).toHaveLength(5)
    expect(target.polylines[0]!.points[0]).toEqual(target.polylines[0]!.points[4])
    expect(target.lines).toHaveLength(1)
  })

  it('a marca de orientação fica na face frontal, oposta ao fundo', () => {
    const target = new RecordingTarget()
    // Cama encostada na parede de cima: fundo em y = 260, frente em y = 2240.
    furniturePass(context(withItem(room(), { center: { x: 1600, y: 1250 } }), target))

    const mark = target.lines[0]!
    expect(mark.y1).toBe(2240)
    expect(mark.y2).toBe(2240)
  })

  it('desenha nome e dimensão em centímetros', () => {
    const target = new RecordingTarget()
    furniturePass(context(withItem(room()), target))

    expect(target.texts.map((text) => text.content)).toEqual(['Cama queen', '158 × 198'])
  })

  it('suprime o rótulo quando o móvel é pequeno demais na tela', () => {
    const target = new RecordingTarget()
    furniturePass(context(withItem(room(), { width: 450, depth: 500 }), target, 0.05))

    expect(target.texts).toEqual([])
  })

  it('móvel dentro do cômodo tem contorno sólido', () => {
    const target = new RecordingTarget()
    furniturePass(context(withItem(room()), target))

    expect(target.polylines[0]!.style.dash).toBeUndefined()
  })

  it('móvel fora do cômodo tem contorno tracejado', () => {
    const target = new RecordingTarget()
    furniturePass(context(withItem(room(), { center: { x: 9000, y: 9000 } }), target))

    expect(target.polylines[0]!.style.dash).toBeDefined()
    expect(target.polylines[0]!.style.color).toBe(lightTheme.outsideRoom)
  })

  it('gabarito de circulação é tracejado e sem preenchimento', () => {
    const target = new RecordingTarget()
    furniturePass(
      context(withItem(room(), { width: 1500, depth: 1500, outline: true }), target),
    )

    expect(target.polygons).toEqual([])
    expect(target.polylines[0]!.style.dash).toBeDefined()
  })

  it('desenha os móveis na ordem do array, que é a ordem de desenho', () => {
    const doc = withItem(withItem(room()), { id: 'f2', name: 'Criado-mudo' })
    const target = new RecordingTarget()
    furniturePass(context(doc, target))

    expect(target.texts[0]!.content).toBe('Cama queen')
    expect(target.texts[2]!.content).toBe('Criado-mudo')
  })

  it('documento sem móvel não desenha nada', () => {
    const target = new RecordingTarget()
    furniturePass(context(room(), target))

    expect(target.polygons).toEqual([])
    expect(target.polylines).toEqual([])
  })

  it('reaproveita o buffer sem embaralhar os móveis desenhados', () => {
    const doc = withItem(withItem(room()), {
      id: 'f2',
      center: { x: 700, y: 600 },
      width: 400,
      depth: 400,
    })
    const target = new RecordingTarget()
    furniturePass(context(doc, target))

    expect(target.polylines[0]!.points[0]).not.toEqual(target.polylines[1]!.points[0])
  })
})

describe('hachura de colisão', () => {
  it('desenha hachura na região comum de dois móveis sobrepostos', () => {
    const doc = withItem(withItem(room(), { width: 1000, depth: 600 }), {
      id: 'f2',
      width: 1000,
      depth: 600,
      center: { x: 1900, y: 1250 },
    })
    const target = new RecordingTarget()
    furniturePass(context(doc, target))

    // Duas marcas de orientação mais as linhas de hachura.
    expect(target.lines.length).toBeGreaterThan(2)
    expect(target.lines.some((line) => line.style.color === lightTheme.collision)).toBe(true)
  })

  it('não hachura móveis que apenas se encostam', () => {
    const doc = withItem(withItem(room(), { width: 1000, depth: 600, center: { x: 1000, y: 1250 } }), {
      id: 'f2',
      width: 1000,
      depth: 600,
      center: { x: 2000, y: 1250 },
    })
    const target = new RecordingTarget()
    furniturePass(context(doc, target))

    expect(target.lines.every((line) => line.style.color !== lightTheme.collision)).toBe(true)
  })

  it('gabarito de circulação sobre um móvel não hachura', () => {
    const doc = withItem(withItem(room(), { width: 1000, depth: 600 }), {
      id: 'f2',
      width: 1500,
      depth: 1500,
      outline: true,
    })
    const target = new RecordingTarget()
    furniturePass(context(doc, target))

    expect(target.lines.every((line) => line.style.color !== lightTheme.collision)).toBe(true)
  })
})

describe('pass furnitureClearance', () => {
  it('desenha o retângulo expandido pela circulação, sem contorno', () => {
    const target = new RecordingTarget()
    furnitureClearancePass(
      context(withItem(room(), { width: 1000, depth: 600, clearance: 600 }), target),
    )

    expect(target.polylines).toEqual([])
    expect(target.polygons).toHaveLength(1)

    const xs = target.polygons[0]!.points.map((point) => point.x)
    const ys = target.polygons[0]!.points.map((point) => point.y)
    expect(Math.max(...xs) - Math.min(...xs)).toBe(1000 + 1200)
    expect(Math.max(...ys) - Math.min(...ys)).toBe(600 + 1200)
  })

  it('circulação zero não desenha faixa', () => {
    const target = new RecordingTarget()
    furnitureClearancePass(context(withItem(room(), { clearance: 0 }), target))

    expect(target.polygons).toEqual([])
  })

  it('a faixa é translúcida', () => {
    const target = new RecordingTarget()
    furnitureClearancePass(context(withItem(room(), { clearance: 600 }), target))

    expect(target.polygons[0]!.fill.opacity).toBeLessThan(1)
    expect(target.polygons[0]!.fill.color).toBe(lightTheme.clearance)
  })
})

describe('pass openings', () => {
  it('não desenha nada enquanto não existe Opening', () => {
    const target = new RecordingTarget()
    openingsPass(context(room(), target))

    expect(target.polygons).toEqual([])
    expect(target.polylines).toEqual([])
    expect(target.lines).toEqual([])
    expect(target.texts).toEqual([])
  })
})
