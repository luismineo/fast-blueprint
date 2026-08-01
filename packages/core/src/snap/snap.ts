// ============================================================
// Resolvedor de snap — ADR-0003, spec 02 § Snap
// ============================================================

import type { NodeId } from '../model';
import { distance, snapAngle, snapToGrid, type Point } from '../geometry';

export type { Point };

export interface SnapNode {
  id: NodeId;
  x: number;
  y: number;
}

/** Aresta considerada por ponto médio, projeção e extensão. */
export interface SnapEdge {
  a: Point;
  b: Point;
}

/**
 * Restrição que participou do resultado, com a geometria que a guia visual
 * precisa desenhar (`02-unidades-e-geometria.md` § Guias visuais).
 */
export type SnapTarget =
  | { kind: 'node'; at: Point; nodeId: NodeId }
  | { kind: 'midpoint'; at: Point }
  | { kind: 'axis'; from: Point; to: Point }
  | { kind: 'alignment'; from: Point; to: Point; nodeId: NodeId }
  | { kind: 'edge'; a: Point; b: Point }
  | { kind: 'extension'; a: Point; b: Point };

export interface SnapResult {
  point: Point;
  targets: SnapTarget[];
  merged: NodeId | null;
}

export interface SnapConfig {
  nodeTolerancePx: number;
  nodeToleranceMinMm: number;
  nodeToleranceMaxMm: number;
  lineTolerancePx: number;
  lineToleranceMinMm: number;
  lineToleranceMaxMm: number;
  gridTolerancePx: number;
  gridToleranceMaxMm: number;
  gridSize: number;
  /** Interseção mais distante que isto do cursor é descartada. */
  intersectionToleranceMm: number;
  /** Retas com ângulo menor que isto descartam a de menor prioridade. */
  minConstraintAngleDeg: number;
}

export interface SnapContext {
  nodes: SnapNode[];
  edges: SnapEdge[];
  origin: Point | null;
  gridSize: number;
  scale: number; // px/mm
  shift: boolean;
  alt: boolean;
}

const DEFAULT_CONFIG: SnapConfig = {
  nodeTolerancePx: 12,
  nodeToleranceMinMm: 2,
  nodeToleranceMaxMm: 30,
  lineTolerancePx: 8,
  lineToleranceMinMm: 2,
  lineToleranceMaxMm: 40,
  gridTolerancePx: 6,
  gridToleranceMaxMm: 50,
  gridSize: 100,
  intersectionToleranceMm: 40,
  minConstraintAngleDeg: 15,
};

// ============================================================
// Retas
// ============================================================

interface Line {
  at: Point;
  dir: Point; // unitário
}

const PRIORITY_AXIS = 1;
const PRIORITY_ALIGNMENT = 2;
const PRIORITY_EDGE = 3;
const PRIORITY_EXTENSION = 4;

interface Constraint {
  priority: number;
  line: Line;
  distance: number;
  segment: SnapEdge | null;
  target: (point: Point) => SnapTarget;
}

function perpendicularDistance(point: Point, line: Line): number {
  const dx = point.x - line.at.x;
  const dy = point.y - line.at.y;
  return Math.abs(dx * line.dir.y - dy * line.dir.x);
}

function projectOnLine(point: Point, line: Line): Point {
  const dx = point.x - line.at.x;
  const dy = point.y - line.at.y;
  const along = dx * line.dir.x + dy * line.dir.y;
  return {
    x: line.at.x + line.dir.x * along,
    y: line.at.y + line.dir.y * along,
  };
}

function intersect(a: Line, b: Line): Point | null {
  const denominator = a.dir.x * b.dir.y - a.dir.y * b.dir.x;
  if (denominator === 0) return null;
  const along =
    ((b.at.x - a.at.x) * b.dir.y - (b.at.y - a.at.y) * b.dir.x) / denominator;
  return { x: a.at.x + a.dir.x * along, y: a.at.y + a.dir.y * along };
}

function angleBetweenDeg(a: Line, b: Line): number {
  const cosine = Math.abs(a.dir.x * b.dir.x + a.dir.y * b.dir.y);
  return (Math.acos(Math.min(1, cosine)) * 180) / Math.PI;
}

/**
 * Zera componentes residuais de `Math.cos`/`Math.sin` em múltiplos de 90°.
 * Sem isso a direção horizontal carrega um `6e-17` em Y e a projeção deixa de
 * ser exata num domínio de milímetros inteiros.
 */
function cleanDirection(x: number, y: number): Point {
  return {
    x: Math.abs(x) < 1e-12 ? 0 : x,
    y: Math.abs(y) < 1e-12 ? 0 : y,
  };
}

function alignmentDirections(shift: boolean): readonly Point[] {
  const half = Math.SQRT1_2;
  return shift
    ? [
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: half, y: half },
        { x: half, y: -half },
      ]
    : [
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ];
}

// ============================================================
// resolveSnap
// ============================================================

/**
 * Resolve o snap para um ponto de entrada.
 *
 * Três classes em ordem (ADR-0003): âncora de ponto, restrição de reta, grid.
 * A Classe 1 é exclusiva — se qualquer âncora dispara, nenhuma restrição de
 * reta é avaliada depois.
 */
export function resolveSnap(
  point: Point,
  ctx: SnapContext,
  config: SnapConfig = DEFAULT_CONFIG,
): SnapResult {
  if (ctx.alt) {
    return { point: { ...point }, targets: [], merged: null };
  }

  const anchor = resolveAnchor(point, ctx, config);
  if (anchor) return anchor;

  const constraints = collectConstraints(point, ctx, config);
  if (constraints.length > 0) {
    return resolveConstraints(point, constraints, config);
  }

  return resolveGrid(point, ctx, config);
}

// ============================================================
// Classe 1 — Âncora de ponto
// ============================================================

function resolveAnchor(
  point: Point,
  ctx: SnapContext,
  config: SnapConfig,
): SnapResult | null {
  const tolerance = clampTolerance(
    config.nodeTolerancePx / ctx.scale,
    config.nodeToleranceMinMm,
    config.nodeToleranceMaxMm,
  );

  let best: SnapResult | null = null;
  let bestDistance = Infinity;

  for (const node of ctx.nodes) {
    const d = distance(point, node);
    if (d < tolerance && d < bestDistance) {
      bestDistance = d;
      best = {
        point: { x: node.x, y: node.y },
        targets: [{ kind: 'node', at: { x: node.x, y: node.y }, nodeId: node.id }],
        merged: node.id,
      };
    }
  }

  for (const edge of ctx.edges) {
    const middle = { x: (edge.a.x + edge.b.x) / 2, y: (edge.a.y + edge.b.y) / 2 };
    const d = distance(point, middle);
    if (d < tolerance && d < bestDistance) {
      bestDistance = d;
      // Ponto médio preenche `targets` mas deixa `merged = null`: não há nó
      // existente para reusar ali (ADR-0003 § Classe 1).
      best = {
        point: { ...middle },
        targets: [{ kind: 'midpoint', at: { ...middle } }],
        merged: null,
      };
    }
  }

  return best;
}

// ============================================================
// Classe 2 — Restrição de reta
// ============================================================

function collectConstraints(
  point: Point,
  ctx: SnapContext,
  config: SnapConfig,
): Constraint[] {
  const tolerance = clampTolerance(
    config.lineTolerancePx / ctx.scale,
    config.lineToleranceMinMm,
    config.lineToleranceMaxMm,
  );

  const found: Constraint[] = [];
  const axis = axisConstraint(point, ctx, tolerance);
  if (axis) found.push(axis);

  const alignment = alignmentConstraint(point, ctx, tolerance);
  if (alignment) found.push(alignment);

  for (const constraint of edgeConstraints(point, ctx, tolerance)) {
    found.push(constraint);
  }

  return found;
}

function axisConstraint(
  point: Point,
  ctx: SnapContext,
  tolerance: number,
): Constraint | null {
  const origin = ctx.origin;
  if (!origin) return null;
  if (distance(point, origin) === 0) return null;

  const raw = Math.atan2(point.y - origin.y, point.x - origin.x);
  const snapped = snapAngle(raw, ctx.shift);
  const line: Line = {
    at: origin,
    dir: cleanDirection(Math.cos(snapped), Math.sin(snapped)),
  };

  const d = perpendicularDistance(point, line);
  if (d > tolerance) return null;

  return {
    priority: PRIORITY_AXIS,
    line,
    distance: d,
    segment: null,
    target: (resolved) => ({ kind: 'axis', from: origin, to: resolved }),
  };
}

function alignmentConstraint(
  point: Point,
  ctx: SnapContext,
  tolerance: number,
): Constraint | null {
  let best: Constraint | null = null;

  for (const node of ctx.nodes) {
    for (const dir of alignmentDirections(ctx.shift)) {
      const line: Line = { at: { x: node.x, y: node.y }, dir };
      const d = perpendicularDistance(point, line);
      if (d > tolerance) continue;
      if (best && d >= best.distance) continue;

      best = {
        priority: PRIORITY_ALIGNMENT,
        line,
        distance: d,
        segment: null,
        target: (resolved) => ({
          kind: 'alignment',
          from: { x: node.x, y: node.y },
          to: resolved,
          nodeId: node.id,
        }),
      };
    }
  }

  return best;
}

/**
 * Projeção sobre aresta e extensão de aresta.
 *
 * Fronteira: pé da projeção estritamente entre os extremos é aresta; fora, é
 * extensão (`02-unidades-e-geometria.md` § Fronteira aresta/extensão).
 */
function edgeConstraints(
  point: Point,
  ctx: SnapContext,
  tolerance: number,
): Constraint[] {
  let bestEdge: Constraint | null = null;
  let bestExtension: Constraint | null = null;

  for (const edge of ctx.edges) {
    const length = distance(edge.a, edge.b);
    if (length === 0) continue;

    const dir: Point = {
      x: (edge.b.x - edge.a.x) / length,
      y: (edge.b.y - edge.a.y) / length,
    };
    const line: Line = { at: edge.a, dir };
    const d = perpendicularDistance(point, line);
    if (d > tolerance) continue;

    const along =
      ((point.x - edge.a.x) * dir.x + (point.y - edge.a.y) * dir.y) / length;
    const onSegment = along > 0 && along < 1;

    const constraint: Constraint = {
      priority: onSegment ? PRIORITY_EDGE : PRIORITY_EXTENSION,
      line,
      distance: d,
      segment: onSegment ? edge : null,
      target: (): SnapTarget => ({
        kind: onSegment ? 'edge' : 'extension',
        a: edge.a,
        b: edge.b,
      }),
    };

    if (onSegment) {
      if (!bestEdge || d < bestEdge.distance) bestEdge = constraint;
    } else if (!bestExtension || d < bestExtension.distance) {
      bestExtension = constraint;
    }
  }

  const found: Constraint[] = [];
  if (bestEdge) found.push(bestEdge);
  if (bestExtension) found.push(bestExtension);
  return found;
}

function resolveConstraints(
  point: Point,
  constraints: Constraint[],
  config: SnapConfig,
): SnapResult {
  constraints.sort((a, b) => a.priority - b.priority || a.distance - b.distance);

  const primary = constraints[0]!;
  const secondary = constraints[1];

  if (!secondary) return projectedResult(point, primary);

  if (angleBetweenDeg(primary.line, secondary.line) < config.minConstraintAngleDeg) {
    return projectedResult(point, primary);
  }

  const crossing = intersect(primary.line, secondary.line);
  if (!crossing) return projectedResult(point, primary);
  if (distance(crossing, point) > config.intersectionToleranceMm) {
    return projectedResult(point, primary);
  }
  if (!withinSegment(crossing, primary) || !withinSegment(crossing, secondary)) {
    return projectedResult(point, primary);
  }

  return {
    point: crossing,
    targets: [primary.target(crossing), secondary.target(crossing)],
    merged: null,
  };
}

function withinSegment(point: Point, constraint: Constraint): boolean {
  const segment = constraint.segment;
  if (!segment) return true;

  const length = distance(segment.a, segment.b);
  if (length === 0) return false;

  const along =
    ((point.x - segment.a.x) * constraint.line.dir.x +
      (point.y - segment.a.y) * constraint.line.dir.y) /
    length;
  return along >= 0 && along <= 1;
}

function projectedResult(point: Point, constraint: Constraint): SnapResult {
  const resolved = projectOnLine(point, constraint.line);
  return { point: resolved, targets: [constraint.target(resolved)], merged: null };
}

// ============================================================
// Classe 3 — Grid
// ============================================================

function resolveGrid(
  point: Point,
  ctx: SnapContext,
  config: SnapConfig,
): SnapResult {
  const tolerance = clampTolerance(
    config.gridTolerancePx / ctx.scale,
    1,
    Math.min(config.gridToleranceMaxMm, ctx.gridSize / 2),
  );

  const snapped = {
    x: snapToGrid(point.x, ctx.gridSize),
    y: snapToGrid(point.y, ctx.gridSize),
  };

  if (distance(point, snapped) <= tolerance) {
    return { point: snapped, targets: [], merged: null };
  }

  return { point: { ...point }, targets: [], merged: null };
}

function clampTolerance(px2mm: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, px2mm));
}

export { DEFAULT_CONFIG };
