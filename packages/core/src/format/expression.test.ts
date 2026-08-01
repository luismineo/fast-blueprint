import { describe, it, expect } from 'vitest';
import {
  degreesToRadians,
  formatAngle,
  parseLength,
  tryParseAngle,
  tryParseLength,
} from './format';

describe('expressão aritmética na entrada numérica', () => {
  it('158+40 resolve para 198 cm', () => {
    expect(tryParseLength('158+40')).toBe(1980);
  });

  it('cada termo carrega a própria unidade', () => {
    expect(tryParseLength('1,58+40')).toBe(1980);
    expect(tryParseLength('1,58m+40cm')).toBe(1980);
    expect(tryParseLength('1580mm+400mm')).toBe(1980);
  });

  it('subtração e cadeia longa', () => {
    expect(tryParseLength('320-15')).toBe(3050);
    expect(tryParseLength('3,20-0,15')).toBe(3050);
    expect(tryParseLength('100+100+100-50')).toBe(2500);
  });

  it('espaços em volta dos operadores não mudam o resultado', () => {
    expect(tryParseLength(' 158 + 40 ')).toBe(1980);
  });

  it('sinal negativo à frente é aceito', () => {
    expect(tryParseLength('-100')).toBe(-1000);
    expect(tryParseLength('-100+150')).toBe(500);
  });

  it('o arredondamento acontece na soma, não termo a termo', () => {
    // Três termos de 0,55 mm: somados dão 1,65 → 2. Arredondados antes de
    // somar dariam 1+1+1 = 3.
    expect(tryParseLength('0,55mm+0,55mm+0,55mm')).toBe(2);
  });

  it('expressão malformada devolve null', () => {
    expect(tryParseLength('158+')).toBeNull();
    expect(tryParseLength('158++40')).toBeNull();
    expect(tryParseLength('158+abc')).toBeNull();
    expect(tryParseLength('abc')).toBeNull();
    expect(tryParseLength('')).toBeNull();
    expect(tryParseLength('158*40')).toBeNull();
  });

  it('parseLength devolve 0 onde tryParseLength devolve null', () => {
    expect(parseLength('abc')).toBe(0);
    expect(parseLength('')).toBe(0);
    expect(parseLength('158+40')).toBe(1980);
  });
});

describe('tryParseAngle', () => {
  it('aceita graus inteiros e fracionários', () => {
    expect(tryParseAngle('90')).toBe(90);
    expect(tryParseAngle('90,5')).toBe(90.5);
    expect(tryParseAngle('0')).toBe(0);
  });

  it('normaliza para [0, 360)', () => {
    expect(tryParseAngle('360')).toBe(0);
    expect(tryParseAngle('450')).toBe(90);
    expect(tryParseAngle('-90')).toBe(270);
  });

  it('devolve null para o que não é número', () => {
    expect(tryParseAngle('')).toBeNull();
    expect(tryParseAngle('abc')).toBeNull();
    expect(tryParseAngle('90°')).toBeNull();
  });

  it('fecha o ciclo com formatAngle', () => {
    const degrees = tryParseAngle('90')!;
    expect(formatAngle(degreesToRadians(degrees))).toBe('90,0°');
  });
});
