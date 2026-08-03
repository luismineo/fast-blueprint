import { describe, expect, it } from 'vitest'
import type { Point, SnapResult } from '@planta/core'
import {
  initialMeasureState,
  measureToolTransition,
  type MeasureToolContext,
  type MeasureToolState,
} from './measureTool'

function snapAt(point: Point, merged: SnapResult['merged'] = null): MeasureToolContext {
  return { snap: { point, targets: [], merged } }
}

describe('Ferramenta Medir — máquina de estados', () => {
  it('Idle + pointerDown → Dragging', () => {
    const result = measureToolTransition(
      initialMeasureState(),
      { type: 'pointerDown' },
      snapAt({ x: 0, y: 0 }),
    )

    expect(result.state).toEqual({ kind: 'dragging', anchor: { x: 0, y: 0 } })
  })

  it('Dragging + pointerUp → Done, e a medição permanece na tela', () => {
    const dragging: MeasureToolState = { kind: 'dragging', anchor: { x: 0, y: 0 } }
    const result = measureToolTransition(dragging, { type: 'pointerUp' }, snapAt({ x: 1000, y: 0 }))

    expect(result.state).toEqual({ kind: 'done', anchor: { x: 0, y: 0 }, end: { x: 1000, y: 0 } })
    expect(result.overlays.some((o) => o.kind === 'label' && o.role === 'measureLabel')).toBe(true)
  })

  it('Dragging + Enter → Done, equivalente a pointerUp', () => {
    const dragging: MeasureToolState = { kind: 'dragging', anchor: { x: 0, y: 0 } }
    const result = measureToolTransition(dragging, { type: 'enter' }, snapAt({ x: 500, y: 0 }))

    expect(result.state.kind).toBe('done')
  })

  it('Done + pointerDown → Dragging com medição nova, substituindo a anterior', () => {
    const done: MeasureToolState = { kind: 'done', anchor: { x: 0, y: 0 }, end: { x: 1000, y: 0 } }
    const result = measureToolTransition(done, { type: 'pointerDown' }, snapAt({ x: 5000, y: 5000 }))

    expect(result.state).toEqual({ kind: 'dragging', anchor: { x: 5000, y: 5000 } })
  })

  it('Dragging + Esc → Idle, descartando o traço', () => {
    const dragging: MeasureToolState = { kind: 'dragging', anchor: { x: 0, y: 0 } }
    const result = measureToolTransition(dragging, { type: 'escape' }, snapAt({ x: 1000, y: 0 }))

    expect(result.state).toEqual({ kind: 'idle' })
    expect(result.overlays).toEqual([])
  })

  it('Done + Esc → Idle, limpando a medição', () => {
    const done: MeasureToolState = { kind: 'done', anchor: { x: 0, y: 0 }, end: { x: 1000, y: 0 } }
    const result = measureToolTransition(done, { type: 'escape' }, snapAt({ x: 0, y: 0 }))

    expect(result.state).toEqual({ kind: 'idle' })
  })

  it('nunca emite comando, em nenhuma transição', () => {
    const states: MeasureToolState[] = [
      { kind: 'idle' },
      { kind: 'dragging', anchor: { x: 0, y: 0 } },
      { kind: 'done', anchor: { x: 0, y: 0 }, end: { x: 1000, y: 1000 } },
    ]
    const events: Array<{ type: 'pointerDown' | 'pointerMove' | 'pointerUp' | 'enter' | 'escape' }> = [
      { type: 'pointerDown' },
      { type: 'pointerMove' },
      { type: 'pointerUp' },
      { type: 'enter' },
      { type: 'escape' },
    ]

    for (const state of states) {
      for (const event of events) {
        const result = measureToolTransition(state, event, snapAt({ x: 10, y: 10 }))
        expect(result.commands).toEqual([])
      }
    }
  })
})

describe('Ferramenta Medir — rótulo', () => {
  it('medição axial não mostra ΔX/ΔY', () => {
    const dragging: MeasureToolState = { kind: 'dragging', anchor: { x: 0, y: 0 } }
    const result = measureToolTransition(dragging, { type: 'pointerUp' }, snapAt({ x: 3200, y: 0 }))

    const labels = result.overlays.filter((o) => o.kind === 'label')
    expect(labels).toHaveLength(1)
    expect(labels[0]).toMatchObject({ text: '3,20 m' })
  })

  it('medição em diagonal mostra ΔX e ΔY numa segunda linha', () => {
    const dragging: MeasureToolState = { kind: 'dragging', anchor: { x: 0, y: 0 } }
    const result = measureToolTransition(dragging, { type: 'pointerUp' }, snapAt({ x: 3000, y: 4000 }))

    const labels = result.overlays.filter((o) => o.kind === 'label')
    expect(labels).toHaveLength(2)
    expect(labels[0]).toMatchObject({ text: '5,00 m' })
    expect(labels[1]).toMatchObject({ text: 'ΔX 3,00 m  ΔY 4,00 m' })
  })

  it('marcador de snap a nó aparece em Idle quando o snap resolve merged', () => {
    const result = measureToolTransition(
      initialMeasureState(),
      { type: 'pointerMove' },
      snapAt({ x: 0, y: 0 }, 'n1' as never),
    )

    expect(result.overlays).toEqual([{ kind: 'marker', role: 'snapNode', position: { x: 0, y: 0 } }])
  })
})
