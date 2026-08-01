import { describe, it, expect } from 'vitest';
import {
  EMPTY_SELECTION,
  affectedNodes,
  edgePoints,
  isSelected,
  pruneSelection,
  rectFromPoints,
  replaceWith,
  roomsContaining,
  selectWithin,
  selectedRooms,
  selectionKey,
  toggle,
  type Selection,
} from './selection';
import { applyCommand } from '../commands';
import { DocumentStore } from '../history';
import type { NodeId, PlanDocument, RoomId } from '../model';
import { createEmptyDocument } from '../model';

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

describe('operações de conjunto', () => {
  it('a mesma aresta selecionada duas vezes é uma entrada só', () => {
    const ref = { kind: 'edge', edge: { kind: 'room', roomId: LEFT, index: 1 } } as const;
    const twice = { kind: 'edge', edge: { kind: 'room', roomId: LEFT, index: 1 } } as const;

    expect(selectionKey(ref)).toBe(selectionKey(twice));
    expect(isSelected([ref], twice)).toBe(true);
    expect(toggle([ref], twice)).toEqual([]);
  });

  it('Ctrl+clique adiciona o que falta e remove o que está', () => {
    const room = { kind: 'room', roomId: LEFT } as const;
    const node = { kind: 'node', nodeId: n('a') } as const;

    const added = toggle(EMPTY_SELECTION, room);
    expect(added).toHaveLength(1);

    const both = toggle(added, node);
    expect(both).toHaveLength(2);

    expect(toggle(both, room)).toEqual([node]);
  });

  it('clique simples substitui a seleção; em área vazia, limpa', () => {
    expect(replaceWith({ kind: 'room', roomId: LEFT })).toHaveLength(1);
    expect(replaceWith(null)).toEqual([]);
  });

  it('selectedRooms devolve só os cômodos', () => {
    const selection: Selection = [
      { kind: 'room', roomId: LEFT },
      { kind: 'node', nodeId: n('a') },
      { kind: 'room', roomId: RIGHT },
    ];

    expect(selectedRooms(selection)).toEqual([LEFT, RIGHT]);
  });
});

describe('retângulo de seleção', () => {
  it('seleciona só quem está completamente envolvido', () => {
    const doc = twoAdjacentRooms();

    const rect = rectFromPoints({ x: -100, y: -100 }, { x: 3300, y: 2600 });
    const selection = selectWithin(doc, rect);

    expect(selectedRooms(selection)).toEqual([LEFT]);
  });

  it('cômodo parcialmente coberto não entra, mas seus nós envolvidos entram', () => {
    const doc = twoAdjacentRooms();

    const rect = rectFromPoints({ x: -100, y: -100 }, { x: 3300, y: 1000 });
    const selection = selectWithin(doc, rect);

    expect(selectedRooms(selection)).toEqual([]);
    const nodes = selection.filter((ref) => ref.kind === 'node');
    expect(nodes).toHaveLength(2);
  });

  it('retângulo desenhado da direita para a esquerda seleciona igual', () => {
    const doc = twoAdjacentRooms();

    const forward = selectWithin(
      doc,
      rectFromPoints({ x: -100, y: -100 }, { x: 3300, y: 2600 }),
    );
    const backward = selectWithin(
      doc,
      rectFromPoints({ x: 3300, y: 2600 }, { x: -100, y: -100 }),
    );

    expect(backward).toEqual(forward);
  });

  it('retângulo que envolve tudo seleciona os dois cômodos', () => {
    const doc = twoAdjacentRooms();

    const selection = selectWithin(
      doc,
      rectFromPoints({ x: -100, y: -100 }, { x: 6500, y: 2600 }),
    );

    expect(selectedRooms(selection)).toEqual([LEFT, RIGHT]);
  });
});

describe('poda por melhor esforço', () => {
  it('undo depois de criar cômodo limpa a seleção sem erro', () => {
    const store = new DocumentStore();
    store.dispatch({
      type: 'CreateRoom',
      payload: {
        nodes: [
          { id: n('a'), x: 0, y: 0 },
          { id: n('b'), x: 3200, y: 0 },
          { id: n('c'), x: 3200, y: 2500 },
        ],
        loop: [n('a'), n('b'), n('c')],
        name: 'Quarto',
        roomId: LEFT,
      },
    });

    const selection: Selection = [
      { kind: 'room', roomId: LEFT },
      { kind: 'node', nodeId: n('a') },
      { kind: 'edge', edge: { kind: 'room', roomId: LEFT, index: 0 } },
    ];
    expect(pruneSelection(store.current, selection)).toHaveLength(3);

    store.undo();

    expect(pruneSelection(store.current, selection)).toEqual([]);
  });

  it('mantém o que ainda existe e descarta o resto', () => {
    const doc = twoAdjacentRooms();

    const selection: Selection = [
      { kind: 'room', roomId: LEFT },
      { kind: 'room', roomId: 'zzz' as RoomId },
      { kind: 'node', nodeId: n('a') },
      { kind: 'node', nodeId: n('zzz') },
    ];

    expect(pruneSelection(doc, selection)).toHaveLength(2);
  });

  it('aresta com índice fora do ciclo é descartada', () => {
    const doc = twoAdjacentRooms();

    const selection: Selection = [
      { kind: 'edge', edge: { kind: 'room', roomId: LEFT, index: 9 } },
    ];

    expect(pruneSelection(doc, selection)).toEqual([]);
  });
});

describe('geometria da seleção', () => {
  it('affectedNodes de uma aresta são os dois extremos', () => {
    const doc = twoAdjacentRooms();

    const nodes = affectedNodes(doc, [
      { kind: 'edge', edge: { kind: 'room', roomId: LEFT, index: 1 } },
    ]);

    expect(new Set(nodes)).toEqual(new Set([n('b'), n('c')]));
  });

  it('affectedNodes de um cômodo são todos os do ciclo, sem repetir', () => {
    const doc = twoAdjacentRooms();

    const nodes = affectedNodes(doc, [
      { kind: 'room', roomId: LEFT },
      { kind: 'node', nodeId: n('b') },
    ]);

    expect(nodes).toHaveLength(4);
  });

  it('edgePoints resolve os extremos na ordem do ciclo', () => {
    const doc = twoAdjacentRooms();

    expect(edgePoints(doc, { kind: 'room', roomId: LEFT, index: 1 })).toEqual([
      { x: 3200, y: 0 },
      { x: 3200, y: 2500 },
    ]);
    expect(edgePoints(doc, { kind: 'room', roomId: LEFT, index: 9 })).toBeNull();
  });

  it('roomsContaining acha o cômodo sob o ponto', () => {
    const doc = twoAdjacentRooms();

    expect(roomsContaining(doc, { x: 1600, y: 1250 })).toEqual([LEFT]);
    expect(roomsContaining(doc, { x: 9000, y: 9000 })).toEqual([]);
  });
});
