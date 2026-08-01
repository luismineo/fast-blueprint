import type { RenderContext } from '../renderContext'
import { SNAP_GUIDE_ROLES, overlayStyles } from '../overlayStyle'
import { drawOverlay } from './overlayDraw'

/**
 * Pass 10: guias de alinhamento e eixo.
 * Desenha as primitivas de papel `snapNode` e `axisGuide`, abaixo do traço
 * em andamento (pass 11).
 */
export function snapGuidesPass(ctx: RenderContext): void {
  const overlays = ctx.overlays
  if (!overlays || overlays.length === 0) return

  const styles = overlayStyles(ctx.theme)
  for (let i = 0; i < overlays.length; i += 1) {
    const primitive = overlays[i]!
    if (!SNAP_GUIDE_ROLES.has(primitive.role)) continue
    drawOverlay(primitive, styles[primitive.role], ctx.camera, ctx.target)
  }
}
