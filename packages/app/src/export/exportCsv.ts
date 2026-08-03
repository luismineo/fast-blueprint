import type { PlanDocument, Point } from '@planta/core'
import { polygonArea, edgeLength, containment } from '@planta/core/src/geometry/geometry'

function getRoomPolygon(doc: PlanDocument, roomLoop: string[]): Point[] {
  const nodeMap = new Map<string, Point>()
  for (const node of doc.nodes) {
    nodeMap.set(node.id, { x: node.x, y: node.y })
  }
  
  const polygon: Point[] = []
  for (const nodeId of roomLoop) {
    const node = nodeMap.get(nodeId)
    if (node) {
      polygon.push(node)
    }
  }
  return polygon
}

export function exportCsv(doc: PlanDocument): string {
  const lines: string[] = []

  lines.push('Cômodos')
  lines.push('Nome;Área (m2);Perímetro (m)')

  const nodeMap = new Map<string, Point>()
  for (const node of doc.nodes) {
    nodeMap.set(node.id, { x: node.x, y: node.y })
  }

  for (const room of doc.rooms) {
    const polygon = getRoomPolygon(doc, room.loop)
    if (polygon.length < 3) continue

    const areaMm2 = polygonArea(polygon)
    const areaM2 = areaMm2 / 1000000

    let perimeterMm = 0
    for (let i = 0; i < polygon.length; i++) {
      const p1 = polygon[i]!
      const p2 = polygon[(i + 1) % polygon.length]!
      perimeterMm += edgeLength(p1, p2)
    }
    const perimeterM = perimeterMm / 1000

    lines.push(`${room.name};${areaM2.toFixed(2)};${perimeterM.toFixed(2)}`)
  }

  lines.push('')

  lines.push('Móveis')
  lines.push('Nome;Largura (m);Profundidade (m);Cômodo')

  for (const item of doc.furniture) {
    const widthM = item.width / 1000
    const depthM = item.depth / 1000

    let roomName = ''
    for (const room of doc.rooms) {
      const polygon = getRoomPolygon(doc, room.loop)
      if (polygon.length < 3) continue
      
      const status = containment([item.center], polygon)
      if (status === 'inside' || status === 'partial') {
        roomName = room.name
        break
      }
    }

    lines.push(`${item.name};${widthM.toFixed(2)};${depthM.toFixed(2)};${roomName}`)
  }

  return lines.join('\n')
}
