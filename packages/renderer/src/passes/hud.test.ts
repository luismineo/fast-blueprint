import { describe, expect, it } from 'vitest'
import { hudPass } from './hud'
import { RecordingTarget } from '../target/RecordingTarget'
import { lightTheme } from '../theme'

describe('hudPass', () => {
  it('desenha a escala grafica com o rotulo calculado por computeScaleBar', () => {
    const target = new RecordingTarget()
    hudPass({
      camera: { tx: 0, ty: 0, scale: 0.6 },
      viewport: { width: 800, height: 600 },
      theme: lightTheme,
      target,
    })

    expect(target.texts).toContainEqual(expect.objectContaining({ content: '10 cm' }))
    expect(target.lines.length).toBeGreaterThanOrEqual(4)
  })
})
