import { describe, expect, it } from 'vitest';
import { applyCommand, computeFurnitureArea, computeOccupancy } from '../commands';
import { createEmptyDocument } from './document';
import { validateDocument } from './validation';
import type {
  Degrees,
  FurnitureId,
  FurnitureItem,
  Millimeters,
  NodeId,
  PlanDocument,
  RoomId,
} from './types';

const ROOM = 'r1' as RoomId;

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

const mm = (value: number): Millimeters => value as Millimeters;
const deg = (value: number): Degrees => value as Degrees;

interface ItemSpec {
  readonly id: string;
  readonly name?: string;
  readonly width?: number;
  readonly depth?: number;
  readonly center?: { x: number; y: number };
  readonly rotation?: number;
  readonly outline?: boolean;
}

function item(spec: ItemSpec): FurnitureItem {
  return {
    id: spec.id as FurnitureId,
    catalogId: null,
    name: spec.name ?? 'Móvel',
    width: mm(spec.width ?? 1000),
    depth: mm(spec.depth ?? 600),
    center: {
      x: mm(spec.center?.x ?? 1600),
      y: mm(spec.center?.y ?? 1250),
    },
    rotation: deg(spec.rotation ?? 0),
    color: null,
    locked: false,
    clearance: mm(0),
    outline: spec.outline,
  };
}

function withFurniture(doc: PlanDocument, furniture: FurnitureItem[]): PlanDocument {
  return { ...doc, furniture };
}

function codes(doc: PlanDocument, code: string): string[][] {
  return validateDocument(doc)
    .filter((issue) => issue.code === code)
    .map((issue) => issue.ids);
}

describe('W3 — móvel fora de cômodo', () => {
  it('não acusa móvel inteiramente dentro', () => {
    const doc = withFurniture(roomDoc(), [item({ id: 'f1' })]);

    expect(codes(doc, 'W3')).toEqual([]);
  });

  /**
   * A implementação anterior só acusava o móvel totalmente fora, e a spec diz
   * "total ou parcialmente" — o caso parcial é justamente o erro comum: a cama
   * que não cabe e invade o corredor.
   */
  it('acusa móvel parcialmente fora', () => {
    const doc = withFurniture(roomDoc(), [
      item({ id: 'f1', center: { x: 3100, y: 1250 }, width: 1580, depth: 1980 }),
    ]);

    expect(codes(doc, 'W3')).toEqual([['f1']]);
  });

  it('acusa móvel totalmente fora', () => {
    const doc = withFurniture(roomDoc(), [item({ id: 'f1', center: { x: 9000, y: 9000 } })]);

    expect(codes(doc, 'W3')).toEqual([['f1']]);
  });

  /**
   * Regressão do risco levantado no plano: o snap a parede põe dois cantos
   * exatamente sobre a aresta, e sem fronteira inclusiva o mesmo móvel
   * encostado embaixo acusaria e encostado em cima não.
   */
  it('não acusa a mesma cama encostada em qualquer uma das quatro paredes', () => {
    const cases: [string, { x: number; y: number }, number][] = [
      ['cima', { x: 1600, y: 990 }, 0],
      ['baixo', { x: 1600, y: 1510 }, 180],
      ['esquerda', { x: 990, y: 1250 }, 270],
      ['direita', { x: 2210, y: 1250 }, 90],
    ];

    for (const [label, center, rotation] of cases) {
      const doc = withFurniture(roomDoc(), [
        item({ id: 'f1', width: 1580, depth: 1980, center, rotation }),
      ]);
      expect(codes(doc, 'W3'), label).toEqual([]);
    }
  });

  it('não acusa nada num documento sem cômodo', () => {
    const doc = withFurniture(createEmptyDocument(), [item({ id: 'f1' })]);

    expect(codes(doc, 'W3')).toEqual([]);
  });
});

describe('W4 — colisão entre móveis', () => {
  it('acusa dois móveis sobrepostos', () => {
    const doc = withFurniture(roomDoc(), [
      item({ id: 'f1', center: { x: 1600, y: 1250 } }),
      item({ id: 'f2', center: { x: 1900, y: 1250 } }),
    ]);

    expect(codes(doc, 'W4')).toEqual([['f1', 'f2']]);
  });

  it('não acusa dois móveis encostados lado a lado', () => {
    const doc = withFurniture(roomDoc(), [
      item({ id: 'f1', center: { x: 1000, y: 1250 } }),
      item({ id: 'f2', center: { x: 2000, y: 1250 } }),
    ]);

    expect(codes(doc, 'W4')).toEqual([]);
  });

  /**
   * O que a implementação por caixa envolvente errava: duas ripas paralelas a
   * 45°, afastadas 1131 mm perpendicularmente, não se tocam — mas as caixas
   * envolventes delas se cruzam em x e em y.
   */
  it('não acusa móveis em diagonal cujas caixas envolventes se cruzam', () => {
    const doc = withFurniture(roomDoc(), [
      item({ id: 'f1', width: 2000, depth: 200, rotation: 45, center: { x: 1200, y: 1200 } }),
      item({ id: 'f2', width: 2000, depth: 200, rotation: 45, center: { x: 2000, y: 400 } }),
    ]);

    expect(codes(doc, 'W4')).toEqual([]);
  });

  it('gabarito de circulação sobreposto a um móvel não colide', () => {
    const doc = withFurniture(roomDoc(), [
      item({ id: 'f1', center: { x: 1600, y: 1250 } }),
      item({
        id: 'f2',
        center: { x: 1600, y: 1250 },
        width: 1500,
        depth: 1500,
        outline: true,
      }),
    ]);

    expect(codes(doc, 'W4')).toEqual([]);
  });
});

describe('área ocupada e taxa de ocupação', () => {
  it('soma a área dos móveis contidos', () => {
    const doc = withFurniture(roomDoc(), [
      item({ id: 'f1', width: 1000, depth: 600, center: { x: 800, y: 500 } }),
      item({ id: 'f2', width: 500, depth: 400, center: { x: 2500, y: 2000 } }),
    ]);

    expect(computeFurnitureArea(doc, ROOM)).toBe(1000 * 600 + 500 * 400);
  });

  it('ignora móvel parcialmente fora', () => {
    const doc = withFurniture(roomDoc(), [
      item({ id: 'f1', width: 1580, depth: 1980, center: { x: 3100, y: 1250 } }),
    ]);

    expect(computeFurnitureArea(doc, ROOM)).toBe(0);
  });

  it('ignora gabarito de circulação', () => {
    const doc = withFurniture(roomDoc(), [
      item({ id: 'f1', width: 1500, depth: 1500, outline: true }),
    ]);

    expect(computeFurnitureArea(doc, ROOM)).toBe(0);
  });

  it('a taxa é a área ocupada sobre a área do cômodo', () => {
    const doc = withFurniture(roomDoc(), [item({ id: 'f1', width: 1600, depth: 1000 })]);

    expect(computeOccupancy(doc, ROOM)).toBeCloseTo(1_600_000 / 8_000_000, 9);
  });

  it('cômodo inexistente tem ocupação zero', () => {
    expect(computeOccupancy(roomDoc(), 'zzz' as RoomId)).toBe(0);
    expect(computeFurnitureArea(roomDoc(), 'zzz' as RoomId)).toBe(0);
  });

  it('cômodo com nó órfão não conta móvel nenhum', () => {
    const base = roomDoc();
    const broken: PlanDocument = {
      ...base,
      rooms: [{ ...base.rooms[0]!, loop: ['a', 'b', 'zzz'] as NodeId[] }],
      furniture: [item({ id: 'f1' })],
    };

    expect(computeFurnitureArea(broken, ROOM)).toBe(0);
  });
});
