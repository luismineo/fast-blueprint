import { describe, it, expect } from 'vitest';
import { readDocument } from './read';
import { serializeDocument } from './serialize';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { VOLATILE_META_FIELDS } from './volatileMetaFields';
import fc from 'fast-check';
import { arbDocument } from '../testing/arbitraries';

describe('serializeDocument', () => {
  it('05-1: Round-trip of apto-44m2 fixture produces identical document except VOLATILE_META_FIELDS', () => {
    const fixturePath = resolve(__dirname, '../../../../specs/fixtures/apto-44m2.planta.json');
    const json = readFileSync(fixturePath, 'utf-8');
    
    const readResult = readDocument(json);
    expect(readResult.ok).toBe(true);
    if (!readResult.ok) return;

    const doc = readResult.doc;
    const serialized = serializeDocument(doc, '1.0.0');
    
    const readResult2 = readDocument(serialized);
    expect(readResult2.ok).toBe(true);
    if (!readResult2.ok) return;

    const doc2 = readResult2.doc;

    // Compare original doc and re-serialized doc
    const docMeta = { ...(doc.meta as unknown as Record<string, unknown>) };
    const doc2Meta = { ...(doc2.meta as unknown as Record<string, unknown>) };

    VOLATILE_META_FIELDS.forEach(field => {
      delete docMeta[field];
      delete doc2Meta[field];
    });

    expect({ ...doc, meta: docMeta }).toEqual({ ...doc2, meta: doc2Meta });
  });

  it('05-2: File with unknown field in meta survives round-trip', () => {
    const json = JSON.stringify({
      schemaVersion: 1,
      meta: { name: 'Test', createdAt: '', modifiedAt: '', displayUnit: 'm', gridSize: 100, customField: 'customValue' },
      nodes: [],
      rooms: [],
      walls: [],
      openings: [],
      furniture: [],
      underlay: null
    });

    const readResult = readDocument(json);
    expect(readResult.ok).toBe(true);
    if (!readResult.ok) return;

    const serialized = serializeDocument(readResult.doc, '1.0.0');
    const readResult2 = readDocument(serialized);
    expect(readResult2.ok).toBe(true);
    if (!readResult2.ok) return;

    expect((readResult2.doc.meta as unknown as Record<string, unknown>).customField).toBe('customValue');
  });

  it('10-5: Arbitrary document survives round-trip serialization (property test)', () => {
    fc.assert(
      fc.property(arbDocument, (doc) => {
        const serialized = serializeDocument(doc, '1.0.0');
        const readResult = readDocument(serialized);
        
        expect(readResult.ok).toBe(true);
        if (!readResult.ok) return;

        const doc2 = readResult.doc;

        const docMeta = { ...(doc.meta as unknown as Record<string, unknown>) };
        const doc2Meta = { ...(doc2.meta as unknown as Record<string, unknown>) };

        VOLATILE_META_FIELDS.forEach(field => {
          delete docMeta[field];
          delete doc2Meta[field];
        });

        expect({ ...doc, meta: docMeta }).toEqual({ ...doc2, meta: doc2Meta });
      }),
      { numRuns: 100 }
    );
  });
});
