// ============================================================
// Gera fixtures como teste (roda com pnpm test no core)
// ============================================================

import { describe, it, expect } from 'vitest'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import {
  createEmptyDocument,
  applyCommand,
  computeRoomArea,
  computeUsableArea,
  validateDocumentErrors,
  type PlanDocument,
  type NodeId,
} from '../index'

function uid(prefix: string): NodeId {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}` as NodeId
}

function save(filename: string, doc: PlanDocument): void {
  mkdirSync(join(import.meta.dirname, '..', '..', '..', '..', 'specs', 'fixtures'), { recursive: true })
  const dir = join(import.meta.dirname, '..', '..', '..', '..', 'specs', 'fixtures')
  writeFileSync(join(dir, filename), JSON.stringify(doc, null, 2))
}

describe('fixture generation', () => {
  it('single-room: retângulo 3200x2500, área 8.000.000 mm²', () => {
    let doc = createEmptyDocument()
    const ids: NodeId[] = [uid('n'), uid('n'), uid('n'), uid('n')]
    const result = applyCommand(doc, {
      type: 'CreateRoom',
      payload: {
        nodes: [
          { id: ids[0]!, x: 0, y: 0 },
          { id: ids[1]!, x: 3200, y: 0 },
          { id: ids[2]!, x: 3200, y: 2500 },
          { id: ids[3]!, x: 0, y: 2500 },
        ],
        loop: ids,
        name: 'Quarto',
      },
    })
    doc = result.document
    expect(doc.nodes).toHaveLength(4)
    expect(doc.rooms).toHaveLength(1)
    expect(computeRoomArea(doc, doc.rooms[0]!.id)).toBe(8_000_000)

    save('single-room.planta.json', doc)
  })

  it('shared-nodes: dois cômodos com aresta compartilhada, 6 nós', () => {
    let doc = createEmptyDocument()
    const ids1: NodeId[] = [uid('n'), uid('n'), uid('n'), uid('n')]
    let r = applyCommand(doc, {
      type: 'CreateRoom',
      payload: {
        nodes: [
          { id: ids1[0]!, x: 0, y: 0 },
          { id: ids1[1]!, x: 3200, y: 0 },
          { id: ids1[2]!, x: 3200, y: 2500 },
          { id: ids1[3]!, x: 0, y: 2500 },
        ],
        loop: ids1,
        name: 'Quarto 1',
      },
    })
    doc = r.document

    const ids2: NodeId[] = [uid('n'), uid('n'), uid('n'), uid('n')]
    r = applyCommand(doc, {
      type: 'CreateRoom',
      payload: {
        nodes: [
          { id: ids2[0]!, x: 3200, y: 0 },
          { id: ids2[1]!, x: 6400, y: 0 },
          { id: ids2[2]!, x: 6400, y: 2500 },
          { id: ids2[3]!, x: 3200, y: 2500 },
        ],
        loop: ids2,
        name: 'Quarto 2',
      },
    })
    doc = r.document
    expect(doc.nodes).toHaveLength(6)
    expect(doc.rooms).toHaveLength(2)
    expect(validateDocumentErrors(doc)).toEqual([])

    save('shared-nodes.planta.json', doc)
  })

  it('concave: cômodo em L, 6 vértices', () => {
    let doc = createEmptyDocument()
    const ids: NodeId[] = [uid('n'), uid('n'), uid('n'), uid('n'), uid('n'), uid('n')]
    const result = applyCommand(doc, {
      type: 'CreateRoom',
      payload: {
        nodes: [
          { id: ids[0]!, x: 0, y: 0 },
          { id: ids[1]!, x: 4000, y: 0 },
          { id: ids[2]!, x: 4000, y: 1500 },
          { id: ids[3]!, x: 2000, y: 1500 },
          { id: ids[4]!, x: 2000, y: 3000 },
          { id: ids[5]!, x: 0, y: 3000 },
        ],
        loop: ids,
        name: 'Cômodo L',
      },
    })
    doc = result.document
    expect(doc.nodes).toHaveLength(6)

    save('concave.planta.json', doc)
  })

  it('apto-44m2: 7 cômodos, área útil ~37,9 m²', () => {
    let doc = createEmptyDocument()

    // Layout (envelope aproximado 6600 x 8000):
    //   coluna esquerda (0..3400): Cozinha em cima, Sala embaixo
    //   coluna direita (3400..6600): Dorm01 em cima, Banho no meio, Dorm02 embaixo
    //   circulação entre sala e dorm/banho (2400..3400, faixa estreita)
    //   sacada na ponta inferior esquerda

    // Cozinha / Área de serviço: 3400 x 2100
    // (o "avanço de 1000" atrás do Dorm01 aumenta a área além de 1800)
    const cozinhaIds: NodeId[] = [uid('n'), uid('n'), uid('n'), uid('n')]
    let r = applyCommand(doc, {
      type: 'CreateRoom',
      payload: {
        nodes: [
          { id: cozinhaIds[0]!, x: 0, y: 0 },
          { id: cozinhaIds[1]!, x: 3400, y: 0 },
          { id: cozinhaIds[2]!, x: 3400, y: 2100 },
          { id: cozinhaIds[3]!, x: 0, y: 2100 },
        ],
        loop: cozinhaIds,
        name: 'Cozinha/A.S.',
      },
    })
    doc = r.document

    // Estar/jantar (mais hall): 2400 x 4900
    const salaIds: NodeId[] = [uid('n'), uid('n'), uid('n'), uid('n')]
    r = applyCommand(doc, {
      type: 'CreateRoom',
      payload: {
        nodes: [
          { id: salaIds[0]!, x: 0, y: 2100 },
          { id: salaIds[1]!, x: 2400, y: 2100 },
          { id: salaIds[2]!, x: 2400, y: 7000 },
          { id: salaIds[3]!, x: 0, y: 7000 },
        ],
        loop: salaIds,
        name: 'Estar/Jantar',
      },
    })
    doc = r.document

    // Dormitório 01: 3200 x 2500
    const dorm1Ids: NodeId[] = [uid('n'), uid('n'), uid('n'), uid('n')]
    r = applyCommand(doc, {
      type: 'CreateRoom',
      payload: {
        nodes: [
          { id: dorm1Ids[0]!, x: 3400, y: 0 },
          { id: dorm1Ids[1]!, x: 6600, y: 0 },
          { id: dorm1Ids[2]!, x: 6600, y: 2500 },
          { id: dorm1Ids[3]!, x: 3400, y: 2500 },
        ],
        loop: dorm1Ids,
        name: 'Dormitório 01',
      },
    })
    doc = r.document

    // Banheiro: 2200 x 1200
    const banhoIds: NodeId[] = [uid('n'), uid('n'), uid('n'), uid('n')]
    r = applyCommand(doc, {
      type: 'CreateRoom',
      payload: {
        nodes: [
          { id: banhoIds[0]!, x: 3400, y: 2500 },
          { id: banhoIds[1]!, x: 5600, y: 2500 },
          { id: banhoIds[2]!, x: 5600, y: 3700 },
          { id: banhoIds[3]!, x: 3400, y: 3700 },
        ],
        loop: banhoIds,
        name: 'Banheiro',
      },
    })
    doc = r.document

    // Dormitório 02: 3200 x 2300
    const dorm2Ids: NodeId[] = [uid('n'), uid('n'), uid('n'), uid('n')]
    r = applyCommand(doc, {
      type: 'CreateRoom',
      payload: {
        nodes: [
          { id: dorm2Ids[0]!, x: 3400, y: 3700 },
          { id: dorm2Ids[1]!, x: 6600, y: 3700 },
          { id: dorm2Ids[2]!, x: 6600, y: 6000 },
          { id: dorm2Ids[3]!, x: 3400, y: 6000 },
        ],
        loop: dorm2Ids,
        name: 'Dormitório 02',
      },
    })
    doc = r.document

    // Circulação: 1000 x 1000 (~1,00 m²)
    const circIds: NodeId[] = [uid('n'), uid('n'), uid('n'), uid('n')]
    r = applyCommand(doc, {
      type: 'CreateRoom',
      payload: {
        nodes: [
          { id: circIds[0]!, x: 2400, y: 6000 },
          { id: circIds[1]!, x: 3400, y: 6000 },
          { id: circIds[2]!, x: 3400, y: 7000 },
          { id: circIds[3]!, x: 2400, y: 7000 },
        ],
        loop: circIds,
        name: 'Circulação',
      },
    })
    doc = r.document

    // Sacada: 2400 x 900
    const sacadaIds: NodeId[] = [uid('n'), uid('n'), uid('n'), uid('n')]
    r = applyCommand(doc, {
      type: 'CreateRoom',
      payload: {
        nodes: [
          { id: sacadaIds[0]!, x: 0, y: 7000 },
          { id: sacadaIds[1]!, x: 2400, y: 7000 },
          { id: sacadaIds[2]!, x: 2400, y: 7900 },
          { id: sacadaIds[3]!, x: 0, y: 7900 },
        ],
        loop: sacadaIds,
        name: 'Sacada',
        includeInUsableArea: false,
      },
    })
    doc = r.document

    expect(doc.rooms).toHaveLength(7)

    const area = computeUsableArea(doc)
    const areaM2 = area / 1_000_000
    // Tolerância de 0,50 m² conforme spec 10
    expect(areaM2).toBeGreaterThan(37.4)
    expect(areaM2).toBeLessThan(38.4)

    // Verifica erros
    const errors = validateDocumentErrors(doc)
    expect(errors).toEqual([])

    save('apto-44m2.planta.json', doc)
  })
})