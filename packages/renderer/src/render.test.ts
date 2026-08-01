import { describe, expect, it, vi } from 'vitest'
import { passSpaces, render } from './render'
import { lightTheme } from './theme'
import { RecordingTarget } from './target/RecordingTarget'
import type { DrawTarget } from './target/DrawTarget'
import type { Camera } from './camera'
import type { FillStyle, LineStyle } from './target/DrawTarget'

class ThrowingLineTarget implements DrawTarget {
  readonly clears: string[] = []

  clear(color: string): void {
    this.clears.push(color)
  }

  setWorldTransform(_camera: Camera): void {}

  resetTransform(): void {}

  line(): void {
    throw new Error('linha falhou de proposito')
  }

  polyline(_points: { x: number; y: number }[], _style: LineStyle): void {}

  filledPolygon(_points: { x: number; y: number }[], _fill: FillStyle): void {}

  text(): void {}

  textRotated(): void {}
}

describe('render', () => {
  it('desenha geometria em espaco de mundo e texto/overlay em espaco de tela', () => {
    const spaces = passSpaces()

    // Geometria: a matriz da camera converte mm para px.
    expect(spaces.grid).toBe('world')
    expect(spaces.roomFills).toBe('world')
    expect(spaces.walls).toBe('world')

    // Texto e overlay: nunca escalados pela matriz (specs/04 secao Espessura
    // constante). Foi por rodarem em espaco de mundo que cota e rotulo saiam
    // com fonte de fracao de pixel no zoom inicial.
    expect(spaces.dimensions).toBe('screen')
    expect(spaces.roomLabels).toBe('screen')
    expect(spaces.snapGuides).toBe('screen')
    expect(spaces.toolOverlay).toBe('screen')
    expect(spaces.hud).toBe('screen')
  })

  it('aplica a transformacao correspondente antes de cada pass', () => {
    const target = new RecordingTarget()
    render({
      camera: { tx: 10, ty: 20, scale: 2 },
      viewport: { width: 800, height: 600 },
      theme: lightTheme,
      target,
    })

    const spaces = passSpaces()
    const expected = Object.values(spaces).map((s) => (s === 'world' ? 'world' : 'reset'))
    expect(target.transforms.map((entry) => entry.kind)).toEqual(expected)
  })

  it('erro num pass nao interrompe os demais', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const target = new ThrowingLineTarget()
    const ctx = {
      camera: { tx: 0, ty: 0, scale: 1 },
      viewport: { width: 800, height: 600 },
      theme: lightTheme,
      target,
    }

    expect(() => render(ctx)).not.toThrow()
    expect(target.clears).toEqual([lightTheme.background])

    errorSpy.mockRestore()
  })

  it('loga o mesmo erro de pass uma unica vez', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const target = new ThrowingLineTarget()
    const ctx = {
      camera: { tx: 0, ty: 0, scale: 1 },
      viewport: { width: 800, height: 600 },
      theme: lightTheme,
      target,
    }

    render(ctx)
    const callsAfterFirstFrame = errorSpy.mock.calls.length
    render(ctx)
    expect(errorSpy.mock.calls.length).toBe(callsAfterFirstFrame)

    errorSpy.mockRestore()
  })
})