// ============================================================
// Validação de invariantes — spec 01 § Invariantes
// ============================================================

import type { PlanDocument, EdgeRef, NodeId } from './types';
import {
  containment,
  obbCorners,
  pointInPolygon,
  satOverlap,
  type Point,
} from '../geometry';

export type ValidationLevel = 'error' | 'warning';

export interface ValidationIssue {
  code: string;
  level: ValidationLevel;
  message: string;
  ids: string[];
}

/**
 * Valida todas as invariantes E1–E9 (error) e W1–W5 (warning).
 * Retorna array vazio se o documento é válido.
 */
export function validateDocument(doc: PlanDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  checkE1(doc, issues);
  checkE2(doc, issues);
  checkE3(doc, issues);
  checkE4(doc, issues);
  checkE5(doc, issues);
  checkE6(doc, issues);
  checkE7(doc, issues);
  checkE8(doc, issues);
  checkE9(doc, issues);
  checkW1(doc, issues);
  checkW2(doc, issues);
  checkW3(doc, issues);
  checkW4(doc, issues);
  checkW5(doc, issues);

  return issues;
}

/**
 * Retorna apenas issues de nível error.
 */
export function validateDocumentErrors(doc: PlanDocument): ValidationIssue[] {
  return validateDocument(doc).filter((i) => i.level === 'error');
}

// ============================================================
// Invariantes nível error (E1–E9)
// ============================================================

function checkE1(doc: PlanDocument, issues: ValidationIssue[]): void {
  // E1: Toda coordenada de nó é inteiro
  for (const node of doc.nodes) {
    if (!Number.isInteger(node.x) || !Number.isInteger(node.y)) {
      issues.push({
        code: 'E1',
        level: 'error',
        message: `Coordenada do nó ${node.id} não é inteiro: (${node.x}, ${node.y})`,
        ids: [node.id],
      });
    }
  }
}

function checkE2(doc: PlanDocument, issues: ValidationIssue[]): void {
  // E2: Todo NodeId referenciado por room/wall/opening existe
  const nodeIds = new Set(doc.nodes.map((n) => n.id));

  for (const room of doc.rooms) {
    for (const nodeId of room.loop) {
      if (!nodeIds.has(nodeId)) {
        issues.push({
          code: 'E2',
          level: 'error',
          message: `Room ${room.id} referencia nó inexistente: ${nodeId}`,
          ids: [room.id, nodeId],
        });
      }
    }
  }

  for (const wall of doc.walls) {
    if (!nodeIds.has(wall.a)) {
      issues.push({
        code: 'E2',
        level: 'error',
        message: `Wall ${wall.id} referencia nó A inexistente: ${wall.a}`,
        ids: [wall.id, wall.a],
      });
    }
    if (!nodeIds.has(wall.b)) {
      issues.push({
        code: 'E2',
        level: 'error',
        message: `Wall ${wall.id} referencia nó B inexistente: ${wall.b}`,
        ids: [wall.id, wall.b],
      });
    }
  }

  for (const opening of doc.openings) {
    if (opening.edge.kind === 'room') {
      const edge = opening.edge;
      const room = doc.rooms.find((r) => r.id === edge.roomId);
      if (!room) {
        issues.push({
          code: 'E2',
          level: 'error',
          message: `Opening ${opening.id} referencia room inexistente: ${edge.roomId}`,
          ids: [opening.id, edge.roomId],
        });
      }
    } else {
      const edge = opening.edge;
      const wall = doc.walls.find((w) => w.id === edge.wallId);
      if (!wall) {
        issues.push({
          code: 'E2',
          level: 'error',
          message: `Opening ${opening.id} referencia wall inexistente: ${edge.wallId}`,
          ids: [opening.id, edge.wallId],
        });
      }
    }
  }
}

function checkE3(doc: PlanDocument, issues: ValidationIssue[]): void {
  // E3: Room.loop tem no mínimo 3 nós
  for (const room of doc.rooms) {
    if (room.loop.length < 3) {
      issues.push({
        code: 'E3',
        level: 'error',
        message: `Room ${room.id} tem apenas ${room.loop.length} nós (mínimo 3)`,
        ids: [room.id],
      });
    }
  }
}

function checkE4(doc: PlanDocument, issues: ValidationIssue[]): void {
  // E4: Room.loop não tem nós repetidos
  for (const room of doc.rooms) {
    const seen = new Set<string>();
    for (const nodeId of room.loop) {
      if (seen.has(nodeId)) {
        issues.push({
          code: 'E4',
          level: 'error',
          message: `Room ${room.id} tem nó repetido no loop: ${nodeId}`,
          ids: [room.id, nodeId],
        });
        break;
      }
      seen.add(nodeId);
    }
  }
}

function checkE5(doc: PlanDocument, issues: ValidationIssue[]): void {
  // E5: Wall.a !== Wall.b
  for (const wall of doc.walls) {
    if (wall.a === wall.b) {
      issues.push({
        code: 'E5',
        level: 'error',
        message: `Wall ${wall.id} referencia o mesmo nó em A e B: ${wall.a}`,
        ids: [wall.id, wall.a],
      });
    }
  }
}

function checkE6(doc: PlanDocument, issues: ValidationIssue[]): void {
  // E6: Não existem dois nós com coordenadas idênticas
  const byCoord = new Map<string, string>(); // key "x,y" → nodeId
  for (const node of doc.nodes) {
    const key = `${node.x},${node.y}`;
    const existing = byCoord.get(key);
    if (existing !== undefined) {
      issues.push({
        code: 'E6',
        level: 'error',
        message: `Nós ${existing} e ${node.id} têm coordenadas idênticas (${node.x}, ${node.y})`,
        ids: [existing, node.id],
      });
    } else {
      byCoord.set(key, node.id);
    }
  }
}

function checkE7(doc: PlanDocument, issues: ValidationIssue[]): void {
  // E7: Opening.offset + Opening.width <= comprimento da aresta ancorada
  for (const opening of doc.openings) {
    const edge = opening.edge;
    const edgeLength = getEdgeLength(doc, edge);
    if (edgeLength !== null && opening.offset + opening.width > edgeLength) {
      issues.push({
        code: 'E7',
        level: 'error',
        message: `Opening ${opening.id} excede o comprimento da aresta (${opening.offset + opening.width} > ${edgeLength})`,
        ids: [opening.id],
      });
    }
  }
}

function checkE8(doc: PlanDocument, issues: ValidationIssue[]): void {
  // E8: FurnitureItem.width > 0 e depth > 0
  for (const item of doc.furniture) {
    if (item.width <= 0 || item.depth <= 0) {
      issues.push({
        code: 'E8',
        level: 'error',
        message: `Furniture ${item.id} tem dimensões inválidas: ${item.width}×${item.depth}`,
        ids: [item.id],
      });
    }
  }
}

function checkE9(doc: PlanDocument, issues: ValidationIssue[]): void {
  // E9: Todos os ids são únicos dentro do seu tipo
  checkUniqueIds(
    'E9',
    'node',
    doc.nodes.map((n) => n.id),
    issues,
  );
  checkUniqueIds(
    'E9',
    'room',
    doc.rooms.map((r) => r.id),
    issues,
  );
  checkUniqueIds(
    'E9',
    'wall',
    doc.walls.map((w) => w.id),
    issues,
  );
  checkUniqueIds(
    'E9',
    'opening',
    doc.openings.map((o) => o.id),
    issues,
  );
  checkUniqueIds(
    'E9',
    'furniture',
    doc.furniture.map((f) => f.id),
    issues,
  );
}

function checkUniqueIds(
  code: string,
  typeName: string,
  ids: string[],
  issues: ValidationIssue[],
): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      issues.push({
        code,
        level: 'error',
        message: `ID duplicado de ${typeName}: ${id}`,
        ids: [id],
      });
    }
    seen.add(id);
  }
}

// ============================================================
// Invariantes nível warning (W1–W5)
// ============================================================

function checkW1(doc: PlanDocument, _issues: ValidationIssue[]): void {
  // W1: Polígono de cômodo é auto-interceptante
  // Implementação simplificada — usa O(n²) para verificar interseção de arestas.
  // No M1, a maioria dos cômodos são retângulos; a verificação é barata.
  for (const room of doc.rooms) {
    const points = resolveLoop(doc, room.loop);
    if (points && isSelfIntersecting(points)) {
      _issues.push({
        code: 'W1',
        level: 'warning',
        message: `Room ${room.name} (${room.id}) é auto-interceptante`,
        ids: [room.id],
      });
    }
  }
}

function checkW2(doc: PlanDocument, _issues: ValidationIssue[]): void {
  // W2: Dois cômodos se sobrepõem em área
  const polyCache: { roomId: string; points: { x: number; y: number }[] }[] = [];

  for (const room of doc.rooms) {
    const points = resolveLoop(doc, room.loop);
    if (!points) continue;
    polyCache.push({ roomId: room.id, points });
  }

  for (let i = 0; i < polyCache.length; i++) {
    for (let j = i + 1; j < polyCache.length; j++) {
      if (polygonsOverlap(polyCache[i]!.points, polyCache[j]!.points)) {
        _issues.push({
          code: 'W2',
          level: 'warning',
          message: `Cômodos ${polyCache[i]!.roomId} e ${polyCache[j]!.roomId} se sobrepõem`,
          ids: [polyCache[i]!.roomId, polyCache[j]!.roomId],
        });
      }
    }
  }
}

/**
 * W3: móvel total **ou parcialmente** fora de qualquer cômodo.
 *
 * Contido é contido num cômodo só: um móvel com dois cantos num quarto e dois
 * no corredor está parcialmente fora dos dois, e é justamente o erro que o
 * aviso existe para pegar.
 */
function checkW3(doc: PlanDocument, issues: ValidationIssue[]): void {
  if (doc.rooms.length === 0) return;

  for (const item of doc.furniture) {
    const corners = obbCorners(item.center, item.width, item.depth, item.rotation);
    const contained = doc.rooms.some((room) => {
      const points = resolveLoop(doc, room.loop);
      return points !== null && containment(corners, points) === 'inside';
    });

    if (!contained) {
      issues.push({
        code: 'W3',
        level: 'warning',
        message: `Móvel ${item.name} (${item.id}) está total ou parcialmente fora dos cômodos`,
        ids: [item.id],
      });
    }
  }
}

/**
 * W4: móvel colide com outro móvel, por SAT (`02-unidades-e-geometria.md`
 * § Geometria de mobília).
 *
 * Item `outline` não participa: sobrepor um gabarito de giro de cadeira de
 * rodas a uma cadeira é o gesto que ele existe para permitir.
 */
function checkW4(doc: PlanDocument, issues: ValidationIssue[]): void {
  const solid = doc.furniture.filter((item) => item.outline !== true);
  const corners = solid.map((item) =>
    obbCorners(item.center, item.width, item.depth, item.rotation),
  );

  for (let i = 0; i < solid.length; i++) {
    for (let j = i + 1; j < solid.length; j++) {
      if (satOverlap(corners[i]!, corners[j]!)) {
        issues.push({
          code: 'W4',
          level: 'warning',
          message: `Móveis ${solid[i]!.name} e ${solid[j]!.name} colidem`,
          ids: [solid[i]!.id, solid[j]!.id],
        });
      }
    }
  }
}

function checkW5(doc: PlanDocument, _issues: ValidationIssue[]): void {
  // W5: Existe nó órfão
  const referenced = new Set<string>();

  for (const room of doc.rooms) {
    for (const id of room.loop) referenced.add(id);
  }
  for (const wall of doc.walls) {
    referenced.add(wall.a);
    referenced.add(wall.b);
  }

  for (const node of doc.nodes) {
    if (!referenced.has(node.id)) {
      _issues.push({
        code: 'W5',
        level: 'warning',
        message: `Nó ${node.id} é órfão (não referenciado por nenhum cômodo ou parede)`,
        ids: [node.id],
      });
    }
  }
}

// ============================================================
// Helpers locais
//
// A geometria vem de `core/geometry`, que não importa `model` — a direção
// é de mão única e não há ciclo. O que sobra aqui é resolução de referência
// e a interseção de segmentos que só W1 e W2 usam.
// ============================================================

function resolveLoop(doc: PlanDocument, loop: string[]): Point[] | null {
  const nodeMap = new Map(doc.nodes.map((n) => [n.id, n]));
  const result: Point[] = [];
  for (const id of loop) {
    const n = nodeMap.get(id as unknown as NodeId);
    if (!n) return null;
    result.push({ x: n.x, y: n.y });
  }
  return result;
}

function isSelfIntersecting(points: { x: number; y: number }[]): boolean {
  const n = points.length;
  if (n < 4) return false;

  for (let i = 0; i < n; i++) {
    const a1 = points[i]!;
    const a2 = points[(i + 1) % n]!;
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue; // arestas adjacentes
      const b1 = points[j]!;
      const b2 = points[(j + 1) % n]!;
      if (segmentsIntersect(a1, a2, b1, b2)) {
        return true;
      }
    }
  }
  return false;
}

function segmentsIntersect(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  d: { x: number; y: number },
): boolean {
  const cross = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number,
  ): number => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

  const d1 = cross(c.x, c.y, d.x, d.y, a.x, a.y);
  const d2 = cross(c.x, c.y, d.x, d.y, b.x, b.y);
  const d3 = cross(a.x, a.y, b.x, b.y, c.x, c.y);
  const d4 = cross(a.x, a.y, b.x, b.y, d.x, d.y);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }

  // Colinear — não considerado interseção para W1
  return false;
}

function polygonsOverlap(
  a: { x: number; y: number }[],
  b: { x: number; y: number }[],
): boolean {
  // Testa se algum vértice de a está dentro de b ou vice-versa
  for (const p of a) {
    if (pointInPolygon(p, b)) return true;
  }
  for (const p of b) {
    if (pointInPolygon(p, a)) return true;
  }
  // Testa interseção de arestas
  for (let i = 0; i < a.length; i++) {
    const a1 = a[i]!;
    const a2 = a[(i + 1) % a.length]!;
    for (let j = 0; j < b.length; j++) {
      const b1 = b[j]!;
      const b2 = b[(j + 1) % b.length]!;
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

function getEdgeLength(
  doc: PlanDocument,
  edge: EdgeRef,
): number | null {
  if (edge.kind === 'wall') {
    const wall = doc.walls.find((w) => w.id === edge.wallId);
    if (!wall) return null;
    const a = doc.nodes.find((n) => n.id === wall.a);
    const b = doc.nodes.find((n) => n.id === wall.b);
    if (!a || !b) return null;
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  const room = doc.rooms.find((r) => r.id === edge.roomId);
  if (!room) return null;
  const idx = edge.index;
  const len = room.loop.length;
  const aId = room.loop[idx % len]!;
  const bId = room.loop[(idx + 1) % len]!;
  const a = doc.nodes.find((n) => n.id === aId);
  const b = doc.nodes.find((n) => n.id === bId);
  if (!a || !b) return null;
  return Math.hypot(b.x - a.x, b.y - a.y);
}
