import { describe, expect, it } from 'vitest'
import { gridPass } from './grid'
import { RecordingTarget } from '../target/RecordingTarget'
import { lightTheme } from '../theme'

describe('gridPass', () => {
  it('desenha em coordenadas de mundo (mm): a canvas aplica a transformacao, nao o pass (specs/04 secao Camera)', () => {
    const target = new RecordingTarget()
    const camera = { tx: 0, ty: 0, scale: 2 }
    const viewport = { width: 800, height: 600 }
    gridPass({ camera, viewport, theme: lightTheme, target })

    const verticalLine = target.lines.find((line) => line.x1 === line.x2)
    expect(verticalLine).toBeDefined()
    const worldHeight = Math.abs((verticalLine?.y2 ?? 0) - (verticalLine?.y1 ?? 0))
    expect(worldHeight).toBeCloseTo(viewport.height / camera.scale, 5)
  })

  it('usa espessura constante em tela: lineWidth = px / scale (specs/04 secao Espessura constante)', () => {
    const target = new RecordingTarget()
    const camera = { tx: 0, ty: 0, scale: 2.5 }
    gridPass({ camera, viewport: { width: 800, height: 600 }, theme: lightTheme, target })

    expect(target.lines.length).toBeGreaterThan(0)
    expect(target.lines.every((line) => line.style.width === 1 / camera.scale)).toBe(true)
  })

  it('desenha linhas principais e de subdivisao com as cores do tema', () => {
    const target = new RecordingTarget()
    gridPass({
      camera: { tx: 0, ty: 0, scale: 1 },
      viewport: { width: 800, height: 600 },
      theme: lightTheme,
      target,
    })

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
