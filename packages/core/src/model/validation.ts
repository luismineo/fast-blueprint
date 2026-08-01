// ============================================================
// Validação de invariantes — spec 01 § Invariantes
// ============================================================

import type { PlanDocument, Node, Room, Wall, Opening, FurnitureItem, EdgeRef, NodeId } from './types';

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

function checkW3(doc: PlanDocument, _issues: ValidationIssue[]): void {
  // W3: Móvel está total ou parcialmente fora de qualquer cômodo
  for (const item of doc.furniture) {
    const corners = getFurnitureCorners(item);
    const allOutside = doc.rooms.every((room) => {
      const roomPoints = resolveLoop(doc, room.loop);
      if (!roomPoints) return true;
      return corners.every((c) => !pointInPolygon(c, roomPoints));
    });
    if (allOutside && doc.rooms.length > 0) {
      _issues.push({
        code: 'W3',
        level: 'warning',
        message: `Móvel ${item.name} (${item.id}) está fora de todos os cômodos`,
        ids: [item.id],
      });
    }
  }
}

function checkW4(doc: PlanDocument, _issues: ValidationIssue[]): void {
  // W4: Móvel colide com outro móvel
  for (let i = 0; i < doc.furniture.length; i++) {
    for (let j = i + 1; j < doc.furniture.length; j++) {
      if (furnitureOverlap(doc.furniture[i]!, doc.furniture[j]!)) {
        _issues.push({
          code: 'W4',
          level: 'warning',
          message: `Móveis ${doc.furniture[i]!.name} e ${doc.furniture[j]!.name} colidem`,
          ids: [doc.furniture[i]!.id, doc.furniture[j]!.id],
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
// Helpers de geometria (locais, duplicados de core/geometry
// para evitar dependência circular)
// ============================================================

function resolveLoop(
  doc: PlanDocument,
  loop: string[],
): { x: number; y: number }[] | null {
  const nodeMap = new Map(doc.nodes.map((n) => [n.id, n]));
  const result: { x: number; y: number }[] = [];
  for (const id of loop) {
    const n = nodeMap.get(id as unknown as NodeId);
    if (!n) return null;
    result.push({ x: n.x, y: n.y });
  }
  return result;
}

function pointInPolygon(
  p: { x: number; y: number },
  poly: { x: number; y: number }[],
): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i]!.x;
    const yi = poly[i]!.y;
    const xj = poly[j]!.x;
    const yj = poly[j]!.y;

    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
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

function getFurnitureCorners(item: FurnitureItem): { x: number; y: number }[] {
  const hw = item.width / 2;
  const hd = item.depth / 2;
  const angle = (item.rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const cx = item.center.x;
  const cy = item.center.y;

  const localCorners = [
    { x: -hw, y: -hd },
    { x: hw, y: -hd },
    { x: hw, y: hd },
    { x: -hw, y: hd },
  ];

  return localCorners.map((c) => ({
    x: cx + c.x * cos - c.y * sin,
    y: cy + c.x * sin + c.y * cos,
  }));
}

function furnitureOverlap(a: FurnitureItem, b: FurnitureItem): boolean {
  // Simplificação: bounding-box overlap
  const ca = getFurnitureCorners(a);
  const cb = getFurnitureCorners(b);

  const aMinX = Math.min(...ca.map((c) => c.x));
  const aMaxX = Math.max(...ca.map((c) => c.x));
  const aMinY = Math.min(...ca.map((c) => c.y));
  const aMaxY = Math.max(...ca.map((c) => c.y));

  const bMinX = Math.min(...cb.map((c) => c.x));
  const bMaxX = Math.max(...cb.map((c) => c.x));
  const bMinY = Math.min(...cb.map((c) => c.y));
  const bMaxY = Math.max(...cb.map((c) => c.y));

  return aMinX < bMaxX && aMaxX > bMinX && aMinY < bMaxY && aMaxY > bMinY;
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
