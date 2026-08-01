import { describe, expect, it } from 'vitest'
import type { OverlayPrimitive } from '@planta/core'
import { toolOverlayPass } from './toolOverlay'
import { snapGuidesPass } from './snapGuides'
import { RecordingTarget } from '../target/RecordingTarget'
import { lightTheme } from '../theme'
import { worldToScreenX, worldToScreenY } from '../camera'

const camera = { tx: 100, ty: 50, scale: 0.1 }
const viewport = { width: 800, height: 600 }

function context(target: RecordingTarget, overlays?: readonly OverlayPrimitive[]) {
  return { camera, viewport, theme: lightTheme, target, overlays }
}

const draft: OverlayPrimitive = {
  kind: 'polyline',
  role: 'draft',
  closed: false,
  points: [
    { x: 0, y: 0 },
    { x: 3200, y: 0 },
  ],
}
const ghost: OverlayPrimitive = {
  kind: 'segment',
  role: 'ghost',
  a: { x: 3200, y: 0 },
  b: { x: 3200, y: 2500 },
}
const snapNode: OverlayPrimitive = { kind: 'marker', role: 'snapNode', position: { x: 0, y: 0 } }
const axisGuide: OverlayPrimitive = {
  kind: 'segment',
  role: 'axisGuide',
  a: { x: 0, y: 0 },
  b: { x: 3200, y: 0 },
}
const midpoint: OverlayPrimitive = {
  kind: 'marker',
  role: 'midpoint',
  position: { x: 0, y: 0 },
}
const alignmentGuide: OverlayPrimitive = {
  kind: 'segment',
  role: 'alignmentGuide',
  a: { x: 0, y: 0 },
  b: { x: 3200, y: 0 },
}
const edgeHighlight: OverlayPrimitive = {
  kind: 'segment',
  role: 'edgeHighlight',
  a: { x: 0, y: 0 },
  b: { x: 3200, y: 0 },
}

describe('toolOverlayPass', () => {
  it('converte a polilinha de mundo para tela', () => {
    const target = new RecordingTarget()
    toolOverlayPass(context(target, [draft]))

    expect(target.polylines).toHaveLength(1)
    expect(target.polylines[0]!.points).toEqual([
      { x: worldToScreenX(camera, 0), y: worldToScreenY(camera, 0) },
      { x: worldToScreenX(camera, 3200), y: worldToScreenY(camera, 0) },
    ])
  })

  it('usa largura em pixels de tela, sem dividir pela escala', () => {
    const target = new RecordingTarget()
    toolOverlayPass(context(target, [draft]))
    expect(target.polylines[0]!.style.width).toBe(lightTheme.wallWidth)
  })

  it('desenha o segmento fantasma tracejado', () => {
    const target = new RecordingTarget()
    toolOverlayPass(context(target, [ghost]))
    expect(target.lines).toHaveLength(1)
    expect(target.lines[0]!.style.dash).toEqual([6, 4])
  })

  it('ignora primitivas de guia de snap: elas pertencem ao pass 10', () => {
    const target = new RecordingTarget()
    toolOverlayPass(context(target, [snapNode, axisGuide]))
    expect(target.polylines).toHaveLength(0)
    expect(target.lines).toHaveLength(0)
  })

  it('nao desenha nada sem overlays', () => {
    const target = new RecordingTarget()
    toolOverlayPass(context(target, []))
    toolOverlayPass(context(target, undefined))
    expect(target.polylines).toHaveLength(0)
    expect(target.lines).toHaveLength(0)
  })
})

describe('snapGuidesPass', () => {
  it('desenha o marcador de no como quadrado de tamanho constante em tela', () => {
    const near = new RecordingTarget()
    snapGuidesPass({ ...context(near, [snapNode]), camera: { tx: 0, ty: 0, scale: 0.02 } })

    const far = new RecordingTarget()
    snapGuidesPass({ ...context(far, [snapNode]), camera: { tx: 0, ty: 0, scale: 2 } })

    const extent = (t: RecordingTarget) => {
      const xs = t.polylines[0]!.points.map((p) => p.x)
      return Math.max(...xs) - Math.min(...xs)
    }

    expect(extent(near)).toBe(extent(far))
    expect(extent(near)).toBe(8)
  })

  it('desenha a guia de eixo tracejada na cor de snapGuide', () => {
    const target = new RecordingTarget()
    snapGuidesPass(context(target, [axisGuide]))
    expect(target.lines[0]!.style.color).toBe(lightTheme.snapGuide)
    expect(target.lines[0]!.style.dash).toEqual([4, 4])
  })

  it('ignora primitivas do traco em andamento', () => {
    const target = new RecordingTarget()
    snapGuidesPass(context(target, [draft, ghost]))
    expect(target.polylines).toHaveLength(0)
    expect(target.lines).toHaveLength(0)
  })

  it('desenha o ponto medio como losango, e o no como quadrado', () => {
    const midpointTarget = new RecordingTarget()
    snapGuidesPass(context(midpointTarget, [midpoint]))

    const nodeTarget = new RecordingTarget()
    snapGuidesPass(context(nodeTarget, [snapNode]))

    const cx = worldToScreenX(camera, 0)
    const cy = worldToScreenY(camera, 0)
    const top = { x: cx, y: cy - 4 }
    const topLeft = { x: cx - 4, y: cy - 4 }

    // Losango: vertice no topo, alinhado com o centro, e nenhum canto.
    expect(midpointTarget.polylines[0]!.points).toContainEqual(top)
    expect(midpointTarget.polylines[0]!.points).not.toContainEqual(topLeft)

    // Quadrado: canto superior esquerdo, e nenhum vertice centrado.
    expect(nodeTarget.polylines[0]!.points).toContainEqual(topLeft)
    expect(nodeTarget.polylines[0]!.points).not.toContainEqual(top)
  })

  it('guia de alinhamento e destaque de aresta tem tracejados distintos', () => {
    const target = new RecordingTarget()
    snapGuidesPass(context(target, [alignmentGuide, edgeHighlight]))

    expect(target.lines).toHaveLength(2)
    expect(target.lines[0]!.style.dash).toEqual([2, 5])
    expect(target.lines[1]!.style.dash).toBeUndefined()
  })
})

describe('retangulo de selecao', () => {
  it('e desenhado pelo pass do traco em andamento, nao pelo de guias', () => {
    const marquee: OverlayPrimitive = {
      kind: 'polyline',
      role: 'marquee',
      closed: true,
      points: [
        { x: 0, y: 0 },
        { x: 1000, y: 0 },
        { x: 1000, y: 800 },
        { x: 0, y: 800 },
      ],
    }

    const tool = new RecordingTarget()
    toolOverlayPass(context(tool, [marquee]))
    expect(tool.polylines).toHaveLength(1)
    expect(tool.polylines[0]!.style.color).toBe(lightTheme.selection)

    const guides = new RecordingTarget()
    snapGuidesPass(context(guides, [marquee]))
    expect(guides.polylines).toHaveLength(0)
  })
})
