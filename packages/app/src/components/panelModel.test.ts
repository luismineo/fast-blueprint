import { describe, expect, it } from 'vitest'
import {
  ROOM_COLORS,
  applyCommand,
  createEmptyDocument,
  type NodeId,
  type PlanDocument,
  type RoomId,
  type Selection,
} from '@planta/core'
import { describeSelection } from './panelModel'

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
      name: 'Quarto',
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
      name: 'Sala',
      roomId: RIGHT,
    },
  }).document
}

describe('describeSelection', () => {
  it('sem seleção mostra o resumo do documento', () => {
    const model = describeSelection(twoAdjacentRooms(), [])

    expect(model).toEqual({
      kind: 'empty',
      usableArea: '16,00 m²',
      totalArea: '16,00 m²',
      roomCount: 2,
    })
  })

  it('documento vazio mostra zero e o convite a desenhar', () => {
    const model = describeSelection(createEmptyDocument(), [])

    expect(model).toMatchObject({ kind: 'empty', roomCount: 0, usableArea: '0,00 m²' })
  })

  it('cômodo mostra nome, área e perímetro', () => {
    const selection: Selection = [{ kind: 'room', roomId: LEFT }]
    const model = describeSelection(twoAdjacentRooms(), selection)

    expect(model).toMatchObject({
      kind: 'room',
      name: 'Quarto',
      area: '8,00 m²',
      perimeter: '11,40 m',
      colorIndex: null,
      includeInUsableArea: true,
    })
  })

  it('cômodo com cor da paleta reporta o índice dela', () => {
    const colored = applyCommand(twoAdjacentRooms(), {
      type: 'SetRoomColor',
      payload: { roomId: LEFT, color: ROOM_COLORS[2]! },
    }).document

    const model = describeSelection(colored, [{ kind: 'room', roomId: LEFT }])

    expect(model).toMatchObject({ kind: 'room', colorIndex: 2 })
  })

  it('aresta mostra comprimento em cm, ângulo e os cômodos que ela separa', () => {
    const doc = twoAdjacentRooms()
    const model = describeSelection(doc, [
      { kind: 'edge', edge: { kind: 'room', roomId: LEFT, index: 1 } },
    ])

    expect(model).toMatchObject({
      kind: 'edge',
      lengthText: '250',
      angle: '90,0°',
      adjacentRooms: 'Quarto, Sala',
    })
  })

  it('aresta externa lista só o próprio cômodo', () => {
    const doc = twoAdjacentRooms()
    const model = describeSelection(doc, [
      { kind: 'edge', edge: { kind: 'room', roomId: LEFT, index: 3 } },
    ])

    expect(model).toMatchObject({ kind: 'edge', adjacentRooms: 'Quarto' })
  })

  it('nó mostra X, Y e os cômodos conectados', () => {
    const doc = twoAdjacentRooms()
    const model = describeSelection(doc, [{ kind: 'node', nodeId: n('b') }])

    expect(model).toEqual({
      kind: 'node',
      xText: '3200',
      yText: '0',
      connectedRooms: 'Quarto, Sala',
    })
  })

  it('seleção múltipla conta por tipo', () => {
    const doc = twoAdjacentRooms()
    const model = describeSelection(doc, [
      { kind: 'room', roomId: LEFT },
      { kind: 'room', roomId: RIGHT },
      { kind: 'node', nodeId: n('b') },
      { kind: 'edge', edge: { kind: 'room', roomId: LEFT, index: 0 } },
    ])

    expect(model).toEqual({ kind: 'multi', rooms: 2, nodes: 1, edges: 1 })
  })

  it('referência que não resolve cai para o resumo, sem quebrar', () => {
    const doc = twoAdjacentRooms()

    expect(describeSelection(doc, [{ kind: 'room', roomId: 'zzz' as RoomId }]).kind).toBe(
      'empty',
    )
    expect(describeSelection(doc, [{ kind: 'node', nodeId: n('zzz') }]).kind).toBe('empty')
    expect(
      describeSelection(doc, [
        { kind: 'edge', edge: { kind: 'room', roomId: LEFT, index: 9 } },
      ]).kind,
    ).toBe('empty')
  })

  it('cômodo fora da área útil não entra no total útil', () => {
    const doc = applyCommand(twoAdjacentRooms(), {
      type: 'SetRoomUsable',
      payload: { roomId: RIGHT, includeInUsableArea: false },
    }).document

    expect(describeSelection(doc, [])).toMatchObject({
      usableArea: '8,00 m²',
      totalArea: '16,00 m²',
    })
  })
})
