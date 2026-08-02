import { describe, expect, it } from 'vitest';
import { hitTest, rotationHandleAt } from './hitTest';
import { applyCommand } from '../commands';
import { createEmptyDocument } from '../model';
import type { FurnitureId, NodeId, PlanDocument, RoomId } from '../model';
import type { Selection } from '../selection';

const ROOM = 'r1' as RoomId;
const BED = 'f1' as FurnitureId;

/** Quarto 3200 × 2500 com uma cama 1000 × 600 no centro, sem rotação. */
function furnishedRoom(overrides: Record<string, unknown> = {}): PlanDocument {
  const room = applyCommand(createEmptyDocument(), {
    type: 'CreateRoom',
    payload: {
      nodes: [
        { id: 'a' as NodeId, x: 0, y: 0 },
        { id: 'b' as NodeId, x: 3200, y: 0 },
        { id: 'c' as NodeId, x: 3200, y: 2500 },
        { id: 'd' as NodeId, x: 0, y: 2500 },
      ],
      loop: ['a', 'b', 'c', 'd'] as NodeId[],
      name: 'Quarto',
      roomId: ROOM,
    },
  }).document;

  return applyCommand(room, {
    type: 'AddFurniture',
    payload: {
      furnitureId: BED,
      catalogId: 'bed-queen',
      name: 'Cama',
      width: 1000,
      depth: 600,
      center: { x: 1600, y: 1250 },
      rotation: 0,
      clearance: 0,
      ...overrides,
    },
  }).document;
}

const selected: Selection = [{ kind: 'furniture', furnitureId: BED }];

describe('hit test de móvel', () => {
  it('clique no corpo devolve o móvel', () => {
    const doc = furnishedRoom();

    expect(hitTest({ x: 1600, y: 1250 }, { doc, scale: 1 })).toEqual({
      kind: 'furniture',
      furnitureId: BED,
    });
  });

  it('clique fora do móvel devolve o interior do cômodo', () => {
    const doc = furnishedRoom();

    expect(hitTest({ x: 500, y: 500 }, { doc, scale: 1 })).toEqual({
      kind: 'roomInterior',
      roomId: ROOM,
    });
  });

  it('o último móvel da lista é o primeiro testado', () => {
    const doc = applyCommand(furnishedRoom(), {
      type: 'AddFurniture',
      payload: {
        furnitureId: 'f2' as FurnitureId,
        catalogId: null,
        name: 'Tapete',
        width: 2000,
        depth: 1500,
        center: { x: 1600, y: 1250 },
        rotation: 0,
        clearance: 0,
      },
    }).document;

    expect(hitTest({ x: 1600, y: 1250 }, { doc, scale: 1 })).toEqual({
      kind: 'furniture',
      furnitureId: 'f2',
    });
  });

  it('móvel vence a aresta que passa por baixo dele', () => {
    // Cama encostada na parede de cima: o ponto está sobre a aresta e sobre a cama.
    const doc = furnishedRoom({ center: { x: 1600, y: 300 } });

    expect(hitTest({ x: 1600, y: 2 }, { doc, scale: 1 })).toEqual({
      kind: 'furniture',
      furnitureId: BED,
    });
  });

  it('nó continua vencendo o móvel', () => {
    const doc = furnishedRoom({ center: { x: 300, y: 300 } });

    expect(hitTest({ x: 3, y: 3 }, { doc, scale: 1 })).toEqual({
      kind: 'node',
      nodeId: 'a',
    });
  });
});

describe('handles de móvel', () => {
  /** O clique que seleciona não pode exigir mira: sem seleção, o canto é corpo. */
  it('sem seleção o canto é só o corpo do móvel', () => {
    const doc = furnishedRoom();

    expect(hitTest({ x: 1100, y: 950 }, { doc, scale: 1 })).toEqual({
      kind: 'furniture',
      furnitureId: BED,
    });
  });

  it('com o móvel selecionado, o canto vira handle', () => {
    const doc = furnishedRoom();

    expect(hitTest({ x: 1100, y: 950 }, { doc, scale: 1, selection: selected })).toEqual({
      kind: 'furnitureCorner',
      furnitureId: BED,
      corner: 0,
    });
  });

  it('cada canto tem o próprio índice', () => {
    const doc = furnishedRoom();
    const corners: [number, number, number][] = [
      [1100, 950, 0],
      [2100, 950, 1],
      [2100, 1550, 2],
      [1100, 1550, 3],
    ];

    for (const [x, y, index] of corners) {
      expect(hitTest({ x, y }, { doc, scale: 1, selection: selected })).toEqual({
        kind: 'furnitureCorner',
        furnitureId: BED,
        corner: index,
      });
    }
  });

  it('o handle de rotação fica além da face frontal', () => {
    const doc = furnishedRoom();
    const grip = rotationHandleAt(doc.furniture[0]!, 24);

    expect(grip).toEqual({ x: 1600, y: 1250 + 300 + 24 });
    expect(hitTest(grip, { doc, scale: 1, selection: selected })).toEqual({
      kind: 'furnitureRotation',
      furnitureId: BED,
    });
  });

  it('a distância do handle de rotação é constante em pixels', () => {
    const doc = furnishedRoom();
    const item = doc.furniture[0]!;

    // A 0,5 px/mm, 24 px de tela são 48 mm de mundo.
    expect(rotationHandleAt(item, 24 / 0.5).y).toBe(1250 + 300 + 48);
  });

  it('móvel travado não tem handle', () => {
    const locked = applyCommand(furnishedRoom(), {
      type: 'UpdateFurniture',
      payload: { furnitureId: BED, locked: true },
    }).document;

    expect(
      hitTest({ x: 1100, y: 950 }, { doc: locked, scale: 1, selection: selected }),
    ).toEqual({ kind: 'furniture', furnitureId: BED });
  });

  it('a tolerância do handle é 10 px convertidos pela escala', () => {
    const doc = furnishedRoom();
    const near = { x: 1100 + 19, y: 950 };
    const far = { x: 1100 + 21, y: 950 };

    // 0,5 px/mm: 10 px de tela são 20 mm de mundo.
    expect(hitTest(near, { doc, scale: 0.5, selection: selected })?.kind).toBe(
      'furnitureCorner',
    );
    expect(hitTest(far, { doc, scale: 0.5, selection: selected })?.kind).toBe('furniture');
  });

  it('handle de móvel não selecionado não dispara', () => {
    const doc = furnishedRoom();
    const other: Selection = [{ kind: 'furniture', furnitureId: 'f9' as FurnitureId }];

    expect(hitTest({ x: 1100, y: 950 }, { doc, scale: 1, selection: other })?.kind).toBe(
      'furniture',
    );
  });
});
