import { screenToWorld } from '../camera'
import { computeGridLines } from '../grid'
import type { RenderContext } from '../renderContext'

export function gridPass(ctx: RenderContext): void {
  const { camera, target, theme, viewport } = ctx
  const lines = computeGridLines(camera, viewport)
  const worldTop = screenToWorld(camera, { x: 0, y: 0 })
  const worldBottom = screenToWorld(camera, { x: viewport.width, y: viewport.height })
  const constantScreenWidth = 1 / camera.scale

  for (const x of lines.verticalMajor) {
    target.line(x, worldTop.y, x, worldBottom.y, { color: theme.gridMajor, width: constantScreenWidth })
  }
  for (const y of lines.horizontalMajor) {
    target.line(worldTop.x, y, worldBottom.x, y, { color: theme.gridMajor, width: constantScreenWidth })
  }

  if (lines.minorOpacity <= 0) return

  for (const x of lines.verticalMinor) {
    target.line(x, worldTop.y, x, worldBottom.y, {
      color: theme.grid,
      width: constantScreenWidth,
      opacity: lines.minorOpacity,
    })
  }
  for (const y of lines.horizontalMinor) {
    target.line(worldTop.x, y, worldBottom.x, y, {
      color: theme.grid,
      width: constantScreenWidth,
      opacity: lines.minorOpacity,
    })
  }
}
