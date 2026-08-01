import { describe, it, expect } from 'vitest';
import { hitTest } from './hitTest';
import { applyCommand } from '../commands';
import type { NodeId, PlanDocument, RoomId } from '../model';
import { createEmptyDocument } from '../model';

const n = (id: string): NodeId => id as NodeId;
const ROOM = 'r1' as RoomId;

function oneRoom(): PlanDocument {
  return applyCommand(createEmptyDocument(), {
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
}

// 1 px/mm: tolerâncias em mm coincidem com as tolerâncias em px da spec.
const ctx = (doc: PlanDocument) => ({ doc, scale: 1 });

describe('hitTest', () => {
  it('nó vence a aresta que passa por ele', () => {
    const doc = oneRoom();

    const result = hitTest({ x: 3, y: 2 }, ctx(doc));

    expect(result).toEqual({ kind: 'node', nodeId: n('a') });
  });

  it('nó fora da tolerância de handle não é acertado', () => {
    const doc = oneRoom();

    const result = hitTest({ x: 40, y: 3 }, ctx(doc));

    expect(result).toEqual({
      kind: 'edge',
      edge: { kind: 'room', roomId: ROOM, index: 0 },
    });
  });

  it('aresta vence o interior do cômodo', () => {
    const doc = oneRoom();

    const result = hitTest({ x: 1600, y: 4 }, ctx(doc));

    expect(result).toEqual({
      kind: 'edge',
      edge: { kind: 'room', roomId: ROOM, index: 0 },
    });
  });

  it('a aresta acertada é a mais próxima', () => {
    const doc = oneRoom();

    const result = hitTest({ x: 1600, y: 2497 }, ctx(doc));

    expect(result).toEqual({
      kind: 'edge',
      edge: { kind: 'room', roomId: ROOM, index: 2 },
    });
  });

  it('ponto no meio do polígono acerta o interior', () => {
    const doc = oneRoom();

    const result = hitTest({ x: 1600, y: 1250 }, ctx(doc));

    expect(result).toEqual({ kind: 'roomInterior', roomId: ROOM });
  });

  it('ponto fora de tudo não acerta nada', () => {
    const doc = oneRoom();

    expect(hitTest({ x: 9000, y: 9000 }, ctx(doc))).toBeNull();
  });

  it('a tolerância acompanha a escala da câmera', () => {
    const doc = oneRoom();

    // Com 0,1 px/mm, 10 px de handle são 100 mm de mundo.
    expect(hitTest({ x: 60, y: 0 }, { doc, scale: 0.1 })).toEqual({
      kind: 'node',
      nodeId: n('a'),
    });
    // Com 1 px/mm, os mesmos 60 mm ficam muito além do handle.
    expect(hitTest({ x: 60, y: 0 }, { doc, scale: 1 })).not.toEqual({
      kind: 'node',
      nodeId: n('a'),
    });
  });

  it('o cômodo de cima é o primeiro testado', () => {
    const base = oneRoom();
    const second = applyCommand(base, {
      type: 'CreateRoom',
      payload: {
        nodes: [
          { id: n('e'), x: 800, y: 600 },
          { id: n('f'), x: 2400, y: 600 },
          { id: n('g'), x: 2400, y: 1900 },
          { id: n('h'), x: 800, y: 1900 },
        ],
        loop: [n('e'), n('f'), n('g'), n('h')],
        name: 'Dentro',
        roomId: 'r2' as RoomId,
      },
    }).document;

    const result = hitTest({ x: 1600, y: 1250 }, ctx(second));

    expect(result).toEqual({ kind: 'roomInterior', roomId: 'r2' as RoomId });
  });
});
