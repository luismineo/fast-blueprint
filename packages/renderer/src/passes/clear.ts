import type { RenderContext } from '../renderContext'

export function clearPass(ctx: RenderContext): void {
  ctx.target.clear(ctx.theme.background)
}
