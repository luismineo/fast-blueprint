import type { OverlayRole } from '@planta/core'
import type { Theme } from './theme'
import type { LineStyle } from './target/DrawTarget'

export const MARKER_HALF_PX: Readonly<Record<OverlayRole, number>> = {
  draft: 4,
  ghost: 4,
  snapNode: 4,
  midpoint: 4,
  axisGuide: 4,
  alignmentGuide: 4,
  edgeHighlight: 4,
  closeTarget: 5,
  marquee: 4,
}

/** Papéis desenhados como losango em vez de quadrado (spec 02 § Guias visuais). */
export const DIAMOND_ROLES: ReadonlySet<OverlayRole> = new Set<OverlayRole>(['midpoint'])

export const TOOL_OVERLAY_ROLES: ReadonlySet<OverlayRole> = new Set<OverlayRole>([
  'draft',
  'ghost',
  'closeTarget',
  'marquee',
])

export const SNAP_GUIDE_ROLES: ReadonlySet<OverlayRole> = new Set<OverlayRole>([
  'snapNode',
  'midpoint',
  'axisGuide',
  'alignmentGuide',
  'edgeHighlight',
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
    midpoint: { color: theme.snapNode, width: 1.5 },
    closeTarget: { color: theme.snapNode, width: 2 },
    axisGuide: { color: theme.snapGuide, width: 1, dash: [4, 4] },
    alignmentGuide: { color: theme.snapGuide, width: 1, dash: [2, 5] },
    edgeHighlight: { color: theme.snapGuide, width: 2, opacity: 0.6 },
    marquee: { color: theme.selection, width: 1, dash: [4, 3] },
  }

  cache.set(theme, styles)
  return styles
}
