import { describe, it, expect } from 'vitest';
import type { PlanDocument, Node, Room } from './types';
import { validateDocument, validateDocumentErrors } from './validation';
import { createEmptyDocument } from './document';
import { deg, furnitureId, mm, nodeId, openingId, roomId, wallId } from '../testing/ids';

function makeDoc(overrides: Partial<PlanDocument> = {}): PlanDocument {
  const base = createEmptyDocument();
  return { ...base, ...overrides };
}

function makeNode(
  id: string,
  x: number,
  y: number,
): Node {
  return { id: id as Node['id'], x: x as Node['x'], y: y as Node['y'] };
}

function makeRoom(
  id: string,
  loop: string[],
  name = 'Test',
): Room {
  return {
    id: id as Room['id'],
    name,
    loop: loop as Room['loop'],
    color: null,
    includeInUsableArea: true,
  };
}

describe('validateDocument', () => {
  it('documento vazio retorna zero issues', () => {
    const doc = createEmptyDocument();
    const issues = validateDocument(doc);
    expect(issues).toEqual([]);
  });

  describe('E1 — coordenadas inteiras', () => {
    it('nó com coordenadas inteiras não gera erro', () => {
      const doc = makeDoc({
        nodes: [makeNode('n1', 0, 3200)],
      });
      const errors = validateDocumentErrors(doc);
      expect(errors).toEqual([]);
    });

    it('nó com coordenada float gera E1', () => {
      const doc = makeDoc({
        nodes: [
          { id: 'n1' as Node['id'], x: 1.5, y: 3200 },
        ] as Node[],
      });
      const issues = validateDocument(doc);
      expect(issues.some((i) => i.code === 'E1')).toBe(true);
    });
  });

  describe('E2 — referências existem', () => {
    it('room com nó inexistente gera E2', () => {
      const doc = makeDoc({
        nodes: [makeNode('n1', 0, 0)],
        rooms: [makeRoom('r1', ['n1', 'n99'])],
      });
      const issues = validateDocument(doc);
      const e2 = issues.filter((i) => i.code === 'E2');
      expect(e2.length).toBeGreaterThan(0);
    });

    it('wall com nó inexistente gera E2', () => {
      const doc = makeDoc({
        nodes: [makeNode('n1', 0, 0)],
        walls: [
          { id: wallId('w1'), a: nodeId('n1'), b: nodeId('n99') },
        ],
      });
      const issues = validateDocument(doc);
      const e2 = issues.filter((i) => i.code === 'E2');
      expect(e2.length).toBeGreaterThan(0);
    });

    it('opening com room inexistente gera E2', () => {
      const doc = makeDoc({
        nodes: [makeNode('n1', 0, 0), makeNode('n2', 100, 0)],
        openings: [
          {
            id: openingId('o1'),
            edge: { kind: 'room' as const, roomId: roomId('r99'), index: 0 },
            kind: 'door' as const,
            offset: mm(0),
            width: mm(50),
            swing: 'right' as const,
          },
        ],
      });
      const issues = validateDocument(doc);
      const e2 = issues.filter((i) => i.code === 'E2');
      expect(e2.length).toBeGreaterThan(0);
    });

    it('opening com wall inexistente gera E2', () => {
      const doc = makeDoc({
        nodes: [makeNode('n1', 0, 0), makeNode('n2', 100, 0)],
        openings: [
          {
            id: openingId('o1'),
            edge: { kind: 'wall' as const, wallId: wallId('w99') },
            kind: 'door' as const,
            offset: mm(0),
            width: mm(50),
            swing: 'right' as const,
          },
        ],
      });
      const issues = validateDocument(doc);
      const e2 = issues.filter((i) => i.code === 'E2');
      expect(e2.length).toBeGreaterThan(0);
    });
  });

  describe('E3 — mínimo 3 nós no loop', () => {
    it('room com 2 nós gera E3', () => {
      const doc = makeDoc({
        nodes: [makeNode('n1', 0, 0), makeNode('n2', 100, 0)],
        rooms: [makeRoom('r1', ['n1', 'n2'])],
      });
      const issues = validateDocument(doc);
      expect(issues.some((i) => i.code === 'E3')).toBe(true);
    });

    it('room com 3 nós não gera E3', () => {
      const doc = makeDoc({
        nodes: [
          makeNode('n1', 0, 0),
          makeNode('n2', 100, 0),
          makeNode('n3', 100, 100),
        ],
        rooms: [makeRoom('r1', ['n1', 'n2', 'n3'])],
      });
      const errors = validateDocumentErrors(doc);
      expect(errors.filter((i) => i.code === 'E3')).toEqual([]);
    });
  });

  describe('E4 — sem nós repetidos no loop', () => {
    it('room com nó repetido gera E4', () => {
      const doc = makeDoc({
        nodes: [
          makeNode('n1', 0, 0),
          makeNode('n2', 100, 0),
          makeNode('n3', 100, 100),
        ],
        rooms: [makeRoom('r1', ['n1', 'n2', 'n1'])],
      });
      const issues = validateDocument(doc);
      expect(issues.some((i) => i.code === 'E4')).toBe(true);
    });
  });

  describe('E5 — wall A != B', () => {
    it('wall com A == B gera E5', () => {
      const doc = makeDoc({
        nodes: [makeNode('n1', 0, 0)],
        walls: [{ id: wallId('w1'), a: nodeId('n1'), b: nodeId('n1') }],
      });
      const issues = validateDocument(doc);
      expect(issues.some((i) => i.code === 'E5')).toBe(true);
    });
  });

  describe('E6 — sem nós com coordenadas idênticas', () => {
    it('dois nós na mesma coordenada gera E6', () => {
      const doc = makeDoc({
        nodes: [makeNode('n1', 0, 0), makeNode('n2', 0, 0)],
      });
      const issues = validateDocument(doc);
      expect(issues.some((i) => i.code === 'E6')).toBe(true);
    });
  });

  describe('E7 — abertura não excede aresta', () => {
    it('opening grande demais gera E7', () => {
      const doc = makeDoc({
        nodes: [makeNode('n1', 0, 0), makeNode('n2', 100, 0), makeNode('n3', 100, 100)],
        rooms: [makeRoom('r1', ['n1', 'n2', 'n3'])],
        openings: [
          {
            id: openingId('o1'),
            edge: { kind: 'room' as const, roomId: roomId('r1'), index: 0 },
            kind: 'door' as const,
            offset: mm(0),
            width: mm(200),
            swing: 'right' as const,
          },
        ],
      });
      const issues = validateDocument(doc);
      expect(issues.some((i) => i.code === 'E7')).toBe(true);
    });
  });

  describe('E8 — furniture dimensions > 0', () => {
    it('móvel com width <= 0 gera E8', () => {
      const doc: PlanDocument = {
        ...createEmptyDocument(),
        furniture: [
          {
            id: furnitureId('f1'),
            catalogId: null,
            name: 'X',
            width: mm(0),
            depth: mm(100),
            center: { x: mm(0), y: mm(0) },
            rotation: deg(0),
            color: null,
            locked: false,
            clearance: mm(0),
          },
        ],
      };
      const issues = validateDocument(doc);
      expect(issues.some((i) => i.code === 'E8')).toBe(true);
    });
  });

  describe('E9 — ids únicos por tipo', () => {
    it('dois nós com mesmo id gera E9', () => {
      const doc = makeDoc({
        nodes: [makeNode('n1', 0, 0), makeNode('n1', 100, 0)],
      });
      const issues = validateDocument(doc);
      const e9 = issues.filter((i) => i.code === 'E9');
      expect(e9.length).toBeGreaterThan(0);
    });
  });

  describe('W1 — auto-interseção', () => {
    it('bowtie gera W1', () => {
      // Polígono em forma de gravata: (0,0) (100,0) (0,100) (100,100)
      const doc = makeDoc({
        nodes: [
          makeNode('n1', 0, 0),
          makeNode('n2', 100, 0),
          makeNode('n3', 0, 100),
          makeNode('n4', 100, 100),
        ],
        rooms: [makeRoom('r1', ['n1', 'n2', 'n3', 'n4'])],
      });
      const issues = validateDocument(doc);
      const w1 = issues.filter((i) => i.code === 'W1');
      expect(w1.length).toBeGreaterThan(0);
      expect(w1[0]!.level).toBe('warning');
    });
  });

  describe('W5 — nó órfão', () => {
    it('nó não referenciado gera W5', () => {
      const doc = makeDoc({
        nodes: [makeNode('n1', 0, 0), makeNode('orphan', 100, 100)],
        rooms: [makeRoom('r1', ['n1', 'n1', 'n1'])], // invalid but not relevant
      });
      const issues = validateDocument(doc);
      const w5 = issues.filter((i) => i.code === 'W5');
      expect(w5.length).toBeGreaterThan(0);
      expect(w5[0]!.level).toBe('warning');
    });
  });
});