// ============================================================
// Hit testing — spec 02 § Hit testing
// ============================================================

import type { EdgeRef, FurnitureId, FurnitureItem, NodeId, PlanDocument, RoomId } from '../model';
import {
  closestPointOnSegment,
  distance,
  obbCorners,
  pointInPolygon,
  type Point,
} from '../geometry';
import { isSelected, type Selection } from '../selection';

export type HitResult =
  | { kind: 'node'; nodeId: NodeId }
  | { kind: 'edge'; edge: EdgeRef }
  | { kind: 'roomInterior'; roomId: RoomId }
  | { kind: 'furniture'; furnitureId: FurnitureId }
  | { kind: 'furnitureCorner'; furnitureId: FurnitureId; corner: number }
  | { kind: 'furnitureRotation'; furnitureId: FurnitureId }
  | null;

export interface HitConfig {
  linearTolerancePx: number;
  handleTolerancePx: number;
  /** Distância do handle de rotação à face frontal, em px de tela. */
  rotationHandlePx: number;
}

export interface HitContext {
  doc: PlanDocument;
  scale: number; // px/mm
  /** Handle só existe para móvel selecionado (spec 02 § Hit testing). */
  selection?: Selection;
}

const DEFAULT_HIT_CONFIG: HitConfig = {
  linearTolerancePx: 6,
  handleTolerancePx: 10,
  rotationHandlePx: 24,
};

/**
 * Entidade de maior prioridade sob o ponto, ou `null`.
 *
 * Ordem de `02-unidades-e-geometria.md` § Hit testing. Abertura fica de fora
 * enquanto o array correspondente estiver sempre vazio; entra com `Opening`
 * (M6).
 *
 * O nó é testado **antes** da aresta e independentemente de estar selecionado.
 * A spec lista "handle de seleção ativa" no topo, mas um nó que só ganhasse
 * prioridade depois de selecionado seria inalcançável: o clique que o
 * selecionaria acertaria a aresta que passa por ele. Handle de móvel não tem
 * esse problema — o corpo dele continua agarrável — e por isso respeita a
 * prioridade da spec.
 */
export function hitTest(
  point: Point,
  ctx: HitContext,
  config: HitConfig = DEFAULT_HIT_CONFIG,
): HitResult {
  const handleTolerance = config.handleTolerancePx / ctx.scale;
  const linearTolerance = config.linearTolerancePx / ctx.scale;

  const handle = furnitureHandle(point, ctx, config, handleTolerance);
  if (handle) return handle;

  const node = nearestNode(point, ctx.doc, handleTolerance);
  if (node) return node;

  const item = topmostFurniture(point, ctx.doc);
  if (item) return item;

  const edge = nearestEdge(point, ctx.doc, linearTolerance);
  if (edge) return edge;

  return enclosingRoom(point, ctx.doc);
}

/**
 * Handles do móvel selecionado: os quatro cantos e o de rotação.
 *
 * Móvel travado não tem handle — não há o que agarrar
 * (`03-ferramentas-e-interacao.md` § Handles).
 */
function furnitureHandle(
  point: Point,
  ctx: HitContext,
  config: HitConfig,
  tolerance: number,
): HitResult {
  const selection = ctx.selection;
  if (!selection || selection.length === 0) return null;

  for (const item of ctx.doc.furniture) {
    if (item.locked) continue;
    if (!isSelected(selection, { kind: 'furniture', furnitureId: item.id })) continue;

    const corners = obbCorners(item.center, item.width, item.depth, item.rotation);

    for (let index = 0; index < corners.length; index += 1) {
      if (distance(point, corners[index]!) <= tolerance) {
        return { kind: 'furnitureCorner', furnitureId: item.id, corner: index };
      }
    }

    const grip = rotationHandleAt(item, config.rotationHandlePx / ctx.scale);
    if (distance(point, grip) <= tolerance) {
      return { kind: 'furnitureRotation', furnitureId: item.id };
    }
  }

  return null;
}

/**
 * Posição do handle de rotação: além da face frontal, na direção `+depth`.
 *
 * A distância é constante em pixels de tela, como todo handle
 * (`04-renderizacao.md` § Espessura constante).
 */
export function rotationHandleAt(item: FurnitureItem, offsetMm: number): Point {
  const radians = (item.rotation * Math.PI) / 180;
  const forward: Point = { x: -Math.sin(radians), y: Math.cos(radians) };
  const reach = item.depth / 2 + offsetMm;

  return {
    x: item.center.x + forward.x * reach,
    y: item.center.y + forward.y * reach,
  };
}

/** Último desenhado é o primeiro testado (spec 02 § Hit testing). */
function topmostFurniture(point: Point, doc: PlanDocument): HitResult {
  for (let i = doc.furniture.length - 1; i >= 0; i -= 1) {
    const item = doc.furniture[i]!;
    const corners = obbCorners(item.center, item.width, item.depth, item.rotation);
    if (pointInPolygon(point, corners)) {
      return { kind: 'furniture', furnitureId: item.id };
    }
  }
  return null;
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
