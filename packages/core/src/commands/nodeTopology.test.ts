import { describe, it, expect } from 'vitest';
import { applyPatches } from 'immer';
import { applyCommand, computeRoomArea } from './commands';
import type { NodeId, PlanDocument, RoomId, WallId } from '../model';
import { createEmptyDocument, validateDocumentErrors } from '../model';

const n = (id: string): NodeId => id as NodeId;

/** Dois retângulos lado a lado compartilhando a aresta central: seis nós. */
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
      roomId: 'left' as RoomId,
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
      roomId: 'right' as RoomId,
    },
  }).document;
}

const LEFT = 'left' as RoomId;
const RIGHT = 'right' as RoomId;

function loopOf(doc: PlanDocument, roomId: RoomId): NodeId[] {
  return [...doc.rooms.find((room) => room.id === roomId)!.loop];
}

describe('MergeNodes', () => {
  it('funde dois nós distintos: o removido some e as referências apontam para o mantido', () => {
    const doc = twoAdjacentRooms();

    const result = applyCommand(doc, {
      type: 'MergeNodes',
      payload: { keep: n('b'), remove: n('f') },
    });

    expect(result.error).toBeUndefined();
    expect(result.document.nodes).toHaveLength(5);
    expect(result.document.nodes.some((node) => node.id === n('f'))).toBe(false);
    expect(loopOf(result.document, RIGHT)).toContain(n('b'));
    expect(validateDocumentErrors(result.document)).toHaveLength(0);
  });

  it('o nó mantido conserva a própria posição', () => {
    const doc = twoAdjacentRooms();

    const result = applyCommand(doc, {
      type: 'MergeNodes',
      payload: { keep: n('b'), remove: n('f') },
    });

    const kept = result.document.nodes.find((node) => node.id === n('b'))!;
    expect({ x: kept.x, y: kept.y }).toEqual({ x: 3200, y: 0 });
  });

  it('loop que passaria a ter o nó duas vezes perde a repetição', () => {
    const doc = twoAdjacentRooms();

    const result = applyCommand(doc, {
      type: 'MergeNodes',
      payload: { keep: n('b'), remove: n('c') },
    });

    expect(result.error).toBeUndefined();
    const left = loopOf(result.document, LEFT);
    expect(left).toHaveLength(3);
    expect(new Set(left).size).toBe(3);
    expect(validateDocumentErrors(result.document)).toHaveLength(0);
  });

  it('rejeita quando um loop cairia abaixo de três nós', () => {
    const triangle = applyCommand(createEmptyDocument(), {
      type: 'CreateRoom',
      payload: {
        nodes: [
          { id: n('a'), x: 0, y: 0 },
          { id: n('b'), x: 3200, y: 0 },
          { id: n('c'), x: 3200, y: 2500 },
        ],
        loop: [n('a'), n('b'), n('c')],
        name: 'Triângulo',
      },
    }).document;

    const result = applyCommand(triangle, {
      type: 'MergeNodes',
      payload: { keep: n('a'), remove: n('b') },
    });

    expect(result.error?.code).toBe('LOOP_TOO_SHORT');
    expect(result.document).toBe(triangle);
  });

  it('rejeita fusão de um nó consigo mesmo', () => {
    const doc = twoAdjacentRooms();

    const result = applyCommand(doc, {
      type: 'MergeNodes',
      payload: { keep: n('b'), remove: n('b') },
    });

    expect(result.error?.code).toBe('SAME_NODE');
    expect(result.document).toBe(doc);
  });

  it('rejeita nó inexistente', () => {
    const doc = twoAdjacentRooms();

    const result = applyCommand(doc, {
      type: 'MergeNodes',
      payload: { keep: n('b'), remove: n('zzz') },
    });

    expect(result.error?.code).toBe('NODE_NOT_FOUND');
    expect(result.document).toBe(doc);
  });

  it('rejeita quando uma parede avulsa ficaria com as duas pontas no mesmo nó', () => {
    const base = twoAdjacentRooms();
    const withWall: PlanDocument = {
      ...base,
      walls: [{ id: 'w1' as WallId, a: n('a'), b: n('d') }],
    };

    const result = applyCommand(withWall, {
      type: 'MergeNodes',
      payload: { keep: n('a'), remove: n('d') },
    });

    expect(result.error?.code).toBe('DEGENERATE_WALL');
    expect(result.document).toBe(withWall);
  });

  it('patches inversos devolvem o documento original', () => {
    const doc = twoAdjacentRooms();

    const result = applyCommand(doc, {
      type: 'MergeNodes',
      payload: { keep: n('b'), remove: n('f') },
    });

    expect(applyPatches(result.document, result.inversePatchGroups[0]!)).toEqual(doc);
  });
});

describe('SplitNode', () => {
  it('desconecta o nó de um cômodo e reposiciona a cópia, sem coincidir com o original', () => {
    const doc = twoAdjacentRooms();

    const result = applyCommand(doc, {
      type: 'SplitNode',
      payload: { nodeId: n('b'), roomId: RIGHT, to: { x: 3300, y: 0 } },
    });

    expect(result.error).toBeUndefined();
    expect(result.document.nodes).toHaveLength(7);
    expect(loopOf(result.document, LEFT)).toContain(n('b'));
    expect(loopOf(result.document, RIGHT)).not.toContain(n('b'));
    expect(validateDocumentErrors(result.document)).toHaveLength(0);
  });

  it('o cômodo que ficou com o nó original não muda de área', () => {
    const doc = twoAdjacentRooms();
    const before = computeRoomArea(doc, LEFT);

    const result = applyCommand(doc, {
      type: 'SplitNode',
      payload: { nodeId: n('b'), roomId: RIGHT, to: { x: 3300, y: 0 } },
    });

    expect(computeRoomArea(result.document, LEFT)).toBe(before);
    expect(computeRoomArea(result.document, RIGHT)).not.toBe(
      computeRoomArea(doc, RIGHT),
    );
  });

  it('rejeita destino já ocupado por outro nó', () => {
    const doc = twoAdjacentRooms();

    const result = applyCommand(doc, {
      type: 'SplitNode',
      payload: { nodeId: n('b'), roomId: RIGHT, to: { x: 6400, y: 0 } },
    });

    expect(result.error?.code).toBe('NODE_COLLISION');
    expect(result.document).toBe(doc);
  });

  it('rejeita destino sobre o próprio nó de origem — seria E6', () => {
    const doc = twoAdjacentRooms();

    const result = applyCommand(doc, {
      type: 'SplitNode',
      payload: { nodeId: n('b'), roomId: RIGHT, to: { x: 3200, y: 0 } },
    });

    expect(result.error?.code).toBe('NODE_COLLISION');
    expect(result.document).toBe(doc);
  });

  it('rejeita nó que só este cômodo referencia', () => {
    const doc = twoAdjacentRooms();

    const result = applyCommand(doc, {
      type: 'SplitNode',
      payload: { nodeId: n('a'), roomId: LEFT, to: { x: 100, y: 100 } },
    });

    expect(result.error?.code).toBe('NODE_NOT_SHARED');
    expect(result.document).toBe(doc);
  });

  it('rejeita cômodo que não contém o nó', () => {
    const doc = twoAdjacentRooms();

    const result = applyCommand(doc, {
      type: 'SplitNode',
      payload: { nodeId: n('a'), roomId: RIGHT, to: { x: 100, y: 100 } },
    });

    expect(result.error?.code).toBe('UNKNOWN_LOOP_NODE');
    expect(result.document).toBe(doc);
  });

  it('rejeita coordenada não inteira', () => {
    const doc = twoAdjacentRooms();

    const result = applyCommand(doc, {
      type: 'SplitNode',
      payload: { nodeId: n('b'), roomId: RIGHT, to: { x: 3300.5, y: 0 } },
    });

    expect(result.error?.code).toBe('NON_INTEGER_COORDINATE');
    expect(result.document).toBe(doc);
  });

  it('patches inversos devolvem o documento original', () => {
    const doc = twoAdjacentRooms();

    const result = applyCommand(doc, {
      type: 'SplitNode',
      payload: { nodeId: n('b'), roomId: RIGHT, to: { x: 3300, y: 0 } },
    });

    expect(applyPatches(result.document, result.inversePatchGroups[0]!)).toEqual(doc);
  });
});
