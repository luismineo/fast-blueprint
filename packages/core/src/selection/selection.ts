// ============================================================
// Seleção — spec 03 § Modelo de seleção
// ============================================================

import type { EdgeRef, FurnitureId, NodeId, PlanDocument, RoomId } from '../model';
import { obbCorners, pointInPolygon, type Point } from '../geometry';

export type SelectionRef =
  | { kind: 'room'; roomId: RoomId }
  | { kind: 'node'; nodeId: NodeId }
  | { kind: 'edge'; edge: EdgeRef }
  | { kind: 'furniture'; furnitureId: FurnitureId };

export type Selection = readonly SelectionRef[];

export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const EMPTY_SELECTION: Selection = [];

/**
 * Chave estável de uma referência, para comparação e deduplicação.
 *
 * Referências são objetos: sem uma chave, `includes` e `Set` comparariam por
 * identidade e a mesma aresta selecionada duas vezes viraria duas entradas.
 */
export function selectionKey(ref: SelectionRef): string {
  switch (ref.kind) {
    case 'room':
      return `room:${ref.roomId}`;
    case 'node':
      return `node:${ref.nodeId}`;
    case 'edge':
      return ref.edge.kind === 'room'
        ? `edge:room:${ref.edge.roomId}:${ref.edge.index}`
        : `edge:wall:${ref.edge.wallId}`;
    case 'furniture':
      return `furniture:${ref.furnitureId}`;
  }
}

export function isSelected(selection: Selection, ref: SelectionRef): boolean {
  const key = selectionKey(ref);
  return selection.some((candidate) => selectionKey(candidate) === key);
}

/** `Ctrl/Cmd` + clique: presente sai, ausente entra. */
export function toggle(selection: Selection, ref: SelectionRef): Selection {
  const key = selectionKey(ref);
  const without = selection.filter((candidate) => selectionKey(candidate) !== key);
  return without.length === selection.length ? [...selection, ref] : without;
}

export function replaceWith(ref: SelectionRef | null): Selection {
  return ref === null ? EMPTY_SELECTION : [ref];
}

export function selectedRooms(selection: Selection): RoomId[] {
  const rooms: RoomId[] = [];
  for (const ref of selection) {
    if (ref.kind === 'room') rooms.push(ref.roomId);
  }
  return rooms;
}

export function selectedFurniture(selection: Selection): FurnitureId[] {
  const furniture: FurnitureId[] = [];
  for (const ref of selection) {
    if (ref.kind === 'furniture') furniture.push(ref.furnitureId);
  }
  return furniture;
}

/**
 * Referências cujos ids ainda existem no documento.
 *
 * Undo restaura o documento, não a seleção: o que sobrou vale, o resto sai
 * (spec 08 § Histórico, "melhor esforço").
 */
export function pruneSelection(doc: PlanDocument, selection: Selection): Selection {
  return selection.filter((ref) => exists(doc, ref));
}

function exists(doc: PlanDocument, ref: SelectionRef): boolean {
  switch (ref.kind) {
    case 'room':
      return doc.rooms.some((room) => room.id === ref.roomId);
    case 'node':
      return doc.nodes.some((node) => node.id === ref.nodeId);
    case 'edge': {
      const edge = ref.edge;
      if (edge.kind === 'wall') {
        return doc.walls.some((wall) => wall.id === edge.wallId);
      }
      const room = doc.rooms.find((candidate) => candidate.id === edge.roomId);
      return room !== undefined && edge.index >= 0 && edge.index < room.loop.length;
    }
    case 'furniture':
      return doc.furniture.some((item) => item.id === ref.furnitureId);
  }
}

// ============================================================
// Retângulo de seleção
// ============================================================

export function rectFromPoints(a: Point, b: Point): Rect {
  return {
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
  };
}

function contains(rect: Rect, point: Point): boolean {
  return (
    point.x >= rect.minX &&
    point.x <= rect.maxX &&
    point.y >= rect.minY &&
    point.y <= rect.maxY
  );
}

/**
 * Entidades **completamente** envolvidas pelo retângulo (spec 03 § Seleção).
 *
 * Envolvimento total, não interseção: um retângulo que só encosta num cômodo
 * grande selecionaria a planta inteira, e o gesto de arrastar sobre uma região
 * é o gesto de escolher o que está dentro dela.
 */
export function selectWithin(doc: PlanDocument, rect: Rect): Selection {
  const position = new Map<NodeId, Point>();
  for (const node of doc.nodes) position.set(node.id, { x: node.x, y: node.y });

  const selection: SelectionRef[] = [];

  for (const room of doc.rooms) {
    let allInside = room.loop.length > 0;
    for (const nodeId of room.loop) {
      const at = position.get(nodeId);
      if (!at || !contains(rect, at)) {
        allInside = false;
        break;
      }
    }
    if (allInside) selection.push({ kind: 'room', roomId: room.id });
  }

  const inRoom = new Set<NodeId>();
  for (const room of doc.rooms) {
    for (const nodeId of room.loop) inRoom.add(nodeId);
  }

  for (const node of doc.nodes) {
    if (!contains(rect, node)) continue;
    if (!inRoom.has(node.id)) continue;
    selection.push({ kind: 'node', nodeId: node.id });
  }

  for (const item of doc.furniture) {
    const corners = obbCorners(item.center, item.width, item.depth, item.rotation);
    if (corners.every((corner) => contains(rect, corner))) {
      selection.push({ kind: 'furniture', furnitureId: item.id });
    }
  }

  return selection;
}

// ============================================================
// Geometria da seleção
// ============================================================

/** Pontos do ciclo de um cômodo, ou `null` se alguma referência não resolve. */
export function roomPoints(doc: PlanDocument, roomId: RoomId): Point[] | null {
  const room = doc.rooms.find((candidate) => candidate.id === roomId);
  if (!room) return null;

  const points: Point[] = [];
  for (const nodeId of room.loop) {
    const node = doc.nodes.find((candidate) => candidate.id === nodeId);
    if (!node) return null;
    points.push({ x: node.x, y: node.y });
  }
  return points;
}

/** Extremos de uma aresta referenciada, ou `null` se ela não resolve. */
export function edgePoints(doc: PlanDocument, edge: EdgeRef): [Point, Point] | null {
  const at = (id: NodeId): Point | null => {
    const node = doc.nodes.find((candidate) => candidate.id === id);
    return node ? { x: node.x, y: node.y } : null;
  };

  if (edge.kind === 'wall') {
    const wall = doc.walls.find((candidate) => candidate.id === edge.wallId);
    if (!wall) return null;
    const from = at(wall.a);
    const to = at(wall.b);
    return from && to ? [from, to] : null;
  }

  const room = doc.rooms.find((candidate) => candidate.id === edge.roomId);
  if (!room || edge.index < 0 || edge.index >= room.loop.length) return null;

  const from = at(room.loop[edge.index]!);
  const to = at(room.loop[(edge.index + 1) % room.loop.length]!);
  return from && to ? [from, to] : null;
}

/**
 * Nós que a seleção move: os dela, mais os das arestas e cômodos incluídos.
 *
 * Móvel não contribui com nó nenhum — ele não é geometria de nó, e quem o move
 * é `MoveFurniture`.
 */
export function affectedNodes(doc: PlanDocument, selection: Selection): NodeId[] {
  const ids = new Set<NodeId>();

  for (const ref of selection) {
    if (ref.kind === 'furniture') continue;

    if (ref.kind === 'node') {
      ids.add(ref.nodeId);
      continue;
    }

    if (ref.kind === 'room') {
      const room = doc.rooms.find((candidate) => candidate.id === ref.roomId);
      if (room) for (const nodeId of room.loop) ids.add(nodeId);
      continue;
    }

    const edge = ref.edge;

    if (edge.kind === 'wall') {
      const wall = doc.walls.find((candidate) => candidate.id === edge.wallId);
      if (wall) {
        ids.add(wall.a);
        ids.add(wall.b);
      }
      continue;
    }

    const room = doc.rooms.find((candidate) => candidate.id === edge.roomId);
    if (!room || edge.index >= room.loop.length) continue;
    ids.add(room.loop[edge.index]!);
    ids.add(room.loop[(edge.index + 1) % room.loop.length]!);
  }

  return [...ids];
}

/** Cômodos que um ponto de mundo atinge, para o arraste de interior. */
export function roomsContaining(doc: PlanDocument, point: Point): RoomId[] {
  const found: RoomId[] = [];
  for (const room of doc.rooms) {
    const points = roomPoints(doc, room.id);
    if (points && pointInPolygon(point, points)) found.push(room.id);
  }
  return found;
}
