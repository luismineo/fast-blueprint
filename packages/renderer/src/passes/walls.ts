import type { RenderContext } from '../renderContext'
import { resolveRoomPoints } from './utils'

/**
 * Pass 6: Arestas de cômodos e paredes avulsas.
 * Desenha cada aresta de cômodo como um segmento.
 */
export function wallsPass(ctx: RenderContext): void {
  if (!ctx.doc) return

  const { doc, theme, target } = ctx

  for (const room of doc.rooms) {
    const points = resolveRoomPoints(doc, room.loop)
    if (!points || points.length < 2) continue

    for (let i = 0; i < points.length; i++) {
      const a = points[i]!
      const b = points[(i + 1) % points.length]!
      target.line(a.x, a.y, b.x, b.y, {
        color: theme.wall,
        width: theme.wallWidth,
      })
    }
  }

  // Paredes avulsas
  for (const wall of doc.walls) {
    const a = doc.nodes.find((n) => n.id === wall.a)
    const b = doc.nodes.find((n) => n.id === wall.b)
    if (!a || !b) continue
    target.line(a.x, a.y, b.x, b.y, {
      color: theme.wall,
      width: theme.wallWidth,
    })
  }
}