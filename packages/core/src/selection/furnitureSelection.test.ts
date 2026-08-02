import { describe, expect, it } from 'vitest';
import {
  affectedNodes,
  pruneSelection,
  rectFromPoints,
  selectWithin,
  selectedFurniture,
  selectionKey,
  toggle,
  type Selection,
} from './selection';
import { applyCommand } from '../commands';
import { createEmptyDocument } from '../model';
import type { FurnitureId, NodeId, PlanDocument, RoomId } from '../model';

const ROOM = 'r1' as RoomId;
const BED = 'f1' as FurnitureId;

function furnishedRoom(): PlanDocument {
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
    },
  }).document;
}

describe('seleção de móvel', () => {
  it('a chave distingue móvel de cômodo com o mesmo id', () => {
    expect(selectionKey({ kind: 'furniture', furnitureId: 'x' as FurnitureId })).toBe(
      'furniture:x',
    );
    expect(selectionKey({ kind: 'room', roomId: 'x' as RoomId })).toBe('room:x');
  });

  it('Ctrl+clique adiciona e remove', () => {
    const ref = { kind: 'furniture', furnitureId: BED } as const;
    const added = toggle([], ref);

    expect(added).toHaveLength(1);
    expect(toggle(added, ref)).toEqual([]);
  });

  it('selectedFurniture devolve só os móveis', () => {
    const selection: Selection = [
      { kind: 'room', roomId: ROOM },
      { kind: 'furniture', furnitureId: BED },
    ];

    expect(selectedFurniture(selection)).toEqual([BED]);
  });

  it('o retângulo seleciona móvel completamente envolvido', () => {
    const doc = furnishedRoom();
    const rect = rectFromPoints({ x: 1000, y: 900 }, { x: 2200, y: 1600 });

    expect(selectWithin(doc, rect)).toEqual([{ kind: 'furniture', furnitureId: BED }]);
  });

  it('móvel parcialmente coberto não entra', () => {
    const doc = furnishedRoom();
    const rect = rectFromPoints({ x: 1500, y: 900 }, { x: 2200, y: 1600 });

    expect(selectWithin(doc, rect)).toEqual([]);
  });

  it('undo que apaga o móvel poda a referência', () => {
    const doc = furnishedRoom();
    const selection: Selection = [
      { kind: 'furniture', furnitureId: BED },
      { kind: 'furniture', furnitureId: 'zzz' as FurnitureId },
    ];

    expect(pruneSelection(doc, selection)).toEqual([
      { kind: 'furniture', furnitureId: BED },
    ]);
  });

  it('móvel não contribui com nó nenhum para o arraste', () => {
    const doc = furnishedRoom();

    expect(affectedNodes(doc, [{ kind: 'furniture', furnitureId: BED }])).toEqual([]);
  });
});
