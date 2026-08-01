import type { RenderContext } from '../renderContext'
import { resolveRoomPoints } from './utils'
import { formatArea, polygonArea, type PlanDocument, type Room } from '@planta/core'
import type { TextStyle } from '../target/DrawTarget'

/**
 * Pass 9: Rótulo de cômodo (nome + área no centroide).
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

    const centroid = computeCentroid(points)
    const area = computeRoomArea(doc, room)

    // Supressão se o polígono em tela é menor que a caixa do texto (~60px)
    const bbox = computeBBox(points)
    const screenW = (bbox.maxX - bbox.minX) * camera.scale
    const screenH = (bbox.maxY - bbox.minY) * camera.scale
    if (screenW < 60 || screenH < 40) continue

    // Nome na primeira linha (1 px acima do centroide)
    target.text(centroid.x, centroid.y - 1, room.name, nameStyle)

    // Área na segunda linha (1 px abaixo do centroide)
    const areaText = formatArea(area)
    target.text(centroid.x, centroid.y + 1, areaText, areaStyle)
  }
}

function computeCentroid(points: { x: number; y: number }[]): { x: number; y: number } {
  let sx = 0
  let sy = 0
  for (const p of points) {
    sx += p.x
    sy += p.y
  }
  return { x: sx / points.length, y: sy / points.length }
}

function computeBBox(points: { x: number; y: number }[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { minX, minY, maxX, maxY }
}

function computeRoomArea(
  doc: PlanDocument,
  room: Room,
): number {
  const points: { x: number; y: number }[] = []
  for (const nodeId of room.loop) {
    const node = doc.nodes.find((n) => n.id === nodeId)
    if (!node) return 0
    points.push({ x: node.x, y: node.y })
  }
  return polygonArea(points)
}

