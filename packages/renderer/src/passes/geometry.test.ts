import { describe, expect, it } from 'vitest'
import { buildSingleRoom } from '@planta/core/src/testing/fixtures'
import { wallsPass } from './walls'
import { roomFillsPass } from './roomFills'
import { dimensionsPass } from './dimensions'
import { roomLabelsPass } from './roomLabels'
import { RecordingTarget } from '../target/RecordingTarget'
import { lightTheme } from '../theme'
import { worldToScreenY } from '../camera'

const doc = buildSingleRoom()
const viewport = { width: 800, height: 600 }

function draw(
  pass: (ctx: {
    camera: { tx: number; ty: number; scale: number }
    viewport: { width: number; height: number }
    theme: typeof lightTheme
    target: RecordingTarget
    doc: typeof doc
  }) => void,
  scale: number,
): RecordingTarget {
  const target = new RecordingTarget()
  pass({ camera: { tx: 0, ty: 0, scale }, viewport, theme: lightTheme, target, doc })
  return target
}

describe('wallsPass', () => {
  it('desenha uma aresta por lado do comodo', () => {
    expect(draw(wallsPass, 0.1).lines).toHaveLength(4)
  })

  it('espessura em tela e identica em escala 0,02 e 2,0 (criterio de specs/04)', () => {
    const thin = draw(wallsPass, 0.02).lines[0]!.style.width
    const thick = draw(wallsPass, 2).lines[0]!.style.width

    // A largura e em mm; multiplicada pela escala da o valor em px de tela.
    expect(thin * 0.02).toBeCloseTo(thick * 2, 9)
    expect(thin * 0.02).toBeCloseTo(lightTheme.wallWidth, 9)
  })
})

describe('roomFillsPass', () => {
  it('preenche o poligono do comodo', () => {
    const target = draw(roomFillsPass, 0.1)
    expect(target.polygons).toHaveLength(1)
    expect(target.polygons[0]!.points).toHaveLength(4)
  })
})

describe('dimensionsPass', () => {
  it('desenha as quatro cotas com a fonte em pixels de tela', () => {
    const target = draw(dimensionsPass, 0.1)
    expect(target.textsRotated).toHaveLength(4)
    expect(target.textsRotated[0]!.style.font).toContain('10px')
  })

  it('posiciona a cota fora do poligono, nao dentro', () => {
    const scale = 0.1
    const target = draw(dimensionsPass, scale)
    const camera = { tx: 0, ty: 0, scale }

    // Aresta superior do retangulo (y = 0): a cota deve ficar acima dela.
    const topEdgeY = worldToScreenY(camera, 0)
    const above = target.textsRotated.filter((t) => t.y < topEdgeY)
    expect(above.length).toBeGreaterThan(0)
  })

  it('suprime a cota quando a aresta e curta demais em tela', () => {
    expect(draw(dimensionsPass, 0.001).textsRotated).toHaveLength(0)
  })
})

describe('roomLabelsPass', () => {
  it('separa nome e area por pixels, nao por milimetros', () => {
    const target = draw(roomLabelsPass, 0.1)
    expect(target.texts).toHaveLength(2)
    expect(Math.abs(target.texts[0]!.y - target.texts[1]!.y)).toBeGreaterThanOrEqual(4)
  })

  it('mostra nome e area do comodo', () => {
    const target = draw(roomLabelsPass, 0.1)
    expect(target.texts.map((t) => t.content)).toEqual(['Quarto', '8,00 m²'])
  })

  it('suprime o rotulo quando o comodo e pequeno demais em tela', () => {
    expect(draw(roomLabelsPass, 0.001).texts).toHaveLength(0)
  })
})
