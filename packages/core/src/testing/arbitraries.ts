import fc from 'fast-check';
import type { NodeId, PlanDocument, RoomId } from '../model';
import { createEmptyDocument } from '../model';
import { applyCommand, type Command } from '../commands';
import type { Point } from '../geometry';

/**
 * Geradores para os property tests de `10-testes.md`.
 *
 * Coordenadas ficam num intervalo modesto e sempre inteiras: o domínio é em
 * milímetro inteiro, e gerar float aqui testaria um documento que nenhum
 * comando consegue produzir.
 */

const COORD = fc.integer({ min: -20_000, max: 20_000 });

export const arbNode = fc.record({ x: COORD, y: COORD });

/**
 * Polígono simples por ordenação angular em torno do centroide
 * (`10-testes.md` § Property tests).
 *
 * Raios distintos por vértice evitam ângulos repetidos, que produziriam
 * arestas colineares e área zero.
 */
export const arbSimplePolygon = fc
  .record({
    center: arbNode,
    vertices: fc.uniqueArray(fc.integer({ min: 0, max: 359 }), {
      minLength: 3,
      maxLength: 8,
    }),
    radii: fc.array(fc.integer({ min: 500, max: 8000 }), { minLength: 8, maxLength: 8 }),
  })
  .map(({ center, vertices, radii }) => {
    const sorted = [...vertices].sort((a, b) => a - b);
    return sorted.map((degrees, index) => {
      const radians = (degrees * Math.PI) / 180;
      const radius = radii[index % radii.length]!;
      return {
        x: Math.round(center.x + Math.cos(radians) * radius),
        y: Math.round(center.y + Math.sin(radians) * radius),
      };
    });
  })
  .filter((points) => distinct(points) && !isDegenerate(points));

function distinct(points: readonly Point[]): boolean {
  return new Set(points.map((point) => `${point.x},${point.y}`)).size === points.length;
}

function isDegenerate(points: readonly Point[]): boolean {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const from = points[i]!;
    const to = points[(i + 1) % points.length]!;
    area += from.x * to.y - to.x * from.y;
  }
  return Math.abs(area / 2) < 1;
}

let sequence = 0;

function nextNodeId(): NodeId {
  sequence += 1;
  return `n_p${sequence}` as NodeId;
}

function nextRoomId(): RoomId {
  sequence += 1;
  return `r_p${sequence}` as RoomId;
}

/** Documento com um a três cômodos disjuntos, montado pelos próprios comandos. */
export const arbDocument = fc
  .array(arbSimplePolygon, { minLength: 1, maxLength: 3 })
  .map((polygons) => {
    let doc = createEmptyDocument();

    polygons.forEach((points, index) => {
      const offset = index * 40_000;
      const nodes = points.map((point) => ({
        id: nextNodeId(),
        x: point.x + offset,
        y: point.y,
      }));

      const result = applyCommand(doc, {
        type: 'CreateRoom',
        payload: {
          nodes,
          loop: nodes.map((node) => node.id),
          name: `Cômodo ${index + 1}`,
          roomId: nextRoomId(),
        },
      });

      if (!result.error) doc = result.document;
    });

    return doc;
  })
  .filter((doc) => doc.rooms.length > 0);

/** Comando aplicável ao documento dado, ou `null` se ele não permite nenhum. */
export function commandsFor(doc: PlanDocument): fc.Arbitrary<Command> {
  const options: fc.Arbitrary<Command>[] = [];

  if (doc.nodes.length > 0) {
    options.push(
      fc
        .record({
          index: fc.integer({ min: 0, max: doc.nodes.length - 1 }),
          dx: fc.integer({ min: -3000, max: 3000 }),
          dy: fc.integer({ min: -3000, max: 3000 }),
        })
        .map(({ index, dx, dy }): Command => {
          const node = doc.nodes[index]!;
          return {
            type: 'MoveNode',
            payload: { nodeId: node.id, x: node.x + dx, y: node.y + dy },
          };
        }),
    );
  }

  if (doc.rooms.length > 0) {
    const rooms = doc.rooms.map((room) => room.id);
    options.push(
      fc
        .record({ roomId: fc.constantFrom(...rooms), name: fc.string({ maxLength: 12 }) })
        .map(({ roomId, name }): Command => ({ type: 'RenameRoom', payload: { roomId, name } })),
    );
    options.push(
      fc
        .record({ roomId: fc.constantFrom(...rooms), include: fc.boolean() })
        .map(
          ({ roomId, include }): Command => ({
            type: 'SetRoomUsable',
            payload: { roomId, includeInUsableArea: include },
          }),
        ),
    );
    options.push(
      fc
        .constantFrom(...rooms)
        .map((roomId): Command => ({ type: 'DeleteRoom', payload: { roomId } })),
    );
  }

  return fc.oneof(...options);
}

export const arbLengthInput = fc
  .oneof(
    fc.integer({ min: 1, max: 2000 }).map((value) => String(value)),
    fc.integer({ min: 1, max: 2000 }).map((value) => `${value}cm`),
    fc.integer({ min: 1, max: 20_000 }).map((value) => `${value}mm`),
    fc
      .integer({ min: 1, max: 2000 })
      .map((value) => `${(value / 100).toFixed(2).replace('.', ',')}`),
  )
  .filter((text) => text.length > 0);
