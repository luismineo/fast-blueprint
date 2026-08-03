import { describe, it, expect, vi } from 'vitest'
import { exportPng } from './exportPng'
import type { PlanDocument, FurnitureGlyph } from '@planta/core'

function createTestDoc(): PlanDocument {
  const jsonStr = `
  {
    "schemaVersion": 1,
    "meta": {
      "name": "Test",
      "createdAt": "2026-08-01T00:00:00Z",
      "modifiedAt": "2026-08-01T00:00:00Z",
      "displayUnit": "m",
      "gridSize": 100
    },
    "nodes": [
      { "id": "n1", "x": 0, "y": 0 },
      { "id": "n2", "x": 4000, "y": 0 },
      { "id": "n3", "x": 4000, "y": 3000 },
      { "id": "n4", "x": 0, "y": 3000 }
    ],
    "rooms": [],
    "walls": [],
    "openings": [],
    "furniture": [],
    "underlay": null
  }
  `
  return JSON.parse(jsonStr)
}

describe('exportPng', () => {
  it('should create and export PNG', async () => {
    // Mock OffscreenCanvas
    const mockContext = {
      save: vi.fn(),
      restore: vi.fn(),
      setTransform: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      closePath: vi.fn(),
      fillText: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      setLineDash: vi.fn(),
      canvas: { width: 1920, height: 1080 }
    }
    
    class MockOffscreenCanvas {
      width: number
      height: number
      constructor(w: number, h: number) {
        this.width = w
        this.height = h
      }
      getContext() {
        return mockContext
      }
      convertToBlob() {
        return Promise.resolve(new Blob(['fake-image']))
      }
    }
    
    vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas)

    const doc = createTestDoc()
    const glyphs = new Map<string, FurnitureGlyph>()
    const scale = 2
    
    const blob = await exportPng(doc, glyphs, scale)
    expect(blob).toBeInstanceOf(Blob)
  })
})
