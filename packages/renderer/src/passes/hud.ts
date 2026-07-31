import { computeScaleBar } from '../scaleBar'
import type { RenderContext } from '../renderContext'

const MARGIN_PX = 24
const TICK_HEIGHT_PX = 6
const HALF_TICK_HEIGHT_PX = 4
const LABEL_GAP_PX = 4
const LABEL_FONT = '11px "IBM Plex Mono", monospace'

export function hudPass(ctx: RenderContext): void {
  const { target, theme, viewport, camera } = ctx
  const bar = computeScaleBar(camera.scale)

  const x1 = MARGIN_PX
  const x2 = MARGIN_PX + bar.lengthPx
  const xMid = x1 + bar.lengthPx / 2
  const y = viewport.height - MARGIN_PX
  const style = { color: theme.dimension, width: theme.dimensionWidth }

  target.line(x1, y, x2, y, style)
  target.line(x1, y - TICK_HEIGHT_PX, x1, y, style)
  target.line(x2, y - TICK_HEIGHT_PX, x2, y, style)
  target.line(xMid, y - HALF_TICK_HEIGHT_PX, xMid, y, style)

  target.text(x1, y - TICK_HEIGHT_PX - LABEL_GAP_PX, bar.label, {
    color: theme.dimension,
    font: LABEL_FONT,
    align: 'left',
    baseline: 'alphabetic',
  })
}
