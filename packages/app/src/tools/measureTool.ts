import type {
  OverlayPrimitive,
  Point,
  SnapResult,
} from '@planta/core'
import {
  distance,
} from '@planta/core'

export type MeasureToolState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'dragging'; readonly anchor: Point }
  | { readonly kind: 'done'; readonly anchor: Point; readonly end: Point }

export type MeasureToolEvent =
  | { readonly type: 'pointerMove' }
  | { readonly type: 'pointerDown' }
  | { readonly type: 'pointerUp' }
  | { readonly type: 'escape' }
  | { readonly type: 'enter' }

export interface MeasureToolContext {
  readonly snap: SnapResult
}

export interface MeasureToolResult {
  readonly state: MeasureToolState
  readonly commands: readonly never[]
  readonly overlays: readonly OverlayPrimitive[]
}

export function initialMeasureState(): MeasureToolState {
  return { kind: 'idle' }
}

export function measureToolTransition(
  state: MeasureToolState,
  event: MeasureToolEvent,
  ctx: MeasureToolContext,
): MeasureToolResult {
  switch (event.type) {
    case 'pointerMove':
      if (state.kind === 'idle') return present(state, null, ctx)
      if (state.kind === 'dragging') return present({ kind: 'dragging', anchor: state.anchor }, ctx.snap.point, ctx)
      return present(state, null, ctx)

    case 'pointerDown':
      if (state.kind === 'idle') return present({ kind: 'dragging', anchor: ctx.snap.point }, ctx.snap.point, ctx)
      return present(state, null, ctx)

    case 'pointerUp':
      if (state.kind === 'dragging') {
        const end = ctx.snap.point
        return present({ kind: 'done', anchor: state.anchor, end }, null, ctx)
      }
      return present(state, null, ctx)

    case 'enter':
      if (state.kind === 'dragging') {
        const end = ctx.snap.point
        return present({ kind: 'done', anchor: state.anchor, end }, null, ctx)
      }
      return present(state, null, ctx)

    case 'escape':
      return present({ kind: 'idle' }, null, ctx)
  }
}

function present(
  state: MeasureToolState,
  cursorEnd: Point | null,
  ctx: MeasureToolContext,
): MeasureToolResult {
  const overlays: OverlayPrimitive[] = []

  if (state.kind === 'idle') {
    if (ctx.snap.merged !== null) {
      overlays.push({ kind: 'marker', role: 'snapNode', position: ctx.snap.point })
    }
    return { state, commands: [], overlays }
  }

  const end = state.kind === 'done' ? state.end : cursorEnd
  if (!end) return { state, commands: [], overlays }

  const anchor = state.anchor
  overlays.push({ kind: 'marker', role: 'measure', position: anchor })
  overlays.push({ kind: 'marker', role: 'measure', position: end })
  overlays.push({ kind: 'segment', role: 'measure', a: anchor, b: end })

  const d = distance(anchor, end)
  const text = String(Math.round(d / 10))
  const mid: Point = { x: (anchor.x + end.x) / 2, y: (anchor.y + end.y) / 2 }

  overlays.push({ kind: 'label', role: 'measureLabel', position: mid, text })

  return { state, commands: [], overlays }
}