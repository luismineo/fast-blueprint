import type { OverlayRole } from '@planta/core'
import type { Theme } from './theme'
import type { LineStyle } from './target/DrawTarget'

export const MARKER_HALF_PX: Readonly<Record<OverlayRole, number>> = {
  draft: 4,
  ghost: 4,
  snapNode: 4,
  axisGuide: 4,
  closeTarget: 5,
}

export const TOOL_OVERLAY_ROLES: ReadonlySet<OverlayRole> = new Set<OverlayRole>([
  'draft',
  'ghost',
  'closeTarget',
])

export const SNAP_GUIDE_ROLES: ReadonlySet<OverlayRole> = new Set<OverlayRole>([
  'snapNode',
  'axisGuide',
])

const cache = new WeakMap<Theme, Readonly<Record<OverlayRole, LineStyle>>>()

/**
 * Mapeia papel semântico para estilo do tema.
 *
 * As larguras são em pixels de tela; os passes de overlay desenham em espaço
 * de tela, então nenhuma divisão por `camera.scale` é necessária aqui.
 * Memoizado por tema para não alocar estilo por frame (spec 04, regra 2).
 */
export function overlayStyles(theme: Theme): Readonly<Record<OverlayRole, LineStyle>> {
  const cached = cache.get(theme)
  if (cached) return cached

  const styles: Record<OverlayRole, LineStyle> = {
    draft: { color: theme.wall, width: theme.wallWidth },
    ghost: { color: theme.wall, width: theme.wallWidth, opacity: 0.45, dash: [6, 4] },
    snapNode: { color: theme.snapNode, width: 1.5 },
    closeTarget: { color: theme.snapNode, width: 2 },
    axisGuide: { color: theme.snapGuide, width: 1, dash: [4, 4] },
  }

  cache.set(theme, styles)
  return styles
}
