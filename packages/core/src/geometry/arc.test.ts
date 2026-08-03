import { describe, expect, it } from 'vitest';
import { writeArcPoints, type Point } from './geometry';

function makeBuffer(size: number): Point[] {
  return Array.from({ length: size }, () => ({ x: 0, y: 0 }));
}

describe('writeArcPoints', () => {
  it('círculo completo escreve 24 pontos, um a cada 15°', () => {
    const out = makeBuffer(24);
    const count = writeArcPoints(out, 0, 0, 0, 10, 10, 0, 2 * Math.PI);

    expect(count).toBe(24);
    expect(out[0]).toEqual({ x: 10, y: 0 });
    // 15° de varredura: o ponto seguinte já não coincide com o primeiro.
    expect(Math.hypot(out[1]!.x - out[0]!.x, out[1]!.y - out[0]!.y)).toBeGreaterThan(1);
  });

  it('o ponto em startAngle e o ponto em startAngle + 2π coincidem dentro de 1 mm', () => {
    // `writeArcPoints` não fecha o anel sozinho (`02-unidades-e-geometria.md`
    // § Achatamento de arco): o círculo completo escreve 24 pontos únicos, e
    // é o chamador (o pass de render) quem repete o primeiro como último para
    // fechar o traço. Isso só é uma forma válida de fechar porque o ponto de
    // uma volta completa (2π) coincide com o de partida — é essa propriedade
    // que este teste comprova.
    const start: Point[] = [{ x: 0, y: 0 }];
    const oneFullTurnLater: Point[] = [{ x: 0, y: 0 }];
    writeArcPoints(start, 0, 100, 200, 50, 30, 0, 0, 1);
    writeArcPoints(oneFullTurnLater, 0, 100, 200, 50, 30, 2 * Math.PI, 2 * Math.PI, 1);

    expect(Math.hypot(oneFullTurnLater[0]!.x - start[0]!.x, oneFullTurnLater[0]!.y - start[0]!.y)).toBeLessThan(1);
  });

  it('respeita raios distintos por eixo — elipse, não círculo', () => {
    const out = makeBuffer(4);
    writeArcPoints(out, 0, 0, 0, 20, 10, 0, 2 * Math.PI, 4);

    expect(out[0]).toEqual({ x: 20, y: 0 });
    expect(out[1]!.x).toBeCloseTo(0, 10);
    expect(out[1]!.y).toBeCloseTo(10, 10);
  });

  it('arco parcial: um segmento a cada 15°, no mínimo quatro', () => {
    const quarter = makeBuffer(6);
    expect(writeArcPoints(quarter, 0, 0, 0, 10, 10, 0, Math.PI / 2)).toBe(6);

    const tiny = makeBuffer(4);
    expect(writeArcPoints(tiny, 0, 0, 0, 10, 10, 0, 0.01)).toBe(4);
  });

  it('escreve a partir de outOffset sem tocar posições anteriores do buffer', () => {
    const out = makeBuffer(6);
    out[0] = { x: -1, y: -1 };
    writeArcPoints(out, 2, 0, 0, 5, 5, 0, Math.PI / 2, 4);

    expect(out[0]).toEqual({ x: -1, y: -1 });
    expect(out[2]).toEqual({ x: 5, y: 0 });
  });

  it('segments explícito sobrescreve o cálculo por varredura', () => {
    const out = makeBuffer(3);
    expect(writeArcPoints(out, 0, 0, 0, 10, 10, 0, 2 * Math.PI, 3)).toBe(3);
  });
});
