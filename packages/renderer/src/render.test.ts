import { describe, expect, it, vi } from 'vitest'
import { render } from './render'
import { lightTheme } from './theme'
import { RecordingTarget } from './target/RecordingTarget'
import type { DrawTarget } from './target/DrawTarget'
import type { Camera } from './camera'
import type { FillStyle, LineStyle, TextStyle } from './target/DrawTarget'

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
  it('aplica a transformacao de mundo nos passes de geometria e reseta antes dos passes de tela', () => {
    const target = new RecordingTarget()
    render({
      camera: { tx: 10, ty: 20, scale: 2 },
      viewport: { width: 800, height: 600 },
      theme: lightTheme,
      target,
    })

    expect(target.transforms.map((entry) => entry.kind)).toEqual(
      // reset (clear), world (grid, roomFills, walls, dimensions, roomLabels, snapGuides, toolOverlay), reset (hud)
      ['reset', 'world', 'world', 'world', 'world', 'world', 'world', 'world', 'reset'],
    )
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