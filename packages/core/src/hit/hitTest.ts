// ============================================================
// Hit testing — spec 02 § Hit testing
// ============================================================

import type { EdgeRef, NodeId, PlanDocument, RoomId } from '../model';
import { closestPointOnSegment, distance, pointInPolygon, type Point } from '../geometry';

export type HitResult =
  | { kind: 'node'; nodeId: NodeId }
  | { kind: 'edge'; edge: EdgeRef }
  | { kind: 'roomInterior'; roomId: RoomId }
  | null;

export interface HitConfig {
  linearTolerancePx: number;
  handleTolerancePx: number;
}

export interface HitContext {
  doc: PlanDocument;
  scale: number; // px/mm
}

const DEFAULT_HIT_CONFIG: HitConfig = {
  linearTolerancePx: 6,
  handleTolerancePx: 10,
};

/**
 * Entidade de maior prioridade sob o ponto, ou `null`.
 *
 * Ordem de `02-unidades-e-geometria.md` § Hit testing. Móvel e abertura ficam
 * de fora enquanto os arrays correspondentes estiverem sempre vazios; entram
 * com a Ferramenta Mobília (M3) e com `Opening` (M6).
 *
 * O nó é testado **antes** da aresta e independentemente de estar selecionado.
 * A spec lista "handle de seleção ativa" no topo, mas um nó que só ganhasse
 * prioridade depois de selecionado seria inalcançável: o clique que o
 * selecionaria acertaria a aresta que passa por ele.
 */
export function hitTest(
  point: Point,
  ctx: HitContext,
  config: HitConfig = DEFAULT_HIT_CONFIG,
): HitResult {
  const handleTolerance = config.handleTolerancePx / ctx.scale;
  const linearTolerance = config.linearTolerancePx / ctx.scale;

  const node = nearestNode(point, ctx.doc, handleTolerance);
  if (node) return node;

  const edge = nearestEdge(point, ctx.doc, linearTolerance);
  if (edge) return edge;

  return enclosingRoom(point, ctx.doc);
}

function nearestNode(
  point: Point,
  doc: PlanDocument,
  tolerance: number,
): HitResult {
  let best: NodeId | null = null;
  let bestDistance = Infinity;

  for (const node of doc.nodes) {
    const d = distance(point, node);
    if (d <= tolerance && d < bestDistance) {
      bestDistance = d;
      best = node.id;
    }
  }

  return best === null ? null : { kind: 'node', nodeId: best };
}

function nearestEdge(
  point: Point,
  doc: PlanDocument,
  tolerance: number,
): HitResult {
  const position = new Map<NodeId, Point>();
  for (const node of doc.nodes) position.set(node.id, { x: node.x, y: node.y });

  let best: EdgeRef | null = null;
  let bestDistance = Infinity;

  for (const room of doc.rooms) {
    for (let index = 0; index < room.loop.length; index += 1) {
      const from = position.get(room.loop[index]!);
      const to = position.get(room.loop[(index + 1) % room.loop.length]!);
      if (!from || !to) continue;

      const d = distance(point, closestPointOnSegment(point, from, to).point);
      if (d <= tolerance && d < bestDistance) {
        bestDistance = d;
        best = { kind: 'room', roomId: room.id, index };
      }
    }
  }

  for (const wall of doc.walls) {
    const from = position.get(wall.a);
    const to = position.get(wall.b);
    if (!from || !to) continue;

    const d = distance(point, closestPointOnSegment(point, from, to).point);
    if (d <= tolerance && d < bestDistance) {
      bestDistance = d;
      best = { kind: 'wall', wallId: wall.id };
    }
  }

  return best === null ? null : { kind: 'edge', edge: best };
}

/** Último cômodo da lista é o primeiro testado — é o que está por cima. */
function enclosingRoom(point: Point, doc: PlanDocument): HitResult {
  const position = new Map<NodeId, Point>();
  for (const node of doc.nodes) position.set(node.id, { x: node.x, y: node.y });

  for (let i = doc.rooms.length - 1; i >= 0; i -= 1) {
    const room = doc.rooms[i]!;
    const points: Point[] = [];
    let complete = true;

    for (const nodeId of room.loop) {
      const at = position.get(nodeId);
      if (!at) {
        complete = false;
        break;
      }
      points.push(at);
    }

    if (complete && pointInPolygon(point, points)) {
      return { kind: 'roomInterior', roomId: room.id };
    }
  }

  return null;
}

export { DEFAULT_HIT_CONFIG };
