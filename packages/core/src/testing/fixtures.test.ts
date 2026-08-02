import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FIXTURE_BUILDERS,
  buildApto44m2,
  buildConcave,
  buildFurnished,
  buildSharedNodes,
  buildSingleRoom,
} from './fixtures';
import { computeRoomArea, computeUsableArea } from '../commands';
import { validateDocument, validateDocumentErrors } from '../model';

const FIXTURES_DIR = join(import.meta.dirname, '..', '..', '..', '..', 'specs', 'fixtures');

describe('fixtures', () => {
  it('single-room tem area exata de 8.000.000 mm2', () => {
    const doc = buildSingleRoom();
    expect(doc.nodes).toHaveLength(4);
    expect(doc.rooms).toHaveLength(1);
    expect(computeRoomArea(doc, doc.rooms[0]!.id)).toBe(8_000_000);
    expect(validateDocumentErrors(doc)).toEqual([]);
  });

  it('shared-nodes reusa a aresta comum: 6 nos, nao 8', () => {
    const doc = buildSharedNodes();
    expect(doc.nodes).toHaveLength(6);
    expect(doc.rooms).toHaveLength(2);
    expect(validateDocumentErrors(doc)).toEqual([]);
  });

  it('concave tem 6 vertices', () => {
    const doc = buildConcave();
    expect(doc.nodes).toHaveLength(6);
    expect(validateDocumentErrors(doc)).toEqual([]);
  });

  it('apto-44m2 tem 7 comodos e area util dentro da tolerancia de 0,50 m2', () => {
    const doc = buildApto44m2();
    expect(doc.rooms).toHaveLength(7);
    const areaM2 = computeUsableArea(doc) / 1_000_000;
    expect(areaM2).toBeGreaterThan(37.4);
    expect(areaM2).toBeLessThan(38.4);
    expect(validateDocumentErrors(doc)).toEqual([]);
  });

  it('furnished tem 40 moveis sobre o apartamento de referencia', () => {
    const doc = buildFurnished();

    expect(doc.rooms).toHaveLength(7);
    expect(doc.furniture).toHaveLength(40);
    expect(validateDocumentErrors(doc)).toEqual([]);
  });

  /**
   * A fixture existe para medir o orcamento de 8 ms no pior caso, e o pior
   * caso inclui a hachura de colisao. Quarenta moveis num apartamento de
   * 44 m2 se sobrepoem de verdade -- exigir uma planta arrumada aqui mediria
   * um cenario que ninguem tem.
   */
  it('furnished exercita o caminho de colisao de proposito', () => {
    const colliding = validateDocument(buildFurnished()).filter(
      (issue) => issue.code === 'W4',
    );

    expect(colliding.length).toBeGreaterThan(0);
  });

  it('toda fixture tem ids de no distintos', () => {
    for (const build of Object.values(FIXTURE_BUILDERS)) {
      const doc = build();
      const ids = doc.nodes.map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const room of doc.rooms) {
        expect(new Set(room.loop).size).toBe(room.loop.length);
      }
    }
  });

  it('geracao e deterministica: dois builds produzem o mesmo JSON', () => {
    for (const build of Object.values(FIXTURE_BUILDERS)) {
      expect(JSON.stringify(build())).toBe(JSON.stringify(build()));
    }
  });

  // Regenerar apos mudar um builder: WRITE_FIXTURES=1 pnpm test
  // (PowerShell: $env:WRITE_FIXTURES=1; pnpm test)
  it('as fixtures versionadas estao em dia com os builders', () => {
    for (const [filename, build] of Object.entries(FIXTURE_BUILDERS)) {
      const expected = `${JSON.stringify(build(), null, 2)}\n`;
      const path = join(FIXTURES_DIR, filename);

      if (process.env.WRITE_FIXTURES) {
        writeFileSync(path, expected);
        continue;
      }

      expect(readFileSync(path, 'utf8').replace(/\r\n/g, '\n'), filename).toBe(expected);
    }
  });
});
