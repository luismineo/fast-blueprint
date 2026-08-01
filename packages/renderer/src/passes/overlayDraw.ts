import type { OverlayPrimitive, OverlayRole } from '@planta/core'
import type { Camera } from '../camera'
import { worldToScreenX, worldToScreenY } from '../camera'
import type { DrawTarget, LineStyle } from '../target/DrawTarget'
import { DIAMOND_ROLES, MARKER_HALF_PX } from '../overlayStyle'

const scratch: { x: number; y: number }[] = []

function buffer(size: number): { x: number; y: number }[] {
  while (scratch.length < size) scratch.push({ x: 0, y: 0 })
  scratch.length = size
  return scratch
}

export function drawOverlay(
  primitive: OverlayPrimitive,
  style: LineStyle,
  camera: Camera,
  target: DrawTarget,
): void {
  switch (primitive.kind) {
    case 'polyline': {
      const count = primitive.points.length + (primitive.closed ? 1 : 0)
      if (count < 2) return
      const points = buffer(count)
      for (let i = 0; i < primitive.points.length; i += 1) {
        const p = primitive.points[i]!
        points[i]!.x = worldToScreenX(camera, p.x)
        points[i]!.y = worldToScreenY(camera, p.y)
      }
      if (primitive.closed) {
        const first = primitive.points[0]!
        points[count - 1]!.x = worldToScreenX(camera, first.x)
        points[count - 1]!.y = worldToScreenY(camera, first.y)
      }
      target.polyline(points, style)
      return
    }

    case 'segment': {
      target.line(
        worldToScreenX(camera, primitive.a.x),
        worldToScreenY(camera, primitive.a.y),
        worldToScreenX(camera, primitive.b.x),
        worldToScreenY(camera, primitive.b.y),
        style,
      )
      return
    }

    case 'marker': {
      const role = primitive.role as OverlayRole
      const half = MARKER_HALF_PX[role]
      const cx = worldToScreenX(camera, primitive.position.x)
      const cy = worldToScreenY(camera, primitive.position.y)
      const outline = buffer(5)

      if (DIAMOND_ROLES.has(role)) {
        outline[0]!.x = cx
        outline[0]!.y = cy - half
        outline[1]!.x = cx + half
        outline[1]!.y = cy
        outline[2]!.x = cx
        outline[2]!.y = cy + half
        outline[3]!.x = cx - half
        outline[3]!.y = cy
        outline[4]!.x = cx
        outline[4]!.y = cy - half
      } else {
        outline[0]!.x = cx - half
        outline[0]!.y = cy - half
        outline[1]!.x = cx + half
        outline[1]!.y = cy - half
        outline[2]!.x = cx + half
        outline[2]!.y = cy + half
        outline[3]!.x = cx - half
        outline[3]!.y = cy + half
        outline[4]!.x = cx - half
        outline[4]!.y = cy - half
      }

      target.polyline(outline, style)
      return
    }

    case 'label': {
      target.text(
        worldToScreenX(camera, primitive.position.x),
        worldToScreenY(camera, primitive.position.y),
        primitive.text,
        { color: style.color, font: '11px "IBM Plex Mono", monospace', align: 'center', baseline: 'middle' },
      )
    }
  }
}
