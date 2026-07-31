import { describe, expect, it } from 'vitest'
import { computeGridLines, gridSpacingFor, minorGridOpacity } from './grid'

describe('gridSpacingFor', () => {
  it('segue a tabela adaptativa de specs/04-renderizacao.md', () => {
    expect(gridSpacingFor(0.5)).toEqual({ major: 100, minor: 10 })
    expect(gridSpacingFor(0.3)).toEqual({ major: 500, minor: 100 })
    expect(gridSpacingFor(0.05)).toEqual({ major: 1000, minor: 500 })
    expect(gridSpacingFor(0.005)).toEqual({ major: 5000, minor: 1000 })
  })

  it('escala 0,3 desenha celulas de 500mm com subdivisao de 100mm (specs/04 criterio de aceitacao)', () => {
    expect(gridSpacingFor(0.3)).toEqual({ major: 500, minor: 100 })
  })
})

describe('minorGridOpacity', () => {
  it('e zero quando a densidade da subdivisao cai abaixo do limiar de fade', () => {
    expect(minorGridOpacity(0.05, 10)).toBe(0)
  })

  it('e um quando a densidade esta acima do fim do fade', () => {
    expect(minorGridOpacity(1, 100)).toBe(1)
  })

  it('interpola linearmente dentro da janela de fade', () => {
    const opacity = minorGridOpacity(0.08, 100)
    expect(opacity).toBeGreaterThan(0)
    expect(opacity).toBeLessThan(1)
  })
})

describe('computeGridLines', () => {
  it('so calcula linhas dentro da regiao visivel do viewport', () => {
    const camera = { tx: 0, ty: 0, scale: 1 }
    const viewport = { width: 500, height: 300 }
    const lines = computeGridLines(camera, viewport)

    for (const x of lines.verticalMajor) {
      expect(x).toBeGreaterThanOrEqual(-100)
      expect(x).toBeLessThanOrEqual(600)
    }
    for (const y of lines.horizontalMajor) {
      expect(y).toBeGreaterThanOrEqual(-100)
      expect(y).toBeLessThanOrEqual(400)
    }
  })
})
