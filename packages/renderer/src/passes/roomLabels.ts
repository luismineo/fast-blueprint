import type { RenderContext } from '../renderContext'
import { resolveRoomPoints } from './utils'
import { computeRoomArea, formatArea } from '@planta/core'
import { worldToScreenX, worldToScreenY } from '../camera'
import type { TextStyle } from '../target/DrawTarget'

const LINE_GAP_PX = 2
const MIN_WIDTH_PX = 60
const MIN_HEIGHT_PX = 40

/**
 * Pass 9: rótulo de cômodo (nome e área no centroide).
 *
 * Desenha em espaço de tela, com as duas linhas separadas em pixels — em
 * milímetros elas se sobrepõem em qualquer zoom realista.
 */
export function roomLabelsPass(ctx: RenderContext): void {
  if (!ctx.doc) return

  const { doc, theme, camera, target } = ctx

  const nameStyle: TextStyle = {
    color: theme.roomLabel,
    font: '12px Inter, sans-serif',
    align: 'center',
    baseline: 'bottom',
  }
  const areaStyle: TextStyle = {
    color: theme.roomLabel,
    font: '11px Inter, sans-serif',
    align: 'center',
    baseline: 'top',
  }

  for (const room of doc.rooms) {
    const points = resolveRoomPoints(doc, room.loop)
    if (!points || points.length < 3) continue

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    let sx = 0
    let sy = 0
    for (const p of points) {
      if (p.x < minX) minX = p.x
      if (p.y < minY) minY = p.y
      if (p.x > maxX) maxX = p.x
      if (p.y > maxY) maxY = p.y
      sx += p.x
      sy += p.y
    }

    if ((maxX - minX) * camera.scale < MIN_WIDTH_PX) continue
    if ((maxY - minY) * camera.scale < MIN_HEIGHT_PX) continue

    const cx = worldToScreenX(camera, sx / points.length)
    const cy = worldToScreenY(camera, sy / points.length)

    target.text(cx, cy - LINE_GAP_PX, room.name, nameStyle)
    target.text(cx, cy + LINE_GAP_PX, formatArea(computeRoomArea(doc, room.id)), areaStyle)
  }
}
