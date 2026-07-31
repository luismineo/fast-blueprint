import { describe, expect, it } from 'vitest'
import { clearPass } from './clear'
import { RecordingTarget } from '../target/RecordingTarget'
import { lightTheme } from '../theme'

describe('clearPass', () => {
  it('limpa o fundo com a cor do tema', () => {
    const target = new RecordingTarget()
    clearPass({
      camera: { tx: 0, ty: 0, scale: 1 },
      viewport: { width: 800, height: 600 },
      theme: lightTheme,
      target,
    })

    expect(target.clears).toEqual([lightTheme.background])
  })
})
