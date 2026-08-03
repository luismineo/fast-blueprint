import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readDocument } from './read'

describe('Migrações', () => {
  it('carrega legacy/v1-minimal.planta.json sem alterações (v1 atual)', () => {
    // 10-5: fixture de legacy carregada pela primeira vez (schema atual é 1, arquivo é 1)
    const jsonPath = resolve(__dirname, '../../../../specs/fixtures/legacy/v1-minimal.planta.json')
    const json = readFileSync(jsonPath, 'utf-8')
    const result = readDocument(json)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.doc.schemaVersion).toBe(1)
    expect(result.doc.nodes.length).toBe(6)
    expect(result.doc.walls.length).toBe(1)
    expect(result.doc.rooms.length).toBe(1)
    expect(result.doc.furniture.length).toBe(1)
    expect(result.warnings.length).toBe(0)
  })
})
