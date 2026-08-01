import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CONFIG,
  resolveSnap,
  type SnapContext,
  type SnapEdge,
  type SnapNode,
} from './snap';
import type { NodeId } from '../model';

function ctx(overrides: Partial<SnapContext> = {}): SnapContext {
  return {
    nodes: [],
    edges: [],
    origin: null,
    gridSize: 100,
    scale: 1, // 1 px/mm → tolerâncias em mm = tolerâncias em px
    shift: false,
    alt: false,
    ...overrides,
  };
}

const node = (id: string, x: number, y: number): SnapNode => ({
  id: id as NodeId,
  x,
  y,
});

/** Aresta horizontal longe da origem, para não colidir com outras restrições. */
const horizontal: SnapEdge = { a: { x: 0, y: 1000 }, b: { x: 2000, y: 1000 } };

describe('Classe 1 — ponto médio de aresta', () => {
  it('preenche targets mas deixa merged = null', () => {
    const result = resolveSnap({ x: 1002, y: 1003 }, ctx({ edges: [horizontal] }));

    expect(result.point).toEqual({ x: 1000, y: 1000 });
    expect(result.merged).toBeNull();
    expect(result.targets).toHaveLength(1);
    expect(result.targets[0]!.kind).toBe('midpoint');
  });

  it('nó existente vence o ponto médio quando está mais perto', () => {
    const result = resolveSnap(
      { x: 1005, y: 1000 },
      ctx({ edges: [horizontal], nodes: [node('n1', 1006, 1000)] }),
    );

    expect(result.merged).toBe('n1');
    expect(result.point).toEqual({ x: 1006, y: 1000 });
  });

  it('ponto médio vence o nó quando está mais perto', () => {
    const result = resolveSnap(
      { x: 1002, y: 1000 },
      ctx({ edges: [horizontal], nodes: [node('n1', 1020, 1000)] }),
    );

    expect(result.merged).toBeNull();
    expect(result.targets[0]!.kind).toBe('midpoint');
  });

  it('ponto médio fora da tolerância não dispara', () => {
    const result = resolveSnap({ x: 1000, y: 1500 }, ctx({ edges: [horizontal] }));

    expect(result.targets.some((t) => t.kind === 'midpoint')).toBe(false);
  });
});

describe('Classe 2 — alinhamento com nó existente', () => {
  it('alinha na horizontal do nó de referência e nomeia o nó na guia', () => {
    const result = resolveSnap(
      { x: 5000, y: 1003 },
      ctx({ nodes: [node('ref', 0, 1000)] }),
    );

    expect(result.point.y).toBe(1000);
    expect(result.point.x).toBe(5000);
    const target = result.targets.find((t) => t.kind === 'alignment');
    expect(target).toBeDefined();
    expect(target).toMatchObject({ nodeId: 'ref', from: { x: 0, y: 1000 } });
  });

  it('alinha na vertical do nó de referência', () => {
    const result = resolveSnap(
      { x: 1004, y: 5000 },
      ctx({ nodes: [node('ref', 1000, 0)] }),
    );

    expect(result.point.x).toBe(1000);
  });

  it('45° só entra com Shift', () => {
    const semShift = resolveSnap(
      { x: 3003, y: 3000 },
      ctx({ nodes: [node('ref', 0, 0)] }),
    );
    expect(semShift.targets.some((t) => t.kind === 'alignment')).toBe(false);

    const comShift = resolveSnap(
      { x: 3003, y: 3000 },
      ctx({ nodes: [node('ref', 0, 0)], shift: true }),
    );
    expect(comShift.targets.some((t) => t.kind === 'alignment')).toBe(true);
  });
});

describe('Classe 2 — projeção sobre aresta e extensão', () => {
  it('pé da projeção dentro do segmento é aresta', () => {
    const result = resolveSnap({ x: 500, y: 1004 }, ctx({ edges: [horizontal] }));

    expect(result.point).toEqual({ x: 500, y: 1000 });
    expect(result.targets[0]!.kind).toBe('edge');
  });

  it('pé da projeção fora do segmento é extensão', () => {
    const result = resolveSnap({ x: 3000, y: 1004 }, ctx({ edges: [horizontal] }));

    expect(result.point.y).toBe(1000);
    expect(result.targets[0]!.kind).toBe('extension');
  });

  it('aresta tem prioridade sobre extensão', () => {
    const other: SnapEdge = { a: { x: 5000, y: 1000 }, b: { x: 6000, y: 1000 } };
    const result = resolveSnap(
      { x: 500, y: 1004 },
      ctx({ edges: [horizontal, other] }),
    );

    expect(result.targets[0]!.kind).toBe('edge');
  });
});

describe('Classe 2 — composição de restrições', () => {
  it('duas restrições transversais interceptam', () => {
    // Vertical curta, para que seu ponto médio (400, 300) fique longe do
    // cursor: a Classe 1 é exclusiva e engoliria o caso.
    const vertical: SnapEdge = { a: { x: 400, y: 0 }, b: { x: 400, y: 600 } };
    const result = resolveSnap(
      { x: 404, y: 1004 },
      ctx({ edges: [horizontal, vertical] }),
    );

    expect(result.point).toEqual({ x: 400, y: 1000 });
    expect(result.targets).toHaveLength(2);
  });

  it('duas restrições com ângulo menor que 15° descartam a de menor prioridade', () => {
    // Eixo horizontal a partir da origem (prioridade 1) e alinhamento
    // horizontal com um nó de referência (prioridade 2): paralelos, 0°.
    const result = resolveSnap(
      { x: 2000, y: 3 },
      ctx({ origin: { x: 0, y: 0 }, nodes: [node('ref', 0, 6)] }),
    );

    expect(result.targets).toHaveLength(1);
    expect(result.targets[0]!.kind).toBe('axis');
    expect(result.point.y).toBe(0);
  });

  it('eixo tem prioridade sobre alinhamento quando as duas disparam', () => {
    const result = resolveSnap(
      { x: 2000, y: 4 },
      ctx({ origin: { x: 0, y: 0 }, nodes: [node('ref', 3000, 2000)] }),
    );

    expect(result.targets[0]!.kind).toBe('axis');
  });

  it('interseção dentro da tolerância é usada', () => {
    const result = resolveSnap(
      { x: 4, y: 1004 },
      ctx({ origin: { x: 0, y: 0 }, nodes: [node('ref', 3000, 1000)] }),
    );

    expect(result.point).toEqual({ x: 0, y: 1000 });
    expect(result.targets).toHaveLength(2);
  });

  it('interseção longe demais do cursor projeta sobre a de maior prioridade', () => {
    // Mesma geometria do caso anterior: a interseção fica a ~5,7 mm do cursor.
    // Apertar a tolerância é o que separa os dois ramos — com as retas de eixo
    // e alinhamento presas a múltiplos de 45°, uma interseção naturalmente
    // distante exigiria ângulo abaixo de 15°, que a regra anterior já descarta.
    const strict = { ...DEFAULT_CONFIG, intersectionToleranceMm: 2 };
    const result = resolveSnap(
      { x: 4, y: 1004 },
      ctx({ origin: { x: 0, y: 0 }, nodes: [node('ref', 3000, 1000)] }),
      strict,
    );

    expect(result.point).toEqual({ x: 0, y: 1004 });
    expect(result.targets).toHaveLength(1);
    expect(result.targets[0]!.kind).toBe('axis');
  });
});

describe('Modificadores e fallback', () => {
  it('Alt devolve o ponto de entrada mesmo com aresta e nó por perto', () => {
    const result = resolveSnap(
      { x: 1002, y: 1003 },
      ctx({ edges: [horizontal], nodes: [node('n1', 1000, 1000)], alt: true }),
    );

    expect(result.point).toEqual({ x: 1002, y: 1003 });
    expect(result.targets).toEqual([]);
    expect(result.merged).toBeNull();
  });

  it('grid só entra quando nenhuma restrição de reta dispara', () => {
    const semRestricao = resolveSnap({ x: 1003, y: 2002 }, ctx());
    expect(semRestricao.point).toEqual({ x: 1000, y: 2000 });
    expect(semRestricao.targets).toEqual([]);

    const comAresta = resolveSnap({ x: 503, y: 1004 }, ctx({ edges: [horizontal] }));
    expect(comAresta.point.y).toBe(1000);
    expect(comAresta.point.x).toBe(503);
  });

  it('snap é idempotente: reaplicar sobre o resultado devolve o mesmo ponto', () => {
    const context = ctx({
      edges: [horizontal],
      nodes: [node('ref', 0, 1000)],
      origin: { x: 0, y: 0 },
    });

    const first = resolveSnap({ x: 504, y: 1003 }, context);
    const second = resolveSnap(first.point, context);

    expect(second.point).toEqual(first.point);
  });
});
