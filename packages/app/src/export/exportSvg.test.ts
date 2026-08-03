import { describe, it, expect } from 'vitest'
import { exportSvg } from './exportSvg'
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
      { "id": "n2", "x": 4000, "y": 0 }
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

describe('exportSvg', () => {
  it('should export SVG string', () => {
    const doc = createTestDoc()
    const glyphs = new Map<string, FurnitureGlyph>()
    const svg = exportSvg(doc, glyphs)
    
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('</svg>')
  })
})
