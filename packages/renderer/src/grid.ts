import { screenToWorld, type Camera, type Size } from './camera'

export interface GridSpacing {
  readonly major: number
  readonly minor: number
}

export const GRID_CONFIG = {
  breakpoints: [
    { minScale: 0.4, spacing: { major: 100, minor: 10 } },
    { minScale: 0.08, spacing: { major: 500, minor: 100 } },
    { minScale: 0.016, spacing: { major: 1000, minor: 500 } },
    { minScale: 0, spacing: { major: 5000, minor: 1000 } },
  ],
  minorFadeStartPx: 6,
  minorFadeEndPx: 10,
} as const

export function gridSpacingFor(scale: number): GridSpacing {
  for (const breakpoint of GRID_CONFIG.breakpoints) {
    if (scale > breakpoint.minScale) {
      return breakpoint.spacing
    }
  }
  const last = GRID_CONFIG.breakpoints[GRID_CONFIG.breakpoints.length - 1]
  if (!last) {
    throw new Error('GRID_CONFIG.breakpoints nao pode estar vazio')
  }
  return last.spacing
}

export function minorGridOpacity(scale: number, minorSpacing: number): number {
  const minorPx = minorSpacing * scale
  const { minorFadeStartPx, minorFadeEndPx } = GRID_CONFIG
  if (minorPx <= minorFadeStartPx) return 0
  if (minorPx >= minorFadeEndPx) return 1
  return (minorPx - minorFadeStartPx) / (minorFadeEndPx - minorFadeStartPx)
}

export interface GridLines {
  readonly spacing: GridSpacing
  readonly minorOpacity: number
  readonly verticalMajor: readonly number[]
  readonly verticalMinor: readonly number[]
  readonly horizontalMajor: readonly number[]
  readonly horizontalMinor: readonly number[]
}

export function computeGridLines(camera: Camera, viewport: Size): GridLines {
  const spacing = gridSpacingFor(camera.scale)
  const topLeft = screenToWorld(camera, { x: 0, y: 0 })
  const bottomRight = screenToWorld(camera, { x: viewport.width, y: viewport.height })

  return {
    spacing,
    minorOpacity: minorGridOpacity(camera.scale, spacing.minor),
    verticalMajor: linesInRange(topLeft.x, bottomRight.x, spacing.major),
    verticalMinor: linesInRange(topLeft.x, bottomRight.x, spacing.minor),
    horizontalMajor: linesInRange(topLeft.y, bottomRight.y, spacing.major),
    horizontalMinor: linesInRange(topLeft.y, bottomRight.y, spacing.minor),
  }
}

function linesInRange(min: number, max: number, spacing: number): number[] {
  const start = Math.floor(min / spacing) * spacing
  const lines: number[] = []
  for (let value = start; value <= max; value += spacing) {
    lines.push(value)
  }
  return lines
}
