import type { RenderContext } from '../renderContext'
import { resolveRoomPoints } from './utils'

/**
 * Pass 3: Preenchimento dos cômodos.
 * Alterna entre roomFill e roomFillAlt por índice para distinguir cômodos adjacentes.
 */
export function roomFillsPass(ctx: RenderContext): void {
  if (!ctx.doc) return

  const { doc, theme, target } = ctx

  doc.rooms.forEach((room, i) => {
    const points = resolveRoomPoints(doc, room.loop)
    if (!points || points.length < 3) return

    const color = room.color ?? (i % 2 === 0 ? theme.roomFill : theme.roomFillAlt)
    target.filledPolygon(points, { color })
  })
}