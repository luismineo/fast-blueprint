import { computeGridLines } from '../grid'
import type { RenderContext } from '../renderContext'

export function gridPass(ctx: RenderContext): void {
  const { camera, target, theme, viewport } = ctx
  const lines = computeGridLines(camera, viewport)

  for (const x of lines.verticalMajor) {
    const screenX = x * camera.scale + camera.tx
    target.line(screenX, 0, screenX, viewport.height, { color: theme.gridMajor, width: 1 })
  }
  for (const y of lines.horizontalMajor) {
    const screenY = y * camera.scale + camera.ty
    target.line(0, screenY, viewport.width, screenY, { color: theme.gridMajor, width: 1 })
  }

  if (lines.minorOpacity <= 0) return

  for (const x of lines.verticalMinor) {
    const screenX = x * camera.scale + camera.tx
    target.line(screenX, 0, screenX, viewport.height, {
      color: theme.grid,
      width: 1,
      opacity: lines.minorOpacity,
    })
  }
  for (const y of lines.horizontalMinor) {
    const screenY = y * camera.scale + camera.ty
    target.line(0, screenY, viewport.width, screenY, {
      color: theme.grid,
      width: 1,
      opacity: lines.minorOpacity,
    })
  }
}
