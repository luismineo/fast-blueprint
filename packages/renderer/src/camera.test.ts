import { describe, expect, it } from 'vitest'
import { CAMERA_LIMITS, frameRect, panBy, screenToWorld, worldToScreen, zoomAt, type Camera } from './camera'

describe('worldToScreen / screenToWorld', () => {
  it('sao inversas uma da outra', () => {
    const camera: Camera = { tx: 120, ty: -40, scale: 2.5 }
    const world = { x: 3200, y: 2500 }
    const screen = worldToScreen(camera, world)
    const roundTripped = screenToWorld(camera, screen)
    expect(roundTripped.x).toBeCloseTo(world.x, 9)
    expect(roundTripped.y).toBeCloseTo(world.y, 9)
  })
})

describe('zoomAt', () => {
  it('mantem a coordenada de mundo sob o cursor invariante dentro de 1px, a cada passo de uma sequencia (specs/03 criterio de aceitacao)', () => {
    const cursor = { x: 400, y: 300 }
    let camera: Camera = { tx: 0, ty: 0, scale: 1 }
    const worldUnderCursor = screenToWorld(camera, cursor)

    const factors = [1.1, 1.1, 0.9, 1.1, 1.1, 0.8, 1.2, 0.95, 1.05]
    for (const factor of factors) {
      camera = zoomAt(camera, cursor, factor)
      const worldNow = screenToWorld(camera, cursor)
      expect(Math.abs(worldNow.x - worldUnderCursor.x) * camera.scale).toBeLessThan(1)
      expect(Math.abs(worldNow.y - worldUnderCursor.y) * camera.scale).toBeLessThan(1)
    }
  })

  it('nao ultrapassa os limites de escala de specs/04 (0,05 a 20 px/mm)', () => {
    const cursor = { x: 0, y: 0 }
    let camera: Camera = { tx: 0, ty: 0, scale: 1 }
    for (let i = 0; i < 200; i += 1) {
      camera = zoomAt(camera, cursor, 1.5)
    }
    expect(camera.scale).toBeLessThanOrEqual(CAMERA_LIMITS.maxScale)

    camera = { tx: 0, ty: 0, scale: 1 }
    for (let i = 0; i < 200; i += 1) {
      camera = zoomAt(camera, cursor, 0.5)
    }
    expect(camera.scale).toBeGreaterThanOrEqual(CAMERA_LIMITS.minScale)
  })
})

describe('panBy', () => {
  it('translada tx/ty sem alterar a escala', () => {
    const camera: Camera = { tx: 10, ty: 20, scale: 3 }
    const panned = panBy(camera, { x: 5, y: -8 })
    expect(panned).toEqual({ tx: 15, ty: 12, scale: 3 })
  })
})

describe('frameRect', () => {
  it('centraliza o retangulo no viewport com a margem pedida', () => {
    const rect = { x: -5000, y: -5000, width: 10000, height: 10000 }
    const viewport = { width: 1000, height: 800 }
    const camera = frameRect(rect, viewport, 0.1)

    const topLeft = worldToScreen(camera, { x: rect.x, y: rect.y })
    const bottomRight = worldToScreen(camera, { x: rect.x + rect.width, y: rect.y + rect.height })

    expect(topLeft.x).toBeGreaterThan(0)
    expect(topLeft.y).toBeGreaterThan(0)
    expect(bottomRight.x).toBeLessThan(viewport.width)
    expect(bottomRight.y).toBeLessThan(viewport.height)

    const center = worldToScreen(camera, { x: 0, y: 0 })
    expect(center.x).toBeCloseTo(viewport.width / 2, 9)
    expect(center.y).toBeCloseTo(viewport.height / 2, 9)
  })
})
