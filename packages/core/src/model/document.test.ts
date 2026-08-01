import { describe, it, expect } from 'vitest'
import {
  createEmptyDocument,
  generateNodeId,
  generateRoomId,
  generateDefaultRoomName,
  isValidDocument,
} from './document'

describe('document', () => {
  it('createEmptyDocument é válido', () => {
    const doc = createEmptyDocument()
    expect(doc.nodes).toEqual([])
    expect(doc.rooms).toEqual([])
    expect(doc.walls).toEqual([])
    expect(doc.meta.gridSize).toBe(100)
    expect(doc.meta.displayUnit).toBe('m')
    expect(isValidDocument(doc)).toBe(true)
  })

  it('generateNodeId gera id único com prefixo n_', () => {
    const id = generateNodeId()
    expect(id.startsWith('n_')).toBe(true)
    const id2 = generateNodeId()
    expect(id).not.toBe(id2)
  })

  it('generateRoomId gera id único com prefixo r_', () => {
    const id = generateRoomId()
    expect(id.startsWith('r_')).toBe(true)
    const id2 = generateRoomId()
    expect(id).not.toBe(id2)
  })

  it('generateDefaultRoomName preenche lacunas', () => {
    expect(generateDefaultRoomName([])).toBe('Cômodo 1')
    expect(generateDefaultRoomName(['Cômodo 1'])).toBe('Cômodo 2')
    expect(generateDefaultRoomName(['Cômodo 1', 'Cômodo 3'])).toBe('Cômodo 2')
  })
})