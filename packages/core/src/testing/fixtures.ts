import { applyCommand } from '../commands';
import { createEmptyDocument } from '../model';
import type { NodeId, PlanDocument, RoomId } from '../model';

/**
 * Construtores das fixtures versionadas de `specs/fixtures/`.
 *
 * Dono único do conteúdo das fixtures. O inventário — o que cada fixture
 * contém e por quê — é mantido em `specs/fixtures/README.md`.
 * Regenerar os arquivos: `WRITE_FIXTURES=1 pnpm test`.
 *
 * Toda geometria passa por `applyCommand`, os mesmos comandos que a
 * Ferramenta Cômodo emite, para a fixture refletir o que o app produz.
 */

const FIXTURE_TIMESTAMP = '2026-07-30T00:00:00.000Z';

// Ids sequenciais em vez de generateNodeId/generateRoomId: aqueles usam
// crypto.randomUUID(), o que faria cada regeneração produzir um diff inteiro.
let nodeCounter = 0;
let roomCounter = 0;

function uid(): NodeId {
  nodeCounter += 1;
  return `n_fx${nodeCounter}` as NodeId;
}

function rid(): RoomId {
  roomCounter += 1;
  return `r_fx${roomCounter}` as RoomId;
}

function reset(): void {
  nodeCounter = 0;
  roomCounter = 0;
}

function rect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { id: NodeId; x: number; y: number }[] {
  return [
    { id: uid(), x: x1, y: y1 },
    { id: uid(), x: x2, y: y1 },
    { id: uid(), x: x2, y: y2 },
    { id: uid(), x: x1, y: y2 },
  ];
}

function addRoom(
  doc: PlanDocument,
  nodes: { id: NodeId; x: number; y: number }[],
  name: string,
  includeInUsableArea = true,
): PlanDocument {
  return applyCommand(doc, {
    type: 'CreateRoom',
    payload: {
      nodes,
      loop: nodes.map((n) => n.id),
      name,
      includeInUsableArea,
      roomId: rid(),
    },
  }).document;
}

/**
 * Fixa nome e timestamps. `createEmptyDocument` usa a hora corrente, o que
 * faria toda regeneração sujar o diff de todas as fixtures.
 */
export function withFixtureMeta(doc: PlanDocument, name: string): PlanDocument {
  return {
    ...doc,
    meta: {
      ...doc.meta,
      name,
      createdAt: FIXTURE_TIMESTAMP,
      modifiedAt: FIXTURE_TIMESTAMP,
    },
  };
}

/** Retângulo 3200 × 2500, área exata 8.000.000 mm². */
export function buildSingleRoom(): PlanDocument {
  reset();
  const doc = addRoom(createEmptyDocument(), rect(0, 0, 3200, 2500), 'Quarto');
  return withFixtureMeta(doc, 'Cômodo único');
}

/** Dois retângulos que compartilham a aresta x = 3200: 6 nós, não 8. */
export function buildSharedNodes(): PlanDocument {
  reset();
  let doc = createEmptyDocument();
  doc = addRoom(doc, rect(0, 0, 3200, 2500), 'Quarto 1');
  doc = addRoom(doc, rect(3200, 0, 6400, 2500), 'Quarto 2');
  return withFixtureMeta(doc, 'Nós compartilhados');
}

/** Cômodo em L, para centroide e ponto-em-polígono. */
export function buildConcave(): PlanDocument {
  reset();
  const nodes = [
    { id: uid(), x: 0, y: 0 },
    { id: uid(), x: 4000, y: 0 },
    { id: uid(), x: 4000, y: 1500 },
    { id: uid(), x: 2000, y: 1500 },
    { id: uid(), x: 2000, y: 3000 },
    { id: uid(), x: 0, y: 3000 },
  ];
  const doc = addRoom(createEmptyDocument(), nodes, 'Cômodo L');
  return withFixtureMeta(doc, 'Cômodo em L');
}

/**
 * Apartamento de referência: 7 cômodos, envelope 6600 × 7900.
 * Área útil esperada ~37,9 m² excluindo a sacada (`specs/10-testes.md`).
 */
export function buildApto44m2(): PlanDocument {
  reset();
  let doc = createEmptyDocument();
  doc = addRoom(doc, rect(0, 0, 3400, 2100), 'Cozinha/A.S.');
  doc = addRoom(doc, rect(0, 2100, 2400, 7000), 'Estar/Jantar');
  doc = addRoom(doc, rect(3400, 0, 6600, 2500), 'Dormitório 01');
  doc = addRoom(doc, rect(3400, 2500, 5600, 3700), 'Banheiro');
  doc = addRoom(doc, rect(3400, 3700, 6600, 6000), 'Dormitório 02');
  doc = addRoom(doc, rect(2400, 6000, 3400, 7000), 'Circulação');
  doc = addRoom(doc, rect(0, 7000, 2400, 7900), 'Sacada', false);
  return withFixtureMeta(doc, 'Apartamento 44m²');
}

export const FIXTURE_BUILDERS = {
  'single-room.planta.json': buildSingleRoom,
  'shared-nodes.planta.json': buildSharedNodes,
  'concave.planta.json': buildConcave,
  'apto-44m2.planta.json': buildApto44m2,
} as const;
