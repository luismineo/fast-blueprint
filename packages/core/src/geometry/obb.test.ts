import { describe, expect, it } from 'vitest';
import {
  containment,
  convexIntersection,
  obbCorners,
  polygonArea,
  satOverlap,
  type Point,
} from './geometry';

/** Retângulo 3200 × 2500 na origem, no sentido horário (Y para baixo). */
const ROOM: Point[] = [
  { x: 0, y: 0 },
  { x: 3200, y: 0 },
  { x: 3200, y: 2500 },
  { x: 0, y: 2500 },
];

describe('obbCorners', () => {
  it('sem rotação devolve o retângulo alinhado aos eixos', () => {
    expect(obbCorners({ x: 1000, y: 1000 }, 1580, 1980, 0)).toEqual([
      { x: 210, y: 10 },
      { x: 1790, y: 10 },
      { x: 1790, y: 1990 },
      { x: 210, y: 1990 },
    ]);
  });

  it('os dois primeiros cantos são a face traseira, em −depth', () => {
    const corners = obbCorners({ x: 0, y: 0 }, 1580, 1980, 0);

    expect(corners[0]!.y).toBe(-990);
    expect(corners[1]!.y).toBe(-990);
    expect(corners[2]!.y).toBe(990);
    expect(corners[3]!.y).toBe(990);
  });

  it('rotação de 90° troca as dimensões em tela', () => {
    const corners = obbCorners({ x: 0, y: 0 }, 1000, 600, 90);
    const xs = corners.map((corner) => corner.x);
    const ys = corners.map((corner) => corner.y);

    expect(Math.max(...xs) - Math.min(...xs)).toBe(600);
    expect(Math.max(...ys) - Math.min(...ys)).toBe(1000);
  });

  it('devolve coordenadas inteiras mesmo em ângulo qualquer', () => {
    for (const corner of obbCorners({ x: 0, y: 0 }, 1580, 1980, 37)) {
      expect(Number.isInteger(corner.x)).toBe(true);
      expect(Number.isInteger(corner.y)).toBe(true);
    }
  });
});

describe('satOverlap', () => {
  it('detecta sobreposição entre retângulos rotacionados 30° e 60° com centros a 400 mm', () => {
    const a = obbCorners({ x: 0, y: 0 }, 1000, 600, 30);
    const b = obbCorners({ x: 400, y: 0 }, 1000, 600, 60);

    expect(satOverlap(a, b)).toBe(true);
  });

  it('não acusa os mesmos retângulos afastados', () => {
    const a = obbCorners({ x: 0, y: 0 }, 1000, 600, 30);
    const b = obbCorners({ x: 2000, y: 0 }, 1000, 600, 60);

    expect(satOverlap(a, b)).toBe(false);
  });

  it('é simétrico', () => {
    const a = obbCorners({ x: 0, y: 0 }, 1000, 600, 30);
    const b = obbCorners({ x: 400, y: 0 }, 1000, 600, 60);

    expect(satOverlap(a, b)).toBe(satOverlap(b, a));
  });

  /**
   * Dois móveis encostados lado a lado são o arranjo normal de um quarto
   * pequeno. Contato exato não é colisão.
   */
  it('não acusa dois retângulos que apenas se encostam', () => {
    const a = obbCorners({ x: 0, y: 0 }, 1000, 600, 0);
    const b = obbCorners({ x: 1000, y: 0 }, 1000, 600, 0);

    expect(satOverlap(a, b)).toBe(false);
  });

  /**
   * O caso que a implementação por caixa envolvente errava: as caixas se
   * cruzam, os retângulos não se tocam.
   */
  it('não acusa retângulos em diagonal cujas caixas envolventes se cruzam', () => {
    const a = obbCorners({ x: 0, y: 0 }, 2000, 200, 45);
    const b = obbCorners({ x: 1200, y: -1200 }, 2000, 200, 45);

    expect(satOverlap(a, b)).toBe(false);
  });
});

describe('containment', () => {
  it('quatro cantos dentro é contido', () => {
    expect(containment(obbCorners({ x: 1600, y: 1250 }, 1580, 1980, 0), ROOM)).toBe('inside');
  });

  it('alguns cantos fora é parcial', () => {
    expect(containment(obbCorners({ x: 3100, y: 1250 }, 1580, 1980, 0), ROOM)).toBe('partial');
  });

  it('nenhum canto dentro é fora', () => {
    expect(containment(obbCorners({ x: 9000, y: 9000 }, 1580, 1980, 0), ROOM)).toBe('outside');
  });

  /**
   * A regressão que a simulação do ray casting achou antes de qualquer código
   * (`01-modelo-de-dominio.md` § Invariantes): com o teste padrão, o ponto
   * (1000, 0) cai dentro e (1000, 2500) cai fora. O snap a parede põe dois
   * cantos exatamente sobre a aresta, então a mesma cama encostada em cima
   * ficaria contida e encostada embaixo dispararia W3.
   */
  it('a mesma cama encostada nas quatro paredes fica contida nas quatro', () => {
    const cases: [string, Point, number][] = [
      ['parede de cima', { x: 1600, y: 990 }, 0],
      ['parede de baixo', { x: 1600, y: 1510 }, 180],
      ['parede da esquerda', { x: 990, y: 1250 }, 270],
      ['parede da direita', { x: 2210, y: 1250 }, 90],
    ];

    for (const [label, center, rotation] of cases) {
      const corners = obbCorners(center, 1580, 1980, rotation);
      expect(containment(corners, ROOM), label).toBe('inside');
    }
  });

  it('ponto exatamente sobre cada aresta conta como dentro', () => {
    const onEachWall: Point[] = [
      { x: 1000, y: 0 },
      { x: 3200, y: 1000 },
      { x: 1000, y: 2500 },
      { x: 0, y: 1000 },
    ];

    expect(containment(onEachWall, ROOM)).toBe('inside');
  });

  /**
   * Parede em diagonal: o arredondamento para milímetro inteiro pode tirar o
   * canto da reta em até meio milímetro por eixo. (1501, 500) está a 0,32 mm
   * da aresta que vai de (0,0) a (3000,1000), do lado de fora.
   */
  it('tolera o arredondamento de milímetro sobre uma aresta diagonal', () => {
    const diagonal: Point[] = [
      { x: 0, y: 0 },
      { x: 3000, y: 1000 },
      { x: 3000, y: 4000 },
      { x: 0, y: 4000 },
    ];

    expect(containment([{ x: 1500, y: 500 }], diagonal)).toBe('inside');
    expect(containment([{ x: 1501, y: 500 }], diagonal)).toBe('inside');
    expect(containment([{ x: 1600, y: 500 }], diagonal)).toBe('outside');
  });
});

describe('convexIntersection', () => {
  it('devolve a região comum de dois retângulos sobrepostos', () => {
    const a: Point[] = [
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
      { x: 1000, y: 1000 },
      { x: 0, y: 1000 },
    ];
    const b: Point[] = [
      { x: 600, y: 600 },
      { x: 1600, y: 600 },
      { x: 1600, y: 1600 },
      { x: 600, y: 1600 },
    ];

    expect(polygonArea(convexIntersection(a, b))).toBeCloseTo(400 * 400, 6);
  });

  it('devolve vazio para retângulos disjuntos', () => {
    const a = obbCorners({ x: 0, y: 0 }, 1000, 600, 0);
    const b = obbCorners({ x: 5000, y: 0 }, 1000, 600, 0);

    expect(convexIntersection(a, b)).toEqual([]);
  });

  it('a interseção de um retângulo consigo mesmo tem a área dele', () => {
    const a = obbCorners({ x: 200, y: -300 }, 1580, 1980, 30);

    expect(polygonArea(convexIntersection(a, a))).toBeCloseTo(polygonArea(a), 3);
  });

  it('a interseção de retângulos girados é menor que a de cada um', () => {
    const a = obbCorners({ x: 0, y: 0 }, 1000, 600, 30);
    const b = obbCorners({ x: 400, y: 0 }, 1000, 600, 60);
    const common = polygonArea(convexIntersection(a, b));

    expect(common).toBeGreaterThan(0);
    expect(common).toBeLessThan(polygonArea(a));
  });
});
