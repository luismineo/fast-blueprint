import { describe, expect, it } from 'vitest'
import { SCALE_BAR_CONFIG, computeScaleBar } from './scaleBar'

describe('computeScaleBar', () => {
  it('usa as unidades de exemplo de specs/07-ui-e-layout.md conforme o zoom', () => {
    expect(computeScaleBar(0.6).label).toBe('10 cm')
    expect(computeScaleBar(0.15).label).toBe('50 cm')
    expect(computeScaleBar(0.07).label).toBe('1 m')
    expect(computeScaleBar(0.013).label).toBe('5 m')
  })

  it('mantem o comprimento em tela dentro (ou o mais perto possivel) da faixa alvo', () => {
    for (const scale of [0.05, 0.1, 0.5, 1, 2, 5, 10, 20]) {
      const bar = computeScaleBar(scale)
      expect(bar.lengthPx).toBeGreaterThanOrEqual(SCALE_BAR_CONFIG.targetPx.min - 1)
    }
  })

  it('nunca devolve um comprimento nao positivo', () => {
    const bar = computeScaleBar(20)
    expect(bar.lengthMm).toBeGreaterThan(0)
    expect(bar.lengthPx).toBeGreaterThan(0)
  })
})
