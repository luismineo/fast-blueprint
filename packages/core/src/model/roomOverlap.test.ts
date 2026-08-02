import { describe, expect, it } from 'vitest';
import { applyCommand } from '../commands';
import { createEmptyDocument } from './document';
import { validateDocument } from './validation';
import { buildApto44m2 } from '../testing/fixtures';
import type { NodeId, PlanDocument, RoomId } from './types';

function rectRoom(
  doc: PlanDocument,
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): PlanDocument {
  return applyCommand(doc, {
    type: 'CreateRoom',
    payload: {
      nodes: [
        { id: `${id}1` as NodeId, x: x1, y: y1 },
        { id: `${id}2` as NodeId, x: x2, y: y1 },
        { id: `${id}3` as NodeId, x: x2, y: y2 },
        { id: `${id}4` as NodeId, x: x1, y: y2 },
      ],
      loop: [`${id}1`, `${id}2`, `${id}3`, `${id}4`] as NodeId[],
      name: id,
      roomId: id as RoomId,
    },
  }).document;
}

function overlaps(doc: PlanDocument): string[][] {
  return validateDocument(doc)
    .filter((issue) => issue.code === 'W2')
    .map((issue) => issue.ids);
}

/**
 * W2 é sobreposição **em área**. Compartilhar parede é o que todo apartamento
 * faz, e acusar isso enche o painel de aviso falso na planta correta — o
 * defeito só apareceu quando a lista de avisos chegou à tela, no M3.
 */
describe('W2 — cômodos sobrepostos', () => {
  it('dois cômodos que compartilham uma parede não se sobrepõem', () => {
    let doc = rectRoom(createEmptyDocument(), 'left', 0, 0, 3200, 2500);
    doc = rectRoom(doc, 'right', 3200, 0, 6400, 2500);

    expect(overlaps(doc)).toEqual([]);
  });

  it('dois cômodos que se tocam só num canto não se sobrepõem', () => {
    let doc = rectRoom(createEmptyDocument(), 'a', 0, 0, 3200, 2500);
    doc = rectRoom(doc, 'b', 3200, 2500, 6400, 5000);

    expect(overlaps(doc)).toEqual([]);
  });

  it('um cômodo dentro do outro se sobrepõe', () => {
    let doc = rectRoom(createEmptyDocument(), 'fora', 0, 0, 5000, 5000);
    doc = rectRoom(doc, 'dentro', 1000, 1000, 2000, 2000);

    expect(overlaps(doc)).toEqual([['fora', 'dentro']]);
  });

  it('cômodos que se cruzam pela metade se sobrepõem', () => {
    let doc = rectRoom(createEmptyDocument(), 'a', 0, 0, 3200, 2500);
    doc = rectRoom(doc, 'b', 1600, 1250, 4800, 3750);

    expect(overlaps(doc)).toEqual([['a', 'b']]);
  });

  it('cômodos em cruz, sem vértice dentro do outro, se sobrepõem', () => {
    let doc = rectRoom(createEmptyDocument(), 'horizontal', 0, 1000, 4000, 2000);
    doc = rectRoom(doc, 'vertical', 1500, 0, 2500, 3000);

    expect(overlaps(doc)).toEqual([['horizontal', 'vertical']]);
  });

  it('o apartamento de referência não acusa sobreposição nenhuma', () => {
    expect(overlaps(buildApto44m2())).toEqual([]);
  });
});
