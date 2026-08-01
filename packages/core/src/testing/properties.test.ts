import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { applyPatches } from 'immer';
import {
  arbDocument,
  arbLengthInput,
  arbSimplePolygon,
  commandsFor,
} from './arbitraries';
import { applyCommand } from '../commands';
import { DocumentStore } from '../history';
import { formatLength, parseLength } from '../format';
import { polygonArea, shoelaceArea } from '../geometry';
import { resolveSnap, type SnapContext } from '../snap';
import { validateDocumentErrors } from '../model';

const RUNS = { numRuns: 200 };

describe('property — geometria', () => {
  it('área por shoelace é igual à soma dos triângulos da triangulação por fan', () => {
    fc.assert(
      fc.property(arbSimplePolygon, (points) => {
        // Áreas **com sinal**: a identidade do leque é a própria decomposição
        // do shoelace. Somar valores absolutos só coincide em polígono convexo,
        // e `arbSimplePolygon` gera côncavos de propósito.
        let fan = 0;
        for (let i = 1; i < points.length - 1; i += 1) {
          fan += shoelaceArea([points[0]!, points[i]!, points[i + 1]!]);
        }
        expect(Math.abs(polygonArea(points) - Math.abs(fan))).toBeLessThan(1);
      }),
      RUNS,
    );
  });

  it('área é invariante a translação e a rotação de 90°', () => {
    fc.assert(
      fc.property(
        arbSimplePolygon,
        fc.integer({ min: -5000, max: 5000 }),
        (points, offset) => {
          const original = polygonArea(points);

          const translated = points.map((point) => ({
            x: point.x + offset,
            y: point.y + offset,
          }));
          expect(polygonArea(translated)).toBeCloseTo(original, 6);

          const rotated = points.map((point) => ({ x: -point.y, y: point.x }));
          expect(polygonArea(rotated)).toBeCloseTo(original, 6);
        },
      ),
      RUNS,
    );
  });
});

describe('property — comandos', () => {
  it('aplicar um comando e depois seus patches inversos devolve o documento original', () => {
    fc.assert(
      fc.property(
        arbDocument.chain((doc) =>
          commandsFor(doc).map((command) => ({ doc, command })),
        ),
        ({ doc, command }) => {
          const result = applyCommand(doc, command);
          if (result.error) return;

          let restored = result.document;
          for (let i = result.inversePatchGroups.length - 1; i >= 0; i -= 1) {
            restored = applyPatches(restored, result.inversePatchGroups[i]!);
          }

          expect(restored).toEqual(doc);
        },
      ),
      RUNS,
    );
  });

  it('nenhuma sequência de comandos produz dois nós com coordenadas idênticas (E6)', () => {
    fc.assert(
      fc.property(
        arbDocument.chain((doc) =>
          fc.array(commandsFor(doc), { minLength: 1, maxLength: 6 }).map((commands) => ({
            doc,
            commands,
          })),
        ),
        ({ doc, commands }) => {
          const store = new DocumentStore(doc);
          for (const command of commands) store.dispatch(command);

          const codes = validateDocumentErrors(store.current).map((issue) => issue.code);
          expect(codes).not.toContain('E6');
        },
      ),
      RUNS,
    );
  });

  it('n undos seguidos de n redos devolvem o mesmo documento', () => {
    fc.assert(
      fc.property(
        arbDocument.chain((doc) =>
          fc.array(commandsFor(doc), { minLength: 1, maxLength: 6 }).map((commands) => ({
            doc,
            commands,
          })),
        ),
        ({ doc, commands }) => {
          const store = new DocumentStore(doc);

          let applied = 0;
          for (const command of commands) {
            const before = store.current;
            store.dispatch(command);
            if (store.current !== before) applied += 1;
          }

          const after = store.current;
          for (let i = 0; i < applied; i += 1) store.undo();
          for (let i = 0; i < applied; i += 1) store.redo();

          expect(store.current).toEqual(after);
        },
      ),
      RUNS,
    );
  });

  it('nenhuma sequência de comandos deixa o documento com issue de nível error', () => {
    fc.assert(
      fc.property(
        arbDocument.chain((doc) =>
          fc.array(commandsFor(doc), { minLength: 1, maxLength: 6 }).map((commands) => ({
            doc,
            commands,
          })),
        ),
        ({ doc, commands }) => {
          const store = new DocumentStore(doc);
          for (const command of commands) store.dispatch(command);

          expect(validateDocumentErrors(store.current)).toEqual([]);
        },
      ),
      RUNS,
    );
  });
});

describe('property — snap', () => {
  const context = (overrides: Partial<SnapContext> = {}): SnapContext => ({
    nodes: [],
    edges: [],
    origin: null,
    gridSize: 100,
    scale: 1,
    shift: false,
    alt: false,
    ...overrides,
  });

  it('aplicar o resolvedor ao resultado de um snap devolve o mesmo ponto', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: -20_000, max: 20_000 }),
          y: fc.integer({ min: -20_000, max: 20_000 }),
        }),
        arbSimplePolygon,
        (point, polygon) => {
          const edges = polygon.map((from, index) => ({
            a: from,
            b: polygon[(index + 1) % polygon.length]!,
          }));
          const nodes = polygon.map((at, index) => ({
            id: `n_prop${index}` as never,
            x: at.x,
            y: at.y,
          }));

          const ctx = context({ edges, nodes });
          const first = resolveSnap(point, ctx);
          const second = resolveSnap(first.point, ctx);

          expect(second.point.x).toBeCloseTo(first.point.x, 6);
          expect(second.point.y).toBeCloseTo(first.point.y, 6);
        },
      ),
      RUNS,
    );
  });
});

describe('property — parse de medida', () => {
  it('parseLength do texto formatado devolve o valor na precisão de exibição', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 200_000 }), (millimeters) => {
        const rounded = Math.round(millimeters / 10) * 10;
        expect(parseLength(formatLength(rounded, 'cm'))).toBe(rounded);
      }),
      RUNS,
    );
  });

  it('toda entrada gerada resolve para um inteiro positivo de milímetros', () => {
    fc.assert(
      fc.property(arbLengthInput, (text) => {
        const value = parseLength(text);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThan(0);
      }),
      RUNS,
    );
  });
});
