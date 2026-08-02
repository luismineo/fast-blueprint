import { describe, expect, it } from 'vitest';
import { resolveFurnitureSnap, type FurnitureSnapContext } from './furnitureSnap';
import type { SnapEdge } from './snap';
import { obbCorners } from '../geometry';

/** Quarto 3200 × 2500, ciclo horário — as arestas na ordem do loop. */
const WALLS: SnapEdge[] = [
  { a: { x: 0, y: 0 }, b: { x: 3200, y: 0 } },
  { a: { x: 3200, y: 0 }, b: { x: 3200, y: 2500 } },
  { a: { x: 3200, y: 2500 }, b: { x: 0, y: 2500 } },
  { a: { x: 0, y: 2500 }, b: { x: 0, y: 0 } },
];

const SIZE = { width: 1000, depth: 600 };

function ctx(overrides: Partial<FurnitureSnapContext> = {}): FurnitureSnapContext {
  return { edges: WALLS, alt: false, ...overrides };
}

describe('snap a parede', () => {
  /**
   * O critério de aceitação da spec 03: a 100 mm encosta, a 200 mm não. A
   * distância é medida da **borda** do móvel à aresta, não do centro.
   */
  it('a 100 mm da parede encosta e alinha a rotação', () => {
    const result = resolveFurnitureSnap(
      { center: { x: 1600, y: 400 }, rotation: 0 },
      SIZE,
      ctx(),
    );

    expect(result.placement).toEqual({ center: { x: 1600, y: 300 }, rotation: 0 });
    expect(result.edge).toEqual(WALLS[0]);
  });

  it('a 200 mm da parede não encosta', () => {
    const result = resolveFurnitureSnap(
      { center: { x: 1600, y: 500 }, rotation: 0 },
      SIZE,
      ctx(),
    );

    expect(result.placement).toEqual({ center: { x: 1600, y: 500 }, rotation: 0 });
    expect(result.edge).toBeNull();
  });

  it('a face traseira fica sobre a aresta', () => {
    const result = resolveFurnitureSnap(
      { center: { x: 1600, y: 400 }, rotation: 0 },
      SIZE,
      ctx(),
    );

    const corners = obbCorners(result.placement.center, SIZE.width, SIZE.depth, result.placement.rotation);

    // Os dois primeiros cantos são a face traseira (borda em −depth).
    expect(corners[0]!.y).toBe(0);
    expect(corners[1]!.y).toBe(0);
  });

  it('alinha a rotação a cada uma das quatro paredes', () => {
    const cases: [string, { x: number; y: number }, number, { x: number; y: number }][] = [
      ['cima', { x: 1600, y: 350 }, 0, { x: 1600, y: 300 }],
      ['baixo', { x: 1600, y: 2150 }, 180, { x: 1600, y: 2200 }],
      ['esquerda', { x: 350, y: 1250 }, 270, { x: 300, y: 1250 }],
      ['direita', { x: 2850, y: 1250 }, 90, { x: 2900, y: 1250 }],
    ];

    for (const [label, from, rotation, center] of cases) {
      const result = resolveFurnitureSnap({ center: from, rotation: 0 }, SIZE, ctx());
      expect(result.placement, label).toEqual({ center, rotation });
    }
  });

  it('a profundidade cresce da parede para dentro do cômodo', () => {
    const result = resolveFurnitureSnap(
      { center: { x: 350, y: 1250 }, rotation: 0 },
      SIZE,
      ctx(),
    );
    const corners = obbCorners(
      result.placement.center,
      SIZE.width,
      SIZE.depth,
      result.placement.rotation,
    );

    // Fundo em x = 0 (a parede), frente em x = 600, dentro do cômodo.
    expect(Math.min(...corners.map((corner) => corner.x))).toBe(0);
    expect(Math.max(...corners.map((corner) => corner.x))).toBe(600);
  });

  it('mantém a posição ao longo da parede', () => {
    const result = resolveFurnitureSnap(
      { center: { x: 900, y: 380 }, rotation: 0 },
      SIZE,
      ctx(),
    );

    expect(result.placement.center.x).toBe(900);
  });

  it('a parede mais próxima vence', () => {
    // Perto do canto superior esquerdo, um pouco mais perto da de cima.
    const result = resolveFurnitureSnap(
      { center: { x: 340, y: 320 }, rotation: 0 },
      SIZE,
      ctx(),
    );

    expect(result.edge).toEqual(WALLS[0]);
    expect(result.placement.rotation).toBe(0);
  });

  it('Alt desliga', () => {
    const placement = { center: { x: 1600, y: 400 }, rotation: 45 };
    const result = resolveFurnitureSnap(placement, SIZE, ctx({ alt: true }));

    expect(result.placement).toEqual(placement);
    expect(result.edge).toBeNull();
  });

  it('sem aresta nenhuma devolve o que recebeu', () => {
    const placement = { center: { x: 1600, y: 400 }, rotation: 0 };
    const result = resolveFurnitureSnap(placement, SIZE, ctx({ edges: [] }));

    expect(result.placement).toEqual(placement);
    expect(result.edge).toBeNull();
  });

  it('ignora aresta degenerada', () => {
    const placement = { center: { x: 100, y: 100 }, rotation: 0 };
    const result = resolveFurnitureSnap(placement, SIZE, ctx({
      edges: [{ a: { x: 100, y: 0 }, b: { x: 100, y: 0 } }],
    }));

    expect(result.edge).toBeNull();
  });

  it('encosta numa parede diagonal com rotação inteira', () => {
    const diagonal: SnapEdge = { a: { x: 0, y: 0 }, b: { x: 3000, y: 3000 } };
    const result = resolveFurnitureSnap(
      { center: { x: 1400, y: 1600 }, rotation: 0 },
      SIZE,
      ctx({ edges: [diagonal] }),
    );

    expect(result.edge).toEqual(diagonal);
    expect(result.placement.rotation).toBe(45);
    expect(Number.isInteger(result.placement.center.x)).toBe(true);
    expect(Number.isInteger(result.placement.center.y)).toBe(true);
  });

  it('encostar duas vezes seguidas devolve a mesma posição', () => {
    const once = resolveFurnitureSnap(
      { center: { x: 1600, y: 400 }, rotation: 0 },
      SIZE,
      ctx(),
    );
    const twice = resolveFurnitureSnap(once.placement, SIZE, ctx());

    expect(twice.placement).toEqual(once.placement);
  });
});
