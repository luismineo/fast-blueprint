import { describe, it, expect } from 'vitest';
import { affectedNodes, edgePoints, pruneSelection, type Selection } from './selection';
import { hitTest } from '../hit';
import { applyCommand } from '../commands';
import type { NodeId, PlanDocument, RoomId, WallId } from '../model';
import { createEmptyDocument } from '../model';

const n = (id: string): NodeId => id as NodeId;
const ROOM = 'r1' as RoomId;
const WALL = 'w1' as WallId;

/**
 * Paredes avulsas ainda não têm comando que as crie — `CreateWall` está em
 * aberto desde o M1 (`08-arquitetura.md`). O documento é montado à mão para
 * que os caminhos de `kind: 'wall'` não fiquem sem exercício até lá.
 */
function roomWithWall(): PlanDocument {
  const base = applyCommand(createEmptyDocument(), {
    type: 'CreateRoom',
    payload: {
      nodes: [
        { id: n('a'), x: 0, y: 0 },
        { id: n('b'), x: 3200, y: 0 },
        { id: n('c'), x: 3200, y: 2500 },
        { id: n('d'), x: 0, y: 2500 },
      ],
      loop: [n('a'), n('b'), n('c'), n('d')],
      name: 'Quarto',
      roomId: ROOM,
    },
  }).document;

  return {
    ...base,
    nodes: [...base.nodes, { id: n('w_end'), x: 1600, y: 5000 } as never],
    walls: [{ id: WALL, a: n('d'), b: n('w_end') }],
  };
}

describe('paredes avulsas', () => {
  it('edgePoints resolve os extremos de uma parede', () => {
    const doc = roomWithWall();

    expect(edgePoints(doc, { kind: 'wall', wallId: WALL })).toEqual([
      { x: 0, y: 2500 },
      { x: 1600, y: 5000 },
    ]);
  });

  it('edgePoints devolve null para parede inexistente', () => {
    const doc = roomWithWall();

    expect(edgePoints(doc, { kind: 'wall', wallId: 'zzz' as WallId })).toBeNull();
  });

  it('affectedNodes de uma parede são as duas pontas', () => {
    const doc = roomWithWall();

    const nodes = affectedNodes(doc, [
      { kind: 'edge', edge: { kind: 'wall', wallId: WALL } },
    ]);

    expect(new Set(nodes)).toEqual(new Set([n('d'), n('w_end')]));
  });

  it('affectedNodes ignora parede inexistente', () => {
    const doc = roomWithWall();

    expect(
      affectedNodes(doc, [{ kind: 'edge', edge: { kind: 'wall', wallId: 'zzz' as WallId } }]),
    ).toEqual([]);
  });

  it('pruneSelection mantém parede existente e descarta a que sumiu', () => {
    const doc = roomWithWall();
    const selection: Selection = [
      { kind: 'edge', edge: { kind: 'wall', wallId: WALL } },
      { kind: 'edge', edge: { kind: 'wall', wallId: 'zzz' as WallId } },
    ];

    expect(pruneSelection(doc, selection)).toHaveLength(1);
  });

  it('hitTest acerta a parede avulsa', () => {
    const doc = roomWithWall();

    // Meio da parede, a 3 mm dela — dentro dos 6 px a 1 px/mm.
    const result = hitTest({ x: 803, y: 3750 }, { doc, scale: 1 });

    expect(result).toEqual({ kind: 'edge', edge: { kind: 'wall', wallId: WALL } });
  });

  it('hitTest ignora parede cujos nós não resolvem', () => {
    const doc = roomWithWall();
    const broken: PlanDocument = {
      ...doc,
      walls: [{ id: WALL, a: n('zzz'), b: n('w_end') }],
    };

    expect(hitTest({ x: 800, y: 3750 }, { doc: broken, scale: 1 })).toBeNull();
  });

  it('hitTest ignora cômodo cujo ciclo não resolve', () => {
    const doc = roomWithWall();
    const broken: PlanDocument = {
      ...doc,
      rooms: [{ ...doc.rooms[0]!, loop: [n('a'), n('b'), n('zzz')] }],
      walls: [],
    };

    expect(hitTest({ x: 1600, y: 1250 }, { doc: broken, scale: 1 })).toBeNull();
  });
});
