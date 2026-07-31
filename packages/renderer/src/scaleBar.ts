export const SCALE_BAR_CONFIG = {
  targetPx: { min: 60, max: 160 },
  niceStepsMm: [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000],
} as const

export interface ScaleBarSpec {
  readonly lengthMm: number
  readonly lengthPx: number
  readonly label: string
}

export function computeScaleBar(scale: number): ScaleBarSpec {
  const { min } = SCALE_BAR_CONFIG.targetPx
  const steps = SCALE_BAR_CONFIG.niceStepsMm

  for (const mm of steps) {
    const px = mm * scale
    if (px >= min) {
      return { lengthMm: mm, lengthPx: px, label: formatScaleLabel(mm) }
    }
  }

  const largest = steps[steps.length - 1]
  if (largest === undefined) {
    throw new Error('SCALE_BAR_CONFIG.niceStepsMm nao pode estar vazio')
  }
  return { lengthMm: largest, lengthPx: largest * scale, label: formatScaleLabel(largest) }
}

function formatScaleLabel(mm: number): string {
  if (mm < 1000) {
    return `${mm / 10} cm`
  }
  return `${mm / 1000} m`
}
