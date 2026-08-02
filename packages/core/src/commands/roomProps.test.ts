import { describe, it, expect } from 'vitest';
import { applyPatches } from 'immer';
import { applyCommand, computeUsableArea } from './commands';
import type { HexColor, NodeId, PlanDocument, RoomId } from '../model';
import { DOCUMENT_COLORS, createEmptyDocument, isDocumentColor } from '../model';

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

describe('SetRoomColor', () => {
  it('aplica uma cor da paleta', () => {
    const doc = oneRoom();
    const color = DOCUMENT_COLORS[0]!;

    const result = applyCommand(doc, {
      type: 'SetRoomColor',
      payload: { roomId: ROOM, color },
    });

    expect(result.error).toBeUndefined();
    expect(result.document.rooms[0]!.color).toBe(color);
  });

  it('null limpa a cor', () => {
    const withColor = applyCommand(oneRoom(), {
      type: 'SetRoomColor',
      payload: { roomId: ROOM, color: DOCUMENT_COLORS[1]! },
    }).document;

    const result = applyCommand(withColor, {
      type: 'SetRoomColor',
      payload: { roomId: ROOM, color: null },
    });

    expect(result.document.rooms[0]!.color).toBeNull();
  });

  it('cor fora da paleta é rejeitada', () => {
    const doc = oneRoom();

    // Derivada da paleta em vez de escrita à mão: um literal hexadecimal aqui
    // dispararia a regra de lint de `04-renderizacao.md`.
    const offPalette = `${DOCUMENT_COLORS[0]!.slice(0, -1)}0` as HexColor;
    expect(isDocumentColor(offPalette)).toBe(false);

    const result = applyCommand(doc, {
      type: 'SetRoomColor',
      payload: { roomId: ROOM, color: offPalette },
    });

    expect(result.error?.code).toBe('UNKNOWN_COLOR');
    expect(result.document).toBe(doc);
  });

  it('cômodo inexistente é rejeitado', () => {
    const doc = oneRoom();

    const result = applyCommand(doc, {
      type: 'SetRoomColor',
      payload: { roomId: 'zzz' as RoomId, color: null },
    });

    expect(result.error?.code).toBe('ROOM_NOT_FOUND');
    expect(result.document).toBe(doc);
  });
});

describe('SetRoomUsable', () => {
  it('desligar tira o cômodo da área útil', () => {
    const doc = oneRoom();
    expect(computeUsableArea(doc)).toBe(8_000_000);

    const result = applyCommand(doc, {
      type: 'SetRoomUsable',
      payload: { roomId: ROOM, includeInUsableArea: false },
    });

    expect(computeUsableArea(result.document)).toBe(0);
  });

  it('patches inversos devolvem o documento original', () => {
    const doc = oneRoom();

    const result = applyCommand(doc, {
      type: 'SetRoomUsable',
      payload: { roomId: ROOM, includeInUsableArea: false },
    });

    expect(applyPatches(result.document, result.inversePatchGroups[0]!)).toEqual(doc);
  });

  it('cômodo inexistente é rejeitado', () => {
    const doc = oneRoom();

    const result = applyCommand(doc, {
      type: 'SetRoomUsable',
      payload: { roomId: 'zzz' as RoomId, includeInUsableArea: false },
    });

    expect(result.error?.code).toBe('ROOM_NOT_FOUND');
    expect(result.document).toBe(doc);
  });
});

describe('paleta de cor de cômodo', () => {
  it('isDocumentColor reconhece só o que está na paleta', () => {
    expect(isDocumentColor(DOCUMENT_COLORS[0]!)).toBe(true);
    expect(isDocumentColor('azul')).toBe(false);
    expect(isDocumentColor(DOCUMENT_COLORS[0]!.toLowerCase())).toBe(false);
  });

  it('toda cor da paleta é hexadecimal de seis dígitos e não se repete', () => {
    for (const color of DOCUMENT_COLORS) {
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    }
    expect(new Set(DOCUMENT_COLORS).size).toBe(DOCUMENT_COLORS.length);
  });
});
