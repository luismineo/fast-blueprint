import { describe, it, expect } from 'vitest';
import { applyPatches } from 'immer';
import { applyCommand } from './commands';
import { edgeLength } from '../geometry';
import type { NodeId, PlanDocument, RoomId } from '../model';
import { createEmptyDocument, validateDocumentErrors } from '../model';

const n = (id: string): NodeId => id as NodeId;
const LEFT = 'left' as RoomId;
const RIGHT = 'right' as RoomId;

function twoAdjacentRooms(): PlanDocument {
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
      roomId: LEFT,
    },
  });

  return applyCommand(first.document, {
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
      roomId: RIGHT,
    },
  }).document;
}

function measure(doc: PlanDocument, roomId: RoomId, index: number): number {
  const room = doc.rooms.find((candidate) => candidate.id === roomId)!;
  const at = (id: NodeId) => doc.nodes.find((node) => node.id === id)!;
  const start = at(room.loop[index]!);
  const end = at(room.loop[(index + 1) % room.loop.length]!);
  return edgeLength(start, end);
}

describe('SetEdgeLength', () => {
  it('a aresta passa a ter exatamente o comprimento digitado', () => {
    const doc = twoAdjacentRooms();
    expect(measure(doc, LEFT, 1)).toBe(2500);

    const result = applyCommand(doc, {
      type: 'SetEdgeLength',
      payload: { edge: { kind: 'room', roomId: LEFT, index: 1 }, length: 2000, mode: 'moveTogether' },
    });

    expect(result.error).toBeUndefined();
    expect(measure(result.document, LEFT, 1)).toBe(2000);
    expect(validateDocumentErrors(result.document)).toHaveLength(0);
  });

  it('"Mover junto" move o nó compartilhado, sem criar nó novo', () => {
    const doc = twoAdjacentRooms();

    const result = applyCommand(doc, {
      type: 'SetEdgeLength',
      payload: { edge: { kind: 'room', roomId: LEFT, index: 1 }, length: 2000, mode: 'moveTogether' },
    });

    expect(result.document.nodes).toHaveLength(6);
    const moved = result.document.nodes.find((node) => node.id === n('c'))!;
    expect({ x: moved.x, y: moved.y }).toEqual({ x: 3200, y: 2000 });
    expect(result.document.rooms.find((r) => r.id === RIGHT)!.loop).toContain(n('c'));
  });

  it('"Só este cômodo" desconecta: nó novo, e o cômodo vizinho fica onde estava', () => {
    const doc = twoAdjacentRooms();
    const rightBefore = measure(doc, RIGHT, 2);

    const result = applyCommand(doc, {
      type: 'SetEdgeLength',
      payload: { edge: { kind: 'room', roomId: LEFT, index: 1 }, length: 2000, mode: 'detach' },
    });

    expect(result.error).toBeUndefined();
    expect(result.document.nodes).toHaveLength(7);
    expect(measure(result.document, LEFT, 1)).toBe(2000);
    expect(measure(result.document, RIGHT, 2)).toBe(rightBefore);

    const original = result.document.nodes.find((node) => node.id === n('c'))!;
    expect({ x: original.x, y: original.y }).toEqual({ x: 3200, y: 2500 });
    expect(validateDocumentErrors(result.document)).toHaveLength(0);
  });

  it('"Só este cômodo" num nó não compartilhado apenas move, sem criar nó', () => {
    const doc = twoAdjacentRooms();

    const result = applyCommand(doc, {
      type: 'SetEdgeLength',
      payload: { edge: { kind: 'room', roomId: LEFT, index: 3 }, length: 2000, mode: 'detach' },
    });

    expect(result.error).toBeUndefined();
    expect(result.document.nodes).toHaveLength(6);
  });

  it('comprimento zero ou negativo é rejeitado', () => {
    const doc = twoAdjacentRooms();

    for (const length of [0, -100]) {
      const result = applyCommand(doc, {
        type: 'SetEdgeLength',
        payload: { edge: { kind: 'room', roomId: LEFT, index: 1 }, length, mode: 'moveTogether' },
      });

      expect(result.error?.code).toBe('INVALID_LENGTH');
      expect(result.document).toBe(doc);
    }
  });

  it('aresta inexistente é rejeitada', () => {
    const doc = twoAdjacentRooms();

    const outOfRange = applyCommand(doc, {
      type: 'SetEdgeLength',
      payload: { edge: { kind: 'room', roomId: LEFT, index: 9 }, length: 2000, mode: 'moveTogether' },
    });
    expect(outOfRange.error?.code).toBe('EDGE_NOT_FOUND');

    const unknownRoom = applyCommand(doc, {
      type: 'SetEdgeLength',
      payload: {
        edge: { kind: 'room', roomId: 'zzz' as RoomId, index: 0 },
        length: 2000,
        mode: 'moveTogether',
      },
    });
    expect(unknownRoom.error?.code).toBe('EDGE_NOT_FOUND');
    expect(unknownRoom.document).toBe(doc);
  });

  it('destino que colidiria com outro nó é rejeitado', () => {
    const doc = twoAdjacentRooms();

    const result = applyCommand(doc, {
      type: 'SetEdgeLength',
      payload: { edge: { kind: 'room', roomId: LEFT, index: 0 }, length: 6400, mode: 'moveTogether' },
    });

    expect(result.error?.code).toBe('NODE_COLLISION');
    expect(result.document).toBe(doc);
  });

  it('patches inversos devolvem o documento original nos dois modos', () => {
    const doc = twoAdjacentRooms();

    for (const mode of ['moveTogether', 'detach'] as const) {
      const result = applyCommand(doc, {
        type: 'SetEdgeLength',
        payload: { edge: { kind: 'room', roomId: LEFT, index: 1 }, length: 2000, mode },
      });

      expect(applyPatches(result.document, result.inversePatchGroups[0]!)).toEqual(doc);
    }
  });
});
