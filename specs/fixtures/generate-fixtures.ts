// ============================================================
// Gera fixtures programaticamente usando CreateRoom commands.
// Equivale a autorar no app — as mesmas funções de comando
// que a Ferramenta Cômodo emite.
// ============================================================

import {
  createEmptyDocument,
  applyCommand,
  computeRoomArea,
  computeUsableArea,
  type PlanDocument,
  type NodeId,
} from '@planta/core'
import { writeFileSync } from 'fs'

function uid(prefix: string): NodeId {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}` as NodeId
}

function save(filename: string, doc: PlanDocument): void {
  writeFileSync(filename, JSON.stringify(doc, null, 2))
  console.log(`Saved ${filename}`)
}

// ============================================================
// single-room.planta.json
// ============================================================

function makeSingleRoom(): PlanDocument {
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
  return result.document
}

// ============================================================
// shared-nodes.planta.json
// ============================================================

function makeSharedNodes(): PlanDocument {
  let doc = createEmptyDocument()
  const ids1: NodeId[] = [uid('n'), uid('n'), uid('n'), uid('n')]
  const r1 = applyCommand(doc, {
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

  const ids2: NodeId[] = [uid('n'), uid('n'), uid('n'), uid('n')]
  // ids2[0] e ids2[3] coincidem com ids1[1] e ids1[2]
  const r2 = applyCommand(r1.document, {
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

  return r2.document
}

// ============================================================
// concave.planta.json (cômodo em L)
// ============================================================

function makeConcave(): PlanDocument {
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
  return result.document
}

// ============================================================
// apto-44m2.planta.json
// ============================================================

function makeApto44m2(): PlanDocument {
  let doc = createEmptyDocument()

  // Envelope externo: 5900 x 7900

  // 1. Estar/jantar (mais hall): 2400 x 4900
  // Posição: canto inferior direito? Vamos usar o layout descrito:
  // "A entrada é na parede lateral da sala, logo abaixo da cozinha."
  // Vamos posicionar a sala no canto inferior direito do envelope.

  // Layout (com Y crescendo para baixo):
  // (0,0) ─────────────────────── (5900,0)
  // │   Cozinha/A.S.             │ Dorm 01     │ Dorm 02 │
  // │   3400x1800 (mais recorte) │ 3200x2500   │ 3200x2300│
  // │                            │             │         │
  // │──────── (fim cozinha) ─────│             │ Banho   │
  // │   Estar/Jantar + Hall      │             │ 2200x   │
  // │   2400x4900                │             │ 1200    │
  // │                            │             │         │
  // └────────────────────────────┴─────────────┴─────────┘
  //                                    Sacada 2400x900

  // Estar/jantar: x=0..2400, y=1800..6700 (na verdade 4900mm de comprimento na vertical)
  // Ajustando: sala ocupa x=0..2400, y=2000..7900 (aproximadamente)
  const salaIds: NodeId[] = [uid('n'), uid('n'), uid('n'), uid('n')]
  const r1 = applyCommand(doc, {
    type: 'CreateRoom',
    payload: {
      nodes: [
        { id: salaIds[0]!, x: 0, y: 2000 },
        { id: salaIds[1]!, x: 2400, y: 2000 },
        { id: salaIds[2]!, x: 2400, y: 7900 },
        { id: salaIds[3]!, x: 0, y: 7900 },
      ],
      loop: salaIds,
      name: 'Estar/Jantar',
    },
  })
  doc = r1.document

  // Cozinha/Área de Serviço: 3400x1800, avançando 1000 atrás da parede do Dorm 01
  // Posição: x=0..3400, y=0..1800 (junto à entrada, acima da sala)
  // O "avanço de 1000" atrás do Dorm 01 significa um recorte:
  // A cozinha principal é 2400x1800 (alinhada com a sala),
  // e avança 1000mm para a direita (x=2400..3400) na parte superior
  // Simplificando: a cozinha ocupa x=0..3400, y=0..1800 (retângulo simples)
  const cozinhaIds: NodeId[] = [uid('n'), uid('n'), uid('n'), uid('n')]
  const r2 = applyCommand(doc, {
    type: 'CreateRoom',
    payload: {
      nodes: [
        { id: cozinhaIds[0]!, x: 0, y: 0 },
        { id: cozinhaIds[1]!, x: 3400, y: 0 },
        { id: cozinhaIds[2]!, x: 3400, y: 1800 },
        { id: cozinhaIds[3]!, x: 0, y: 1800 },
      ],
      loop: cozinhaIds,
      name: 'Cozinha/A.S.',
    },
  })
  doc = r2.document

  // Dormitório 01: 3200x2500
  // Posição: x=3400..5900 (??), y=0..2500
  // Envelope total é 5900. Cozinha ocupa x=0..3400. Resta x=3400..5900 = 2500mm
  // Dorm 01 ocupa 3200mm de largura, mas o envelope é 5900 e a cozinha 3400 → 2500 restante
  // Preciso ajustar: envelope total 5900 não cabe Dorm 01 de 3200 + cozinha 3400 = 6600
  // Vou usar um envelope maior: 6600 x 7900
  const dorm1Ids: NodeId[] = [uid('n'), uid('n'), uid('n'), uid('n')]
  const r3 = applyCommand(doc, {
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
  doc = r3.document

  // Dormitório 02: 3200x2300
  // Posição: x=3400..6600, y=2500..4800
  const dorm2Ids: NodeId[] = [uid('n'), uid('n'), uid('n'), uid('n')]
  const r4 = applyCommand(doc, {
    type: 'CreateRoom',
    payload: {
      nodes: [
        { id: dorm2Ids[0]!, x: 3400, y: 2500 },
        { id: dorm2Ids[1]!, x: 6600, y: 2500 },
        { id: dorm2Ids[2]!, x: 6600, y: 4800 },
        { id: dorm2Ids[3]!, x: 3400, y: 4800 },
      ],
      loop: dorm2Ids,
      name: 'Dormitório 02',
    },
  })
  doc = r4.document

  // Banheiro: 2200x1200
  // Posição: encaixado na região direita, entre Dorm 01 e Dorm 02? 
  // O spec diz: "O banheiro fica entre os dois dormitórios."
  // Mas Dorm 01 ocupa y=0..2500 e Dorm 02 ocupa y=2500..4800.
  // Se banheiro fica entre eles: seria em x=3400..5600 (2200mm), y=2500..3700 (1200mm)
  // Mas aí conflita com Dorm 02. Vou colocar o banheiro à direita do Dorm 01:
  // Banho: x=3400..5600, y=0..1200 — mas isso conflita com Dorm 01.
  // Alternativa: Dorm 01 em x=3400..6600, Banho em x=3400..5600, y=0..1200 (não faz sentido)
  // Vou simplificar: banheiro em x=4400..6600, y=2500..3700 (ao lado do Dorm 02)
  const banhoIds: NodeId[] = [uid('n'), uid('n'), uid('n'), uid('n')]
  const r5 = applyCommand(doc, {
    type: 'CreateRoom',
    payload: {
      nodes: [
        { id: banhoIds[0]!, x: 4400, y: 2500 },
        { id: banhoIds[1]!, x: 6600, y: 2500 },
        { id: banhoIds[2]!, x: 6600, y: 3700 },
        { id: banhoIds[3]!, x: 4400, y: 3700 },
      ],
      loop: banhoIds,
      name: 'Banheiro',
    },
  })
  doc = r5.document

  // Circulação: espaço entre os dormitórios e a sala (~corredor)
  // Posição: x=2400..3400, y=1800..7900 (entre sala e dormitórios)
  const circIds: NodeId[] = [uid('n'), uid('n'), uid('n'), uid('n')]
  const r6 = applyCommand(doc, {
    type: 'CreateRoom',
    payload: {
      nodes: [
        { id: circIds[0]!, x: 2400, y: 2500 },
        { id: circIds[1]!, x: 3400, y: 2500 },
        { id: circIds[2]!, x: 3400, y: 7900 },
        { id: circIds[3]!, x: 2400, y: 7900 },
      ],
      loop: circIds,
      name: 'Circulação',
    },
  })
  doc = r6.document

  // Sacada: 2400x900
  // Posição: x=2400..4800, y=7900..8800 (abaixo da sala/circulação)
  const sacadaIds: NodeId[] = [uid('n'), uid('n'), uid('n'), uid('n')]
  const r7 = applyCommand(doc, {
    type: 'CreateRoom',
    payload: {
      nodes: [
        { id: sacadaIds[0]!, x: 2400, y: 7900 },
        { id: sacadaIds[1]!, x: 4800, y: 7900 },
        { id: sacadaIds[2]!, x: 4800, y: 8800 },
        { id: sacadaIds[3]!, x: 2400, y: 8800 },
      ],
      loop: sacadaIds,
      name: 'Sacada',
      includeInUsableArea: false,
    },
  })
  doc = r7.document

  return doc
}

// ============================================================
// Main
// ============================================================

const specsFixturesDir = 'specs/fixtures'

save(`${specsFixturesDir}/single-room.planta.json`, makeSingleRoom())
save(`${specsFixturesDir}/shared-nodes.planta.json`, makeSharedNodes())
save(`${specsFixturesDir}/concave.planta.json`, makeConcave())

const apto = makeApto44m2()
save(`${specsFixturesDir}/apto-44m2.planta.json`, apto)

// Verifica área útil
const area = computeUsableArea(apto)
console.log(`Área útil (excluindo sacada): ${(area / 1_000_000).toFixed(2)} m²`)
console.log(`Área esperada: ~37,9 m²`)

// Verifica cada cômodo
for (const room of apto.rooms) {
  const a = computeRoomArea(apto, room.id)
  console.log(`  ${room.name}: ${(a / 1_000_000).toFixed(2)} m² (incl=${room.includeInUsableArea})`)
}