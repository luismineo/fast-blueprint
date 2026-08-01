import { describe, it, expect } from 'vitest';
import { parseLength, formatLength, formatArea, formatAngle } from './format';

describe('format', () => {
  describe('parseLength', () => {
    it('320 → 3200 (cm sem separador)', () => {
      expect(parseLength('320')).toBe(3200);
    });

    it('3,20 → 3200 (m, vírgula)', () => {
      expect(parseLength('3,20')).toBe(3200);
    });

    it('3.20 → 3200 (m, ponto)', () => {
      expect(parseLength('3.20')).toBe(3200);
    });

    it('3200mm → 3200 (mm explícito)', () => {
      expect(parseLength('3200mm')).toBe(3200);
    });

    it('320cm → 3200 (cm explícito)', () => {
      expect(parseLength('320cm')).toBe(3200);
    });

    it('3.2m → 3200 (m explícito)', () => {
      expect(parseLength('3.2m')).toBe(3200);
    });

    it('string vazia → 0', () => {
      expect(parseLength('')).toBe(0);
    });

    it('número inválido → 0', () => {
      expect(parseLength('abc')).toBe(0);
    });
  });

  describe('formatLength', () => {
    it('3200 mm → "3,20 m"', () => {
      expect(formatLength(3200, 'm')).toBe('3,20 m');
    });

    it('3200 mm → "320 cm"', () => {
      expect(formatLength(3200, 'cm')).toBe('320 cm');
    });
  });

  describe('formatArea', () => {
    it('8.000.000 → "8,00 m²"', () => {
      expect(formatArea(8_000_000)).toBe('8,00 m²');
    });

    it('12_250_000 → "12,25 m²"', () => {
      expect(formatArea(12_250_000)).toBe('12,25 m²');
    });
  });

  describe('formatAngle', () => {
    it('π/2 → "90,0°"', () => {
      expect(formatAngle(Math.PI / 2)).toBe('90,0°');
    });

    it('0 → "0,0°"', () => {
      expect(formatAngle(0)).toBe('0,0°');
    });
  });
});