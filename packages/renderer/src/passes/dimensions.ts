import type { RenderContext } from '../renderContext'
import { resolveRoomPoints } from './utils'
import { formatLength } from '@planta/core'
import type { TextStyle } from '../target/DrawTarget'

/**
 * Pass 8: Cotas de aresta.
 * Desenha o comprimento de cada aresta de cômodo como texto rotacionado.
 */
export function dimensionsPass(ctx: RenderContext): void {
  if (!ctx.doc) return

  const { doc, theme, camera, target } = ctx

  const dimStyle: TextStyle = {
    color: theme.dimension,
    font: '10px Inter, sans-serif',
    align: 'center',
    baseline: 'middle',
  }

  const offsetPx = 14 // offset em px da aresta
  const offsetMm = offsetPx / camera.scale

  for (const room of doc.rooms) {
    const points = resolveRoomPoints(doc, room.loop)
    if (!points || points.length < 2) continue

    for (let i = 0; i < points.length; i++) {
      const a = points[i]!
      const b = points[(i + 1) % points.length]!

      const length = Math.hypot(b.x - a.x, b.y - a.y)
      const midX = (a.x + b.x) / 2
      const midY = (a.y + b.y) / 2

      // Normal da aresta (perpendicular, lado de fora do polígono)
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.hypot(dx, dy)
      if (len === 0) continue

      // Normal apontando para fora (sentido anti-horário da aresta)
      const nx = -dy / len
      const ny = dx / len

      const labelX = midX + nx * offsetMm
      const labelY = midY + ny * offsetMm

      // Ângulo da aresta, normalizado para [−90°, 90°] para legibilidade
      let angle = Math.atan2(b.y - a.y, b.x - a.x)
      // Normaliza para que o texto nunca fique de cabeça para baixo
      if (angle > Math.PI / 2) angle -= Math.PI
      if (angle < -Math.PI / 2) angle += Math.PI

      // Supressão por espaço: se o comprimento em tela é menor que ~40px, pula
      const screenLength = length * camera.scale
      if (screenLength < 40) continue

      const text = formatLength(length, doc.meta.displayUnit)
      target.textRotated(labelX, labelY, text, angle, dimStyle)
    }
  }
}