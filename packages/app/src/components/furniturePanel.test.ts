import { describe, expect, it } from 'vitest'
import {
  DOCUMENT_COLORS,
  applyCommand,
  createEmptyDocument,
  type FurnitureId,
  type NodeId,
  type PlanDocument,
  type RoomId,
  type Selection,
} from '@planta/core'
import { describeSelection } from './panelModel'

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
  readonly locked?: boolean
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
      clearance: spec.clearance ?? 600,
      locked: spec.locked,
      outline: spec.outline,
    },
  }).document
}

const selectBed: Selection = [{ kind: 'furniture', furnitureId: BED }]

describe('painel de móvel', () => {
  it('mostra nome, dimensões em centímetros, rotação e circulação', () => {
    const model = describeSelection(withItem(room()), selectBed)

    expect(model).toEqual({
      kind: 'furniture',
      name: 'Cama queen',
      widthText: '158',
      depthText: '198',
      rotationText: '0',
      clearanceText: '60',
      locked: false,
      colorIndex: null,
      palette: DOCUMENT_COLORS,
    })
  })

  it('mostra a trava e a cor escolhida', () => {
    const colored = applyCommand(withItem(room(), { locked: true }), {
      type: 'UpdateFurniture',
      payload: { furnitureId: BED, color: DOCUMENT_COLORS[3]! },
    }).document

    expect(describeSelection(colored, selectBed)).toMatchObject({
      locked: true,
      colorIndex: 3,
    })
  })

  it('móvel que não resolve cai para o resumo, sem quebrar', () => {
    const model = describeSelection(room(), [
      { kind: 'furniture', furnitureId: 'zzz' as FurnitureId },
    ])

    expect(model.kind).toBe('empty')
  })

  it('seleção múltipla conta móvel à parte', () => {
    const model = describeSelection(withItem(room()), [
      { kind: 'room', roomId: ROOM },
      { kind: 'furniture', furnitureId: BED },
    ])

    expect(model).toEqual({ kind: 'multi', rooms: 1, nodes: 0, edges: 0, furniture: 1 })
  })
})

describe('painel de cômodo — mobília', () => {
  it('mostra a taxa de ocupação e a contagem de móveis', () => {
    const model = describeSelection(withItem(room()), [{ kind: 'room', roomId: ROOM }])

    // 1,58 × 1,98 = 3,13 m² num quarto de 8,00 m².
    expect(model).toMatchObject({ furnitureCount: 1, occupancy: '39%' })
  })

  it('cômodo vazio tem ocupação zero', () => {
    const model = describeSelection(room(), [{ kind: 'room', roomId: ROOM }])

    expect(model).toMatchObject({ furnitureCount: 0, occupancy: '0%' })
  })

  it('gabarito de circulação não conta como ocupação', () => {
    const doc = withItem(room(), { width: 1500, depth: 1500, outline: true })
    const model = describeSelection(doc, [{ kind: 'room', roomId: ROOM }])

    expect(model).toMatchObject({ furnitureCount: 0, occupancy: '0%' })
  })
})

describe('lista de avisos', () => {
  it('documento sem problema não lista nada', () => {
    const model = describeSelection(withItem(room()), [])

    expect(model).toMatchObject({ warnings: [], furnitureCount: 1 })
  })

  it('nomeia o móvel que está fora do cômodo', () => {
    const doc = withItem(room(), { name: 'Sofá', center: { x: 9000, y: 9000 } })
    const model = describeSelection(doc, [])

    expect(model).toMatchObject({ warnings: ['Sofá · fora do cômodo'] })
  })

  it('nomeia os dois móveis sobrepostos', () => {
    const doc = withItem(withItem(room(), { name: 'Cama', width: 1000, depth: 600 }), {
      id: 'f2',
      name: 'Criado-mudo',
      width: 500,
      depth: 400,
      center: { x: 1700, y: 1250 },
    })
    const model = describeSelection(doc, [])

    expect(model).toMatchObject({ warnings: ['Cama e Criado-mudo se sobrepõem'] })
  })
})
