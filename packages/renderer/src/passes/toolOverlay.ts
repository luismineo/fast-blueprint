import type { RenderContext } from '../renderContext'
import { TOOL_OVERLAY_ROLES, overlayStyles } from '../overlayStyle'
import { drawOverlay } from './overlayDraw'

/**
 * Pass 11: traço em andamento da ferramenta ativa.
 * Desenha as primitivas de papel `draft`, `ghost` e `closeTarget`;
 * as guias de snap ficam com o pass 10.
 */
export function toolOverlayPass(ctx: RenderContext): void {
  const overlays = ctx.overlays
  if (!overlays || overlays.length === 0) return

  const styles = overlayStyles(ctx.theme)
  for (let i = 0; i < overlays.length; i += 1) {
    const primitive = overlays[i]!
    if (!TOOL_OVERLAY_ROLES.has(primitive.role)) continue
    drawOverlay(primitive, styles[primitive.role], ctx.camera, ctx.target)
  }
}
