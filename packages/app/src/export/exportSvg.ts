import type { PlanDocument, FurnitureGlyph } from '@planta/core'
import { render, lightTheme, frameRect } from '@planta/renderer'
import { SvgTarget } from '@planta/renderer/src/target/SvgTarget'

function documentBounds(doc: PlanDocument) {
  if (doc.nodes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const node of doc.nodes) {
    if (node.x < minX) minX = node.x
    if (node.y < minY) minY = node.y
    if (node.x > maxX) maxX = node.x
    if (node.y > maxY) maxY = node.y
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function exportSvg(
  doc: PlanDocument,
  glyphs: Map<string, FurnitureGlyph>
): string {
  const rect = documentBounds(doc)
  const viewport = { width: 1920, height: 1080 }
  const camera = frameRect(rect, viewport, 0.05)

  const target = new SvgTarget()

  render({ camera, viewport, theme: lightTheme, target, doc, glyphs })

  return target.toSvg(viewport.width, viewport.height)
}
