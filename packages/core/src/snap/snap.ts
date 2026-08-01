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

export interface SnapTarget {
  kind: 'node' | 'axis';
  nodeId?: NodeId;
}

export interface SnapResult {
  point: Point;
  targets: SnapTarget[];
  merged: NodeId | null;
}

export interface SnapConfig {
  nodeTolerancePx: number;
  nodeToleranceMinMm: number;
  nodeToleranceMaxMm: number;
  axisTolerancePx: number;
  axisToleranceMinMm: number;
  axisToleranceMaxMm: number;
  gridTolerancePx: number;
  gridToleranceMaxMm: number;
  gridSize: number;
}

export interface SnapContext {
  nodes: SnapNode[];
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
  axisTolerancePx: 8,
  axisToleranceMinMm: 2,
  axisToleranceMaxMm: 40,
  gridTolerancePx: 6,
  gridToleranceMaxMm: 50,
  gridSize: 100,
};

/**
 * Resolve o snap para um ponto de entrada.
 * Três classes em ordem: nó → eixo → grid.
 */
export function resolveSnap(
  point: Point,
  ctx: SnapContext,
  config: SnapConfig = DEFAULT_CONFIG,
): SnapResult {
  // Alt desliga tudo
  if (ctx.alt) {
    return { point: { ...point }, targets: [], merged: null };
  }

  // Classe 1 — Âncora de nó
  const nodeToleranceMm = clampTolerance(
    config.nodeTolerancePx / ctx.scale,
    config.nodeToleranceMinMm,
    config.nodeToleranceMaxMm,
  );

  let closestNode: SnapNode | null = null;
  let closestDist = Infinity;

  for (const node of ctx.nodes) {
    const d = distance(point, node);
    if (d < nodeToleranceMm && d < closestDist) {
      closestNode = node;
      closestDist = d;
    }
  }

  if (closestNode) {
    return {
      point: { x: closestNode.x, y: closestNode.y },
      targets: [{ kind: 'node', nodeId: closestNode.id }],
      merged: closestNode.id,
    };
  }

  // Classe 2 — Eixo a partir da origem
  if (ctx.origin) {
    const axisToleranceMm = clampTolerance(
      config.axisTolerancePx / ctx.scale,
      config.axisToleranceMinMm,
      config.axisToleranceMaxMm,
    );

    const rawAngle = Math.atan2(point.y - ctx.origin.y, point.x - ctx.origin.x);
    const snappedAngle = snapAngle(rawAngle, ctx.shift);
    const dx = point.x - ctx.origin.x;
    const dy = point.y - ctx.origin.y;
    const dist = Math.hypot(dx, dy);

    // Projeta o ponto sobre o eixo
    const axisX = ctx.origin.x + Math.cos(snappedAngle);
    const axisY = ctx.origin.y + Math.sin(snappedAngle);
    const axisLen = Math.hypot(axisX - ctx.origin.x, axisY - ctx.origin.y);

    // Distância perpendicular ao eixo
    const perpDist =
      Math.abs(
        (axisY - ctx.origin.y) * point.x -
          (axisX - ctx.origin.x) * point.y +
          axisX * ctx.origin.y -
          axisY * ctx.origin.x,
      ) / axisLen;

    if (perpDist <= axisToleranceMm && dist > 0) {
      const projX = ctx.origin.x + Math.cos(snappedAngle) * dist;
      const projY = ctx.origin.y + Math.sin(snappedAngle) * dist;
      return {
        point: { x: projX, y: projY },
        targets: [{ kind: 'axis' }],
        merged: null,
      };
    }
  }

  // Classe 3 — Grid
  const gridToleranceMm = clampTolerance(
    config.gridTolerancePx / ctx.scale,
    1,
    Math.min(config.gridToleranceMaxMm, ctx.gridSize / 2),
  );

  const snappedX = snapToGrid(point.x, ctx.gridSize);
  const snappedY = snapToGrid(point.y, ctx.gridSize);
  const gridDist = distance(point, { x: snappedX, y: snappedY });

  if (gridDist <= gridToleranceMm) {
    return {
      point: { x: snappedX, y: snappedY },
      targets: [],
      merged: null,
    };
  }

  return { point: { ...point }, targets: [], merged: null };
}

function clampTolerance(
  px2mm: number,
  min: number,
  max: number,
): number {
  return Math.max(min, Math.min(max, px2mm));
}

export { DEFAULT_CONFIG };