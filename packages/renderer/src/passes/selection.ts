import {
  edgePoints,
  formatLength,
  roomPoints,
  selectionKey,
  type PlanDocument,
  type Point,
  type SelectionRef,
} from '@planta/core'
import type { RenderContext } from '../renderContext'
import { worldToScreenX, worldToScreenY } from '../camera'
import type { LineStyle, TextStyle } from '../target/DrawTarget'
import type { Theme } from '../theme'

const HANDLE_HALF_PX = 4
const EDGE_LABEL_OFFSET_PX = 12

const scratch: { x: number; y: number }[] = []

function buffer(size: number): { x: number; y: number }[] {
  while (scratch.length < size) scratch.push({ x: 0, y: 0 })
  scratch.length = size
  return scratch
}

interface SelectionStyles {
  readonly roomOutline: LineStyle
  readonly edge: LineStyle
  readonly handle: LineStyle
  readonly hoverHandle: LineStyle
  readonly label: TextStyle
}

const styleCache = new WeakMap<Theme, SelectionStyles>()

function selectionStyles(theme: Theme): SelectionStyles {
  const cached = styleCache.get(theme)
  if (cached) return cached

  const styles: SelectionStyles = {
    roomOutline: { color: theme.selection, width: theme.wallWidth * 2 },
    edge: { color: theme.selection, width: theme.wallWidth * 2 },
    handle: { color: theme.selection, width: 2 },
    hoverHandle: { color: theme.selection, width: 1 },
    label: {
      color: theme.selection,
      font: '11px "IBM Plex Mono", monospace',
      align: 'center',
      baseline: 'middle',
    },
  }

  styleCache.set(theme, styles)
  return styles
}

/**
 * Pass 12: contornos de seleção e handles.
 *
 * Desenha em espaço de tela: handle de 8 px e espessura dobrada precisam ser
 * constantes em pixels, independentes do zoom (`04-renderizacao.md`
 * § Espessura constante).
 */
export function selectionPass(ctx: RenderContext): void {
  const doc = ctx.doc
  if (!doc) return

  const selection = ctx.selection ?? []
  const hover = ctx.hover ?? null
  if (selection.length === 0 && !hover) return

  const styles = selectionStyles(ctx.theme)

  for (let i = 0; i < selection.length; i += 1) {
    drawSelected(selection[i]!, doc, ctx, styles)
  }

  if (hover && !isSelected(selection, hover)) {
    drawHover(hover, doc, ctx, styles)
  }
}

function isSelected(selection: readonly SelectionRef[], ref: SelectionRef): boolean {
  const key = selectionKey(ref)
  for (let i = 0; i < selection.length; i += 1) {
    if (selectionKey(selection[i]!) === key) return true
  }
  return false
}

function drawSelected(
  ref: SelectionRef,
  doc: PlanDocument,
  ctx: RenderContext,
  styles: SelectionStyles,
): void {
  switch (ref.kind) {
    case 'room': {
      const points = roomPoints(doc, ref.roomId)
      if (!points || points.length < 3) return
      drawRoomOutline(points, ctx, styles)
      return
    }

    case 'node': {
      const node = doc.nodes.find((candidate) => candidate.id === ref.nodeId)
      if (!node) return
      drawHandle(node, ctx, styles.handle)
      return
    }

    case 'edge': {
      const ends = edgePoints(doc, ref.edge)
      if (!ends) return
      drawEdge(ends[0], ends[1], ctx, styles)
    }
  }
}

function drawHover(
  ref: SelectionRef,
  doc: PlanDocument,
  ctx: RenderContext,
  styles: SelectionStyles,
): void {
  if (ref.kind !== 'node') return
  const node = doc.nodes.find((candidate) => candidate.id === ref.nodeId)
  if (!node) return
  drawHandle(node, ctx, styles.hoverHandle)
}

function drawRoomOutline(
  points: readonly Point[],
  ctx: RenderContext,
  styles: SelectionStyles,
): void {
  const count = points.length + 1
  const screen = buffer(count)

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i]!
    screen[i]!.x = worldToScreenX(ctx.camera, point.x)
    screen[i]!.y = worldToScreenY(ctx.camera, point.y)
  }
  screen[count - 1]!.x = screen[0]!.x
  screen[count - 1]!.y = screen[0]!.y

  ctx.target.polyline(screen, styles.roomOutline)
}

function drawEdge(
  from: Point,
  to: Point,
  ctx: RenderContext,
  styles: SelectionStyles,
): void {
  const x1 = worldToScreenX(ctx.camera, from.x)
  const y1 = worldToScreenY(ctx.camera, from.y)
  const x2 = worldToScreenX(ctx.camera, to.x)
  const y2 = worldToScreenY(ctx.camera, to.y)

  ctx.target.line(x1, y1, x2, y2, styles.edge)

  // Rótulo de comprimento sempre visível na aresta selecionada
  // (`03-ferramentas-e-interacao.md` § Handles).
  const length = Math.hypot(to.x - from.x, to.y - from.y)
  const unit = ctx.doc ? ctx.doc.meta.displayUnit : 'm'

  const dx = x2 - x1
  const dy = y2 - y1
  const screenLength = Math.hypot(dx, dy)
  const offsetX = screenLength === 0 ? 0 : (-dy / screenLength) * EDGE_LABEL_OFFSET_PX
  const offsetY = screenLength === 0 ? 0 : (dx / screenLength) * EDGE_LABEL_OFFSET_PX

  ctx.target.text(
    (x1 + x2) / 2 + offsetX,
    (y1 + y2) / 2 + offsetY,
    formatLength(length, unit),
    styles.label,
  )
}

function drawHandle(at: Point, ctx: RenderContext, style: LineStyle): void {
  const cx = worldToScreenX(ctx.camera, at.x)
  const cy = worldToScreenY(ctx.camera, at.y)
  const square = buffer(5)

  square[0]!.x = cx - HANDLE_HALF_PX
  square[0]!.y = cy - HANDLE_HALF_PX
  square[1]!.x = cx + HANDLE_HALF_PX
  square[1]!.y = cy - HANDLE_HALF_PX
  square[2]!.x = cx + HANDLE_HALF_PX
  square[2]!.y = cy + HANDLE_HALF_PX
  square[3]!.x = cx - HANDLE_HALF_PX
  square[3]!.y = cy + HANDLE_HALF_PX
  square[4]!.x = cx - HANDLE_HALF_PX
  square[4]!.y = cy - HANDLE_HALF_PX

  ctx.target.polyline(square, style)
}
