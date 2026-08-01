import { describe, it, expect } from 'vitest';
import {
  shoelaceArea,
  polygonArea,
  isClockwise,
  orientLoop,
  edgeLength,
  centroid,
  pointInPolygon,
  projectPointOnLine,
  closestPointOnSegment,
  snapAngle,
  snapToGrid,
  pointAtDistance,
  angle,
} from './geometry';

describe('geometry', () => {
  describe('shoelaceArea', () => {
    it('retângulo 3200x2500 = 8.000.000 mm²', () => {
      const rect = [
        { x: 0, y: 0 },
        { x: 3200, y: 0 },
        { x: 3200, y: 2500 },
        { x: 0, y: 2500 },
      ];
      // Horário com Y para baixo: (0,0)→(3200,0)→(3200,2500)→(0,2500)
      // Årea: (0*0 + 3200*2500 + 3200*2500 + 0*0 - 0*3200 - 0*3200 - 2500*0 - 2500*0) / 2
      // = (0 + 8.000.000 + 8.000.000 + 0 - 0 - 0 - 0 - 0) / 2 = 8.000.000
      expect(shoelaceArea(rect)).toBe(8_000_000);
    });

    it('ciclo anti-horário retorna área negativa', () => {
      const rect = [
        { x: 0, y: 0 },
        { x: 0, y: 2500 },
        { x: 3200, y: 2500 },
        { x: 3200, y: 0 },
      ];
      expect(shoelaceArea(rect)).toBe(-8_000_000);
    });

    it('triângulo retângulo 300x400', () => {
      const tri = [
        { x: 0, y: 0 },
        { x: 300, y: 0 },
        { x: 0, y: 400 },
      ];
      // Área = 300 * 400 / 2 = 60000
      expect(Math.abs(shoelaceArea(tri))).toBe(60_000);
    });
  });

  describe('polygonArea', () => {
    it('retorna valor absoluto', () => {
      const rect = [
        { x: 0, y: 0 },
        { x: 3200, y: 0 },
        { x: 3200, y: 2500 },
        { x: 0, y: 2500 },
      ];
      expect(polygonArea(rect)).toBe(8_000_000);
    });
  });

  describe('isClockwise', () => {
    it('horário retorna true', () => {
      const cw = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ];
      expect(isClockwise(cw)).toBe(true);
    });

    it('anti-horário retorna false', () => {
      const ccw = [
        { x: 0, y: 0 },
        { x: 0, y: 100 },
        { x: 100, y: 100 },
        { x: 100, y: 0 },
      ];
      expect(isClockwise(ccw)).toBe(false);
    });
  });

  describe('orientLoop', () => {
    it('normaliza anti-horário para horário', () => {
      const ccw = [
        { x: 0, y: 0 },
        { x: 0, y: 100 },
        { x: 100, y: 100 },
        { x: 100, y: 0 },
      ];
      const cw = orientLoop(ccw);
      expect(isClockwise(cw)).toBe(true);
      expect(cw).toHaveLength(4);
    });

    it('não altera ciclo já horário', () => {
      const cw = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ];
      expect(orientLoop(cw)).toEqual(cw);
    });
  });

  describe('edgeLength', () => {
    it('distância horizontal', () => {
      expect(edgeLength({ x: 0, y: 0 }, { x: 3200, y: 0 })).toBe(3200);
    });

    it('distância diagonal 3-4-5', () => {
      expect(edgeLength({ x: 0, y: 0 }, { x: 3000, y: 4000 })).toBe(5000);
    });
  });

  describe('centroid', () => {
    it('centro do retângulo', () => {
      const rect = [
        { x: 0, y: 0 },
        { x: 3200, y: 0 },
        { x: 3200, y: 2500 },
        { x: 0, y: 2500 },
      ];
      const c = centroid(rect);
      expect(c.x).toBe(1600);
      expect(c.y).toBe(1250);
    });
  });

  describe('pointInPolygon', () => {
    const rect = [
      { x: 0, y: 0 },
      { x: 3200, y: 0 },
      { x: 3200, y: 2500 },
      { x: 0, y: 2500 },
    ];

    it('ponto dentro', () => {
      expect(pointInPolygon({ x: 1600, y: 1250 }, rect)).toBe(true);
    });

    it('ponto fora', () => {
      expect(pointInPolygon({ x: 5000, y: 5000 }, rect)).toBe(false);
    });

    it('ponto na borda superior', () => {
      expect(pointInPolygon({ x: 1600, y: 0 }, rect)).toBe(true);
    });
  });

  describe('projectPointOnLine', () => {
    it('projeção no meio', () => {
      const r = projectPointOnLine({ x: 50, y: 10 }, { x: 0, y: 0 }, { x: 100, y: 0 });
      expect(r.t).toBeCloseTo(0.5);
      expect(r.point.x).toBeCloseTo(50);
      expect(r.point.y).toBeCloseTo(0);
    });
  });

  describe('closestPointOnSegment', () => {
    it('ponto além do fim clampa', () => {
      const r = closestPointOnSegment({ x: 200, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 });
      expect(r.t).toBe(1);
      expect(r.point.x).toBe(100);
    });
  });

  describe('snapAngle', () => {
    it('87° sem shift → 90°', () => {
      const rad = (87 * Math.PI) / 180;
      expect(snapAngle(rad, false)).toBeCloseTo(Math.PI / 2);
    });

    it('46° com shift → 45°', () => {
      const rad = (46 * Math.PI) / 180;
      expect(snapAngle(rad, true)).toBeCloseTo(Math.PI / 4);
    });
  });

  describe('snapToGrid', () => {
    it('arredonda para múltiplo de 100', () => {
      expect(snapToGrid(148, 100)).toBe(100);
      expect(snapToGrid(151, 100)).toBe(200);
    });
  });

  describe('pointAtDistance', () => {
    it('direção 0° (direita), 100mm', () => {
      const p = pointAtDistance({ x: 0, y: 0 }, 0, 100);
      expect(p.x).toBeCloseTo(100);
      expect(p.y).toBeCloseTo(0);
    });

    it('direção 90° (baixo), 100mm', () => {
      const p = pointAtDistance({ x: 0, y: 0 }, Math.PI / 2, 100);
      expect(p.x).toBeCloseTo(0);
      expect(p.y).toBeCloseTo(100);
    });
  });

  describe('angle', () => {
    it('horizontal direita = 0', () => {
      expect(angle({ x: 0, y: 0 }, { x: 100, y: 0 })).toBeCloseTo(0);
    });

    it('vertical baixo = π/2', () => {
      expect(angle({ x: 0, y: 0 }, { x: 0, y: 100 })).toBeCloseTo(Math.PI / 2);
    });
  });
});