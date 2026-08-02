import { applyCommand } from '../commands';
import { createEmptyDocument } from '../model';
import type { FurnitureId, NodeId, PlanDocument, RoomId } from '../model';

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

/**
 * `apto-44m2` mais 40 móveis, para o teste de performance
 * (`04-renderizacao.md` § Orçamento, `10-testes.md` § Testes de performance).
 *
 * Os móveis saem das medidas do catálogo default, mas o payload é escrito
 * aqui: `core` não conhece o pacote `catalog`.
 *
 * Distribuídos em grade sobre o envelope, eles se sobrepõem — 40 móveis num
 * apartamento de 44 m² se sobrepõem de verdade. É deliberado: a fixture existe
 * para medir o orçamento de 8 ms no **pior caso**, e o pior caso inclui a
 * hachura de colisão e o contorno tracejado de quem ficou fora de cômodo.
 */
export function buildFurnished(): PlanDocument {
  reset();
  let doc = buildApto44m2();

  const sizes: { name: string; width: number; depth: number; clearance: number }[] = [
    { name: 'Cama queen', width: 1580, depth: 1980, clearance: 600 },
    { name: 'Criado-mudo', width: 500, depth: 400, clearance: 0 },
    { name: 'Guarda-roupa 4 portas', width: 1800, depth: 550, clearance: 700 },
    { name: 'Sofá 3 lugares', width: 2000, depth: 900, clearance: 400 },
    { name: 'Mesa de centro', width: 1000, depth: 600, clearance: 400 },
    { name: 'Cadeira', width: 450, depth: 500, clearance: 0 },
    { name: 'Geladeira duplex', width: 830, depth: 750, clearance: 900 },
    { name: 'Fogão 4 bocas', width: 520, depth: 600, clearance: 900 },
  ];

  const COLUMNS = 5;
  const STEP_X = 1300;
  const STEP_Y = 1500;

  for (let index = 0; index < 40; index += 1) {
    const size = sizes[index % sizes.length]!;
    const catalogId =
      size.name === 'Cama queen' && index === 0 ? 'cama-queen' :
      size.name === 'Criado-mudo' && index === 1 ? 'criado-mudo' :
      null;
    doc = applyCommand(doc, {
      type: 'AddFurniture',
      payload: {
        furnitureId: `f_fx${index + 1}` as FurnitureId,
        catalogId,
        name: size.name,
        width: size.width,
        depth: size.depth,
        center: {
          x: 400 + (index % COLUMNS) * STEP_X,
          y: 400 + Math.floor(index / COLUMNS) * STEP_Y,
        },
        rotation: (index % 4) * 90,
        clearance: size.clearance,
      },
    }).document;
  }

  // Duas paredes avulsas: bancada da cozinha e divisória
  doc = applyCommand(doc, {
    type: 'CreateWall',
    payload: {
      nodes: [],
      segments: [
        { a: 'n_fx3' as NodeId, b: 'n_fx4' as NodeId, wallId: 'w_bancada_cozinha' as unknown as never },
        { a: 'n_fx6' as NodeId, b: 'n_fx21' as NodeId, wallId: 'w_divisoria' as unknown as never },
      ],
    },
  }).document;

  return withFixtureMeta(doc, 'Apartamento mobiliado');
}

export const FIXTURE_BUILDERS = {
  'single-room.planta.json': buildSingleRoom,
  'shared-nodes.planta.json': buildSharedNodes,
  'concave.planta.json': buildConcave,
  'apto-44m2.planta.json': buildApto44m2,
  'furnished.planta.json': buildFurnished,
} as const;
