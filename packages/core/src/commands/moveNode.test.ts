import { describe, it, expect } from 'vitest';
import { applyCommand, computeRoomArea } from './commands';
import type { NodeId, PlanDocument, RoomId } from '../model';
import { createEmptyDocument, validateDocumentErrors } from '../model';

const n = (id: string): NodeId => id as NodeId;

/**
 * Dois retângulos 3200×2500 lado a lado, compartilhando a aresta central.
 * Seis nós, não oito — é a topologia do critério de aceitação da spec 03.
 */
function twoAdjacentRooms(): {
  doc: PlanDocument;
  left: RoomId;
  right: RoomId;
} {
  const first = applyCommand(createEmptyDocument(), {
    type: 'CreateRoom',
    payload: {
      nodes: [
        { id: n('a'), x: 0, y: 0 },
        { id: n('b'), x: 3200, y: 0 },
        { id: n('c'), x: 3200, y: 2500 },
        { id: n('d'), x: 0, y: 2500 },
      ],
      loop: [n('a'), n('b'), n('c'), n('d')],
      name: 'Esquerda',
      roomId: 'left' as RoomId,
    },
  });

  const second = applyCommand(first.document, {
    type: 'CreateRoom',
    payload: {
      nodes: [
        { id: n('e'), x: 3200, y: 0 },
        { id: n('f'), x: 6400, y: 0 },
        { id: n('g'), x: 6400, y: 2500 },
        { id: n('h'), x: 3200, y: 2500 },
      ],
      loop: [n('e'), n('f'), n('g'), n('h')],
      name: 'Direita',
      roomId: 'right' as RoomId,
    },
  });

  return {
    doc: second.document,
    left: 'left' as RoomId,
    right: 'right' as RoomId,
  };
}

describe('CreateRoom — nós coincidentes no ciclo', () => {
  it('rejeita loop cujos ids distintos resolvem para a mesma coordenada', () => {
    const doc = createEmptyDocument();

    // O traço volta exatamente sobre o segundo nó. Ids distintos, coordenadas
    // repetidas: o merge por coordenada colapsaria os dois e o ciclo passaria
    // a repetir um vértice (E4).
    const result = applyCommand(doc, {
      type: 'CreateRoom',
      payload: {
        nodes: [
          { id: n('a'), x: 0, y: 0 },
          { id: n('b'), x: 500, y: 0 },
          { id: n('c'), x: 500, y: 510 },
          { id: n('d'), x: 500, y: 0 },
        ],
        loop: [n('a'), n('b'), n('c'), n('d')],
        name: '',
      },
    });

    expect(result.error?.code).toBe('COINCIDENT_LOOP_NODE');
    expect(result.document).toBe(doc);
    expect(validateDocumentErrors(result.document)).toHaveLength(0);
  });
});

describe('MoveNode', () => {
  it('mover um nó compartilhado atualiza a área dos dois cômodos', () => {
    const { doc, left, right } = twoAdjacentRooms();

    expect(doc.nodes).toHaveLength(6);
    expect(computeRoomArea(doc, left)).toBe(8_000_000);
    expect(computeRoomArea(doc, right)).toBe(8_000_000);

    const moved = applyCommand(doc, {
      type: 'MoveNode',
      payload: { nodeId: n('b'), x: 4200, y: 0 },
    });

    expect(moved.error).toBeUndefined();
    expect(computeRoomArea(moved.document, left)).toBeGreaterThan(8_000_000);
    expect(computeRoomArea(moved.document, right)).toBeLessThan(8_000_000);
    expect(validateDocumentErrors(moved.document)).toHaveLength(0);
  });

  it('a soma das duas áreas se conserva ao mover o nó compartilhado na horizontal', () => {
    const { doc, left, right } = twoAdjacentRooms();

    const moved = applyCommand(doc, {
      type: 'MoveNode',
      payload: { nodeId: n('b'), x: 4200, y: 0 },
    });

    const before = computeRoomArea(doc, left) + computeRoomArea(doc, right);
    const after =
      computeRoomArea(moved.document, left) + computeRoomArea(moved.document, right);

    expect(after).toBe(before);
  });

  it('patches inversos devolvem o documento original', async () => {
    const { doc } = twoAdjacentRooms();
    const { applyPatches } = await import('immer');

    const moved = applyCommand(doc, {
      type: 'MoveNode',
      payload: { nodeId: n('b'), x: 4200, y: 1000 },
    });

    expect(moved.inversePatchGroups).toHaveLength(1);
    expect(applyPatches(moved.document, moved.inversePatchGroups[0]!)).toEqual(doc);
  });

  it('nó inexistente é rejeitado sem tocar no documento', () => {
    const { doc } = twoAdjacentRooms();

    const result = applyCommand(doc, {
      type: 'MoveNode',
      payload: { nodeId: n('zzz'), x: 100, y: 100 },
    });

    expect(result.error?.code).toBe('NODE_NOT_FOUND');
    expect(result.document).toBe(doc);
  });

  it('coordenada não inteira é rejeitada', () => {
    const { doc } = twoAdjacentRooms();

    const result = applyCommand(doc, {
      type: 'MoveNode',
      payload: { nodeId: n('b'), x: 4200.5, y: 0 },
    });

    expect(result.error?.code).toBe('NON_INTEGER_COORDINATE');
    expect(result.document).toBe(doc);
  });

  it('mover para cima de outro nó é rejeitado, não funde', () => {
    const { doc } = twoAdjacentRooms();

    const result = applyCommand(doc, {
      type: 'MoveNode',
      payload: { nodeId: n('a'), x: 3200, y: 0 },
    });

    expect(result.error?.code).toBe('NODE_COLLISION');
    expect(result.document).toBe(doc);
    expect(result.document.nodes).toHaveLength(6);
  });

  it('mover um nó para a posição onde ele já está não é colisão consigo mesmo', () => {
    const { doc } = twoAdjacentRooms();

    const result = applyCommand(doc, {
      type: 'MoveNode',
      payload: { nodeId: n('b'), x: 3200, y: 0 },
    });

    expect(result.error).toBeUndefined();
    expect(result.document.nodes).toHaveLength(6);
  });
});
