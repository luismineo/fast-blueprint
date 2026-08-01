import type { RenderContext } from '../renderContext'
import { resolveRoomPoints } from './utils'

/**
 * Pass 6: Arestas de cômodos e paredes avulsas.
 * Desenha cada aresta de cômodo como um segmento.
 */
export function wallsPass(ctx: RenderContext): void {
  if (!ctx.doc) return

  const { doc, theme, camera, target } = ctx

  // Espessura constante em pixels de tela: o pass desenha em milímetros, com
  // a transformação da câmera aplicada (`04-renderizacao.md` § Espessura
  // constante). Sem dividir pela escala, wallWidth viraria 2,5 mm — cerca de
  // 0,2 px no zoom inicial.
  const constantScreenWidth = theme.wallWidth / camera.scale

  for (const room of doc.rooms) {
    const points = resolveRoomPoints(doc, room.loop)
    if (!points || points.length < 2) continue

    for (let i = 0; i < points.length; i++) {
      const a = points[i]!
      const b = points[(i + 1) % points.length]!
      target.line(a.x, a.y, b.x, b.y, {
        color: theme.wall,
        width: constantScreenWidth,
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