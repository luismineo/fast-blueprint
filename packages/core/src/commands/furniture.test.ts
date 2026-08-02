import { describe, expect, it } from 'vitest';
import { applyPatches } from 'immer';
import { applyCommand } from './commands';
import type { Command } from './commands';
import type { FurnitureId, HexColor, PlanDocument, RoomId, NodeId } from '../model';
import { DOCUMENT_COLORS, createEmptyDocument, validateDocumentErrors } from '../model';

const ROOM = 'r1' as RoomId;
const ITEM = 'f1' as FurnitureId;

// Derivada da paleta em vez de escrita como literal: nenhuma cor hexadecimal
// vive fora de `theme.ts` e `palette.ts` (spec 04, regra de lint).
const OFF_PALETTE = `${DOCUMENT_COLORS[0]!.slice(0, -1)}0` as HexColor;

function roomDoc(): PlanDocument {
  return applyCommand(createEmptyDocument(), {
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
}

const QUEEN: Command = {
  type: 'AddFurniture',
  payload: {
    furnitureId: ITEM,
    catalogId: 'bed-queen',
    name: 'Cama queen',
    width: 1580,
    depth: 1980,
    center: { x: 1600, y: 1250 },
    rotation: 0,
    clearance: 600,
  },
};

function withQueen(): PlanDocument {
  return applyCommand(roomDoc(), QUEEN).document;
}

describe('AddFurniture', () => {
  it('insere o móvel com o catalogId preenchido', () => {
    const doc = withQueen();

    expect(doc.furniture).toHaveLength(1);
    expect(doc.furniture[0]).toEqual({
      id: ITEM,
      catalogId: 'bed-queen',
      name: 'Cama queen',
      width: 1580,
      depth: 1980,
      center: { x: 1600, y: 1250 },
      rotation: 0,
      color: null,
      locked: false,
      clearance: 600,
    });
  });

  it('o documento resultante não tem issue de nível error', () => {
    expect(validateDocumentErrors(withQueen())).toEqual([]);
  });

  it('gera id quando o payload não traz', () => {
    const doc = applyCommand(roomDoc(), {
      type: 'AddFurniture',
      payload: { ...QUEEN.payload, furnitureId: undefined },
    } as Command).document;

    expect(doc.furniture[0]!.id).toMatch(/^f_/);
  });

  it('empilha no fim, que é a ordem de desenho', () => {
    const first = withQueen();
    const second = applyCommand(first, {
      type: 'AddFurniture',
      payload: { ...QUEEN.payload, furnitureId: 'f2' as FurnitureId, name: 'Criado-mudo' },
    } as Command).document;

    expect(second.furniture.map((item) => item.id)).toEqual(['f1', 'f2']);
  });

  it('grava outline para gabarito de circulação', () => {
    const doc = applyCommand(roomDoc(), {
      type: 'AddFurniture',
      payload: { ...QUEEN.payload, outline: true },
    } as Command).document;

    expect(doc.furniture[0]!.outline).toBe(true);
  });

  it.each([
    ['largura zero', { width: 0 }, 'INVALID_DIMENSION'],
    ['profundidade negativa', { depth: -10 }, 'INVALID_DIMENSION'],
    ['largura fracionária', { width: 1580.5 }, 'INVALID_DIMENSION'],
    ['circulação negativa', { clearance: -1 }, 'INVALID_DIMENSION'],
    ['rotação 360', { rotation: 360 }, 'INVALID_ROTATION'],
    ['rotação negativa', { rotation: -90 }, 'INVALID_ROTATION'],
    ['rotação fracionária', { rotation: 12.5 }, 'INVALID_ROTATION'],
    ['centro fracionário', { center: { x: 1600.4, y: 1250 } }, 'NON_INTEGER_COORDINATE'],
  ])('rejeita %s', (_label, override, code) => {
    const doc = roomDoc();
    const result = applyCommand(doc, {
      type: 'AddFurniture',
      payload: { ...QUEEN.payload, ...override },
    } as Command);

    expect(result.error?.code).toBe(code);
    expect(result.document).toBe(doc);
    expect(result.patchGroups).toEqual([]);
  });

  it('rejeita cor fora da paleta', () => {
    const result = applyCommand(roomDoc(), {
      type: 'AddFurniture',
      payload: { ...QUEEN.payload, color: OFF_PALETTE },
    } as Command);

    expect(result.error?.code).toBe('UNKNOWN_COLOR');
  });

  it('os patches inversos devolvem o documento original', () => {
    const doc = roomDoc();
    const result = applyCommand(doc, QUEEN);

    expect(applyPatches(result.document, result.inversePatchGroups[0]!)).toEqual(doc);
  });
});

describe('MoveFurniture', () => {
  it('move o centro', () => {
    const doc = applyCommand(withQueen(), {
      type: 'MoveFurniture',
      payload: { furnitureId: ITEM, center: { x: 900, y: 800 } },
    }).document;

    expect(doc.furniture[0]!.center).toEqual({ x: 900, y: 800 });
  });

  it('rejeita móvel travado', () => {
    const locked = applyCommand(withQueen(), {
      type: 'UpdateFurniture',
      payload: { furnitureId: ITEM, locked: true },
    }).document;

    const result = applyCommand(locked, {
      type: 'MoveFurniture',
      payload: { furnitureId: ITEM, center: { x: 900, y: 800 } },
    });

    expect(result.error?.code).toBe('FURNITURE_LOCKED');
    expect(result.document).toBe(locked);
  });

  it('rejeita id inexistente', () => {
    const result = applyCommand(withQueen(), {
      type: 'MoveFurniture',
      payload: { furnitureId: 'zzz' as FurnitureId, center: { x: 0, y: 0 } },
    });

    expect(result.error?.code).toBe('FURNITURE_NOT_FOUND');
  });

  it('rejeita centro fracionário', () => {
    const result = applyCommand(withQueen(), {
      type: 'MoveFurniture',
      payload: { furnitureId: ITEM, center: { x: 900.5, y: 800 } },
    });

    expect(result.error?.code).toBe('NON_INTEGER_COORDINATE');
  });

  it('os patches inversos devolvem o documento original', () => {
    const doc = withQueen();
    const result = applyCommand(doc, {
      type: 'MoveFurniture',
      payload: { furnitureId: ITEM, center: { x: 900, y: 800 } },
    });

    expect(applyPatches(result.document, result.inversePatchGroups[0]!)).toEqual(doc);
  });
});

describe('TransformFurniture', () => {
  const resize: Command = {
    type: 'TransformFurniture',
    payload: {
      furnitureId: ITEM,
      width: 1400,
      depth: 1900,
      rotation: 90,
      center: { x: 1500, y: 1200 },
    },
  };

  it('aplica dimensão, rotação e centro de uma vez', () => {
    const doc = applyCommand(withQueen(), resize).document;

    expect(doc.furniture[0]).toMatchObject({
      width: 1400,
      depth: 1900,
      rotation: 90,
      center: { x: 1500, y: 1200 },
    });
  });

  it('editar a dimensão não altera o catalogId nem o nome', () => {
    const doc = applyCommand(withQueen(), resize).document;

    expect(doc.furniture[0]!.catalogId).toBe('bed-queen');
    expect(doc.furniture[0]!.name).toBe('Cama queen');
  });

  it('rejeita móvel travado', () => {
    const locked = applyCommand(withQueen(), {
      type: 'UpdateFurniture',
      payload: { furnitureId: ITEM, locked: true },
    }).document;

    expect(applyCommand(locked, resize).error?.code).toBe('FURNITURE_LOCKED');
  });

  it('rejeita dimensão zero sem tocar no documento', () => {
    const doc = withQueen();
    const result = applyCommand(doc, {
      type: 'TransformFurniture',
      payload: { ...resize.payload, width: 0 },
    } as Command);

    expect(result.error?.code).toBe('INVALID_DIMENSION');
    expect(result.document).toBe(doc);
  });

  it('rejeita rotação fora de 0–359', () => {
    const result = applyCommand(withQueen(), {
      type: 'TransformFurniture',
      payload: { ...resize.payload, rotation: 400 },
    } as Command);

    expect(result.error?.code).toBe('INVALID_ROTATION');
  });

  it('os patches inversos devolvem o documento original', () => {
    const doc = withQueen();
    const result = applyCommand(doc, resize);

    expect(applyPatches(result.document, result.inversePatchGroups[0]!)).toEqual(doc);
  });
});

describe('UpdateFurniture', () => {
  it('altera nome, cor, circulação e trava', () => {
    const doc = applyCommand(withQueen(), {
      type: 'UpdateFurniture',
      payload: {
        furnitureId: ITEM,
        name: 'Cama do quarto',
        color: DOCUMENT_COLORS[2]!,
        clearance: 800,
        locked: true,
      },
    }).document;

    expect(doc.furniture[0]).toMatchObject({
      name: 'Cama do quarto',
      color: DOCUMENT_COLORS[2],
      clearance: 800,
      locked: true,
    });
  });

  it('campo ausente fica como estava', () => {
    const doc = applyCommand(withQueen(), {
      type: 'UpdateFurniture',
      payload: { furnitureId: ITEM, clearance: 0 },
    }).document;

    expect(doc.furniture[0]!.name).toBe('Cama queen');
    expect(doc.furniture[0]!.clearance).toBe(0);
  });

  /** Se `locked` bloqueasse `UpdateFurniture`, destravar seria impossível. */
  it('não é bloqueado por locked — é por aqui que se destrava', () => {
    const locked = applyCommand(withQueen(), {
      type: 'UpdateFurniture',
      payload: { furnitureId: ITEM, locked: true },
    }).document;

    const unlocked = applyCommand(locked, {
      type: 'UpdateFurniture',
      payload: { furnitureId: ITEM, locked: false },
    });

    expect(unlocked.error).toBeUndefined();
    expect(unlocked.document.furniture[0]!.locked).toBe(false);
  });

  it('rejeita cor fora da paleta', () => {
    const result = applyCommand(withQueen(), {
      type: 'UpdateFurniture',
      payload: { furnitureId: ITEM, color: OFF_PALETTE },
    });

    expect(result.error?.code).toBe('UNKNOWN_COLOR');
  });

  it('aceita cor nula', () => {
    const result = applyCommand(withQueen(), {
      type: 'UpdateFurniture',
      payload: { furnitureId: ITEM, color: null },
    });

    expect(result.error).toBeUndefined();
  });

  it('rejeita circulação negativa ou fracionária', () => {
    expect(
      applyCommand(withQueen(), {
        type: 'UpdateFurniture',
        payload: { furnitureId: ITEM, clearance: -1 },
      }).error?.code,
    ).toBe('INVALID_DIMENSION');

    expect(
      applyCommand(withQueen(), {
        type: 'UpdateFurniture',
        payload: { furnitureId: ITEM, clearance: 10.5 },
      }).error?.code,
    ).toBe('INVALID_DIMENSION');
  });

  it('rejeita id inexistente', () => {
    expect(
      applyCommand(withQueen(), {
        type: 'UpdateFurniture',
        payload: { furnitureId: 'zzz' as FurnitureId, name: 'x' },
      }).error?.code,
    ).toBe('FURNITURE_NOT_FOUND');
  });

  it('os patches inversos devolvem o documento original', () => {
    const doc = withQueen();
    const result = applyCommand(doc, {
      type: 'UpdateFurniture',
      payload: { furnitureId: ITEM, name: 'Outro', locked: true },
    });

    expect(applyPatches(result.document, result.inversePatchGroups[0]!)).toEqual(doc);
  });
});

describe('DeleteFurniture', () => {
  it('remove o móvel', () => {
    const doc = applyCommand(withQueen(), {
      type: 'DeleteFurniture',
      payload: { furnitureId: ITEM },
    }).document;

    expect(doc.furniture).toEqual([]);
  });

  /** A trava existe contra arraste acidental, não contra ação explícita. */
  it('exclui mesmo travado', () => {
    const locked = applyCommand(withQueen(), {
      type: 'UpdateFurniture',
      payload: { furnitureId: ITEM, locked: true },
    }).document;

    const result = applyCommand(locked, {
      type: 'DeleteFurniture',
      payload: { furnitureId: ITEM },
    });

    expect(result.error).toBeUndefined();
    expect(result.document.furniture).toEqual([]);
  });

  it('rejeita id inexistente', () => {
    expect(
      applyCommand(withQueen(), {
        type: 'DeleteFurniture',
        payload: { furnitureId: 'zzz' as FurnitureId },
      }).error?.code,
    ).toBe('FURNITURE_NOT_FOUND');
  });

  it('os patches inversos devolvem o documento original', () => {
    const doc = withQueen();
    const result = applyCommand(doc, {
      type: 'DeleteFurniture',
      payload: { furnitureId: ITEM },
    });

    expect(applyPatches(result.document, result.inversePatchGroups[0]!)).toEqual(doc);
  });
});

describe('duplicar como Batch de AddFurniture', () => {
  it('dois móveis duplicados produzem uma entrada só, com deslocamento de 200 mm', () => {
    const doc = applyCommand(withQueen(), {
      type: 'AddFurniture',
      payload: { ...QUEEN.payload, furnitureId: 'f2' as FurnitureId, name: 'Criado-mudo' },
    } as Command).document;

    const result = applyCommand(doc, {
      type: 'Batch',
      payload: {
        label: 'Duplicar',
        commands: doc.furniture.map((item, index) => ({
          type: 'AddFurniture' as const,
          payload: {
            furnitureId: `copy${index}` as FurnitureId,
            catalogId: item.catalogId,
            name: item.name,
            width: item.width,
            depth: item.depth,
            center: { x: item.center.x + 200, y: item.center.y + 200 },
            rotation: item.rotation,
            clearance: item.clearance,
          },
        })),
      },
    });

    expect(result.document.furniture).toHaveLength(4);
    expect(result.patchGroups).toHaveLength(2);
    expect(result.document.furniture[2]!.center).toEqual({ x: 1800, y: 1450 });
  });
});
