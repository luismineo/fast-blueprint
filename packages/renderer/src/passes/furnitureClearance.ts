import { obbCorners } from '@planta/core'
import type { RenderContext } from '../renderContext'

const CLEARANCE_OPACITY = 0.45

/**
 * Pass 4: faixas de circulação, abaixo dos móveis.
 *
 * Retângulo expandido pela circulação em todos os lados, preenchimento
 * translúcido, sem contorno (`04-renderizacao.md` § Mobília). Desenha em
 * espaço de mundo: é só preenchimento, sem texto e sem espessura de linha.
 */
export function furnitureClearancePass(ctx: RenderContext): void {
  const doc = ctx.doc
  if (!doc) return

  for (const item of doc.furniture) {
    if (item.clearance <= 0) continue

    const corners = obbCorners(
      item.center,
      item.width + item.clearance * 2,
      item.depth + item.clearance * 2,
      item.rotation,
    )

    ctx.target.filledPolygon(corners, {
      color: ctx.theme.clearance,
      opacity: CLEARANCE_OPACITY,
    })
  }
}
