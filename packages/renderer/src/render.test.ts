import { describe, expect, it, vi } from 'vitest'
import { render } from './render'
import { lightTheme } from './theme'
import type { DrawTarget } from './target/DrawTarget'

class ThrowingLineTarget implements DrawTarget {
  readonly clears: string[] = []

  clear(color: string): void {
    this.clears.push(color)
  }

  line(): void {
    throw new Error('linha falhou de proposito')
  }

  text(): void {}
}

describe('render', () => {
  it('erro num pass nao interrompe os demais (specs/08-arquitetura.md criterio de aceitacao)', () => {
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

  it('loga o mesmo erro de pass uma unica vez, mesmo em frames repetidos (dedupe por assinatura)', () => {
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
