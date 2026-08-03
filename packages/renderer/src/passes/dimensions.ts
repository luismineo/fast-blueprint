import type { RenderContext } from '../renderContext'
import { resolveRoomPoints } from './utils'
import { formatLength } from '@planta/core'
import { worldToScreenX, worldToScreenY } from '../camera'
import type { TextStyle } from '../target/DrawTarget'

const OFFSET_PX = 14
const FONT = '10px Inter, sans-serif'
const CHAR_WIDTH_PX = 6
const PADDING_PX = 8

/**
 * Pass 8: cotas de aresta.
 *
 * Desenha em espaço de tela: texto nunca é escalado pela matriz da câmera
 * (`04-renderizacao.md` § Espessura constante).
 */
export function dimensionsPass(ctx: RenderContext): void {
  if (!ctx.doc) return

  const { doc, theme, camera, target } = ctx
  const style: TextStyle = {
    color: theme.dimension,
    font: FONT,
    align: 'center',
    baseline: 'middle',
  }

  for (const room of doc.rooms) {
    const points = resolveRoomPoints(doc, room.loop)
    if (!points || points.length < 2) continue

    for (let i = 0; i < points.length; i += 1) {
      const a = points[i]!
      const b = points[(i + 1) % points.length]!
      drawDimension(a, b, doc.meta.displayUnit, camera, target, style)
    }
  }

  for (const wall of doc.walls) {
    const a = resolveNode(doc, wall.a)
    const b = resolveNode(doc, wall.b)
    if (!a || !b) continue
    drawDimension(a, b, doc.meta.displayUnit, camera, target, style)
  }
}

function resolveNode(doc: RenderContext['doc'] & {}, nodeId: string) {
  const node = doc.nodes.find((n) => n.id === nodeId)
  return node ? { x: node.x, y: node.y } : null
}

function drawDimension(
  a: { x: number; y: number },
  b: { x: number; y: number },
  unit: 'm' | 'cm',
  camera: RenderContext['camera'],
  target: RenderContext['target'],
  style: TextStyle,
): void {
  const lengthMm = Math.hypot(b.x - a.x, b.y - a.y)
  if (lengthMm === 0) return

  const ax = worldToScreenX(camera, a.x)
  const ay = worldToScreenY(camera, a.y)
  const bx = worldToScreenX(camera, b.x)
  const by = worldToScreenY(camera, b.y)

  const dx = bx - ax
  const dy = by - ay
  const screenLength = Math.hypot(dx, dy)

  const text = formatLength(lengthMm, unit)
  if (screenLength < text.length * CHAR_WIDTH_PX + PADDING_PX) return

  const nx = dy / screenLength
  const ny = -dx / screenLength

  let angle = Math.atan2(dy, dx)
  if (angle > Math.PI / 2) angle -= Math.PI
  if (angle < -Math.PI / 2) angle += Math.PI

  target.textRotated(
    (ax + bx) / 2 + nx * OFFSET_PX,
    (ay + by) / 2 + ny * OFFSET_PX,
    text,
    angle,
    style,
  )
}
