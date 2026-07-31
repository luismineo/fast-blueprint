import { describe, expect, it } from 'vitest'
import { gridPass } from './grid'
import { RecordingTarget } from '../target/RecordingTarget'
import { lightTheme } from '../theme'

describe('gridPass', () => {
  it('desenha linhas principais e de subdivisao com as cores do tema', () => {
    const target = new RecordingTarget()
    gridPass({
      camera: { tx: 0, ty: 0, scale: 1 },
      viewport: { width: 800, height: 600 },
      theme: lightTheme,
      target,
    })

    expect(target.lines.length).toBeGreaterThan(0)
    expect(target.lines.some((line) => line.style.color === lightTheme.gridMajor)).toBe(true)
    expect(target.lines.some((line) => line.style.color === lightTheme.grid)).toBe(true)
  })

  it('nao desenha subdivisao quando a densidade cai abaixo do limiar de fade', () => {
    const target = new RecordingTarget()
    gridPass({
      camera: { tx: 0, ty: 0, scale: 0.003 },
      viewport: { width: 800, height: 600 },
      theme: lightTheme,
      target,
    })

    expect(target.lines.some((line) => line.style.color === lightTheme.grid)).toBe(false)
    expect(target.lines.some((line) => line.style.color === lightTheme.gridMajor)).toBe(true)
  })
})
