import { describe, it, expect } from 'vitest';
import { readDocument } from './read';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

describe('readDocument', () => {
  it('05-3: File with loop referencing non-existent node produces error with roomName', () => {
    const json = JSON.stringify({
      schemaVersion: 1,
      meta: { name: 'Test', createdAt: '', modifiedAt: '', displayUnit: 'm', gridSize: 100 },
      nodes: [{ id: 'n1', x: 0, y: 0 }, { id: 'n2', x: 100, y: 0 }, { id: 'n3', x: 0, y: 100 }],
      rooms: [{ id: 'r1', name: 'Quarto', loop: ['n1', 'n2', 'n_missing'], includeInUsableArea: true, color: null }],
      walls: [],
      openings: [],
      furniture: [],
      underlay: null
    });
    
    const result = readDocument(json);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('ORPHAN_NODE_REF');
      expect(result.error.details?.roomName).toBe('Quarto');
    }
  });

  it('05-4: File without walls and openings loads with empty arrays', () => {
    const json = JSON.stringify({
      schemaVersion: 1,
      meta: { name: 'Test', createdAt: '', modifiedAt: '', displayUnit: 'm', gridSize: 100 },
      nodes: [],
      rooms: [],
      // missing walls and openings
      furniture: [],
      underlay: null
    });

    const result = readDocument(json);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.walls).toEqual([]);
      expect(result.doc.openings).toEqual([]);
      expect(result.warnings.some(w => w.code === 'MISSING_ARRAY_DEFAULTED')).toBe(true);
    }
  });

  it('Float coords get rounded to int', () => {
    const json = JSON.stringify({
      schemaVersion: 1,
      meta: { name: 'Test', createdAt: '', modifiedAt: '', displayUnit: 'm', gridSize: 100 },
      nodes: [{ id: 'n1', x: 10.5, y: 20.1 }],
      rooms: [],
      walls: [],
      openings: [],
      furniture: [],
      underlay: null
    });

    const result = readDocument(json);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.nodes[0]?.x).toBe(11);
      expect(result.doc.nodes[0]?.y).toBe(20);
      expect(result.warnings.some(w => w.code === 'FLOAT_COORD_ROUNDED')).toBe(true);
    }
  });

  it('Unknown schemaVersion is rejected', () => {
    const json = JSON.stringify({
      schemaVersion: 999,
      meta: { name: 'Test', createdAt: '', modifiedAt: '', displayUnit: 'm', gridSize: 100 },
      nodes: [], rooms: [], walls: [], openings: [], furniture: [], underlay: null
    });

    const result = readDocument(json);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNKNOWN_SCHEMA_VERSION');
    }
  });
});
