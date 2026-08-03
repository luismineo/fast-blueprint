import { describe, it, expect } from 'vitest'
import { exportCsv } from './exportCsv'
import type { PlanDocument } from '@planta/core'

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
    "rooms": [
      {
        "id": "r1",
        "name": "Quarto 1",
        "loop": ["n1", "n2", "n3", "n4"],
        "color": null,
        "includeInUsableArea": true
      }
    ],
    "walls": [],
    "openings": [],
    "furniture": [
      {
        "id": "f1",
        "catalogId": null,
        "name": "Cama",
        "width": 1400,
        "depth": 2000,
        "center": { "x": 2000, "y": 1500 },
        "rotation": 0,
        "color": null,
        "locked": false,
        "clearance": 500
      },
      {
        "id": "f2",
        "catalogId": null,
        "name": "Mesa",
        "width": 1000,
        "depth": 1000,
        "center": { "x": 8000, "y": 8000 },
        "rotation": 0,
        "color": null,
        "locked": false,
        "clearance": 0
      }
    ],
    "underlay": null
  }
  `
  return JSON.parse(jsonStr)
}

describe('exportCsv', () => {
  it('should format CSV data correctly', () => {
    const doc = createTestDoc()
    const csv = exportCsv(doc)
    const lines = csv.split('\n')

    expect(lines[0]).toBe('Cômodos')
    expect(lines[1]).toBe('Nome;Área (m2);Perímetro (m)')
    
    expect(lines[2]).toBe('Quarto 1;12.00;14.00')

    expect(lines[3]).toBe('')

    expect(lines[4]).toBe('Móveis')
    expect(lines[5]).toBe('Nome;Largura (m);Profundidade (m);Cômodo')

    expect(lines[6]).toBe('Cama;1.40;2.00;Quarto 1')
    expect(lines[7]).toBe('Mesa;1.00;1.00;')
  })
})
