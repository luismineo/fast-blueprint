// ============================================================
// Snap a parede — spec 02 § Snap a parede
// ============================================================

import {
  closestPointOnSegment,
  distance,
  obbCorners,
  roundMm,
  type Point,
} from '../geometry';
import type { SnapEdge } from './snap';

export interface FurnitureSnapConfig {
  /** Distância da borda do móvel à aresta abaixo da qual ele encosta. */
  wallDistanceMm: number;
}

export const DEFAULT_FURNITURE_SNAP_CONFIG: FurnitureSnapConfig = {
  wallDistanceMm: 150,
};

export interface FurnitureSnapContext {
  edges: readonly SnapEdge[];
  alt: boolean;
}

export interface FurniturePlacement {
  center: Point;
  /** Graus inteiros, 0–359. */
  rotation: number;
}

export interface FurnitureSnapResult {
  placement: FurniturePlacement;
  /** Aresta que disparou, para a guia visual. `null` quando nada disparou. */
  edge: SnapEdge | null;
}

/**
 * Encosta o móvel na aresta mais próxima, quando há uma dentro da tolerância.
 *
 * A face traseira (borda em `−depth`) alinha com a aresta e a rotação se
 * ajusta à direção dela. A distância é medida entre o **retângulo** do móvel e
 * o segmento — a mínima entre os quatro cantos e ele —, não a partir do
 * centro: medir do centro faria o limiar depender do tamanho do móvel.
 *
 * O lado em que o móvel fica é o lado em que ele **já está**: a profundidade
 * cresce do ponto em que ele encosta para onde o cursor o levou. Isso vale
 * também para parede avulsa, que não tem "dentro".
 *
 * A posição ao longo da parede não é tocada — ela é o que o usuário controla
 * arrastando. O snap só resolve a distância perpendicular e a rotação.
 */
export function resolveFurnitureSnap(
  placement: FurniturePlacement,
  size: { width: number; depth: number },
  ctx: FurnitureSnapContext,
  config: FurnitureSnapConfig = DEFAULT_FURNITURE_SNAP_CONFIG,
): FurnitureSnapResult {
  if (ctx.alt) return { placement, edge: null };

  const corners = obbCorners(placement.center, size.width, size.depth, placement.rotation);

  let best: SnapEdge | null = null;
  let bestDistance = Infinity;

  for (const edge of ctx.edges) {
    if (distance(edge.a, edge.b) === 0) continue;

    const d = rectangleToSegment(corners, edge);
    if (d <= config.wallDistanceMm && d < bestDistance) {
      bestDistance = d;
      best = edge;
    }
  }

  if (!best) return { placement, edge: null };

  return { placement: attachTo(best, placement.center, size.depth), edge: best };
}

function rectangleToSegment(corners: readonly Point[], edge: SnapEdge): number {
  let closest = Infinity;
  for (const corner of corners) {
    const foot = closestPointOnSegment(corner, edge.a, edge.b).point;
    closest = Math.min(closest, distance(corner, foot));
  }
  return closest;
}

function attachTo(edge: SnapEdge, center: Point, depth: number): FurniturePlacement {
  const dx = edge.b.x - edge.a.x;
  const dy = edge.b.y - edge.a.y;
  const length = Math.hypot(dx, dy);
  const direction: Point = { x: dx / length, y: dy / length };

  // Normal apontando para o lado em que o móvel já está. Empate (centro
  // exatamente sobre a reta) cai para um lado fixo em vez de dividir por zero.
  const normal: Point = { x: -direction.y, y: direction.x };
  const side =
    (center.x - edge.a.x) * normal.x + (center.y - edge.a.y) * normal.y >= 0 ? 1 : -1;
  const inward: Point = { x: normal.x * side, y: normal.y * side };

  const along =
    (center.x - edge.a.x) * direction.x + (center.y - edge.a.y) * direction.y;
  const foot: Point = {
    x: edge.a.x + direction.x * along,
    y: edge.a.y + direction.y * along,
  };

  // A profundidade cresce da parede para dentro, então o centro fica a meia
  // profundidade da aresta, do lado de `inward`.
  return {
    center: {
      x: roundMm(foot.x + inward.x * (depth / 2)),
      y: roundMm(foot.y + inward.y * (depth / 2)),
    },
    rotation: rotationFor(inward),
  };
}

/**
 * Rotação em que o eixo local `+depth` aponta para `inward`.
 *
 * Com a rotação θ, o eixo local `+Y` em mundo é `(−sin θ, cos θ)`.
 */
function rotationFor(inward: Point): number {
  const radians = Math.atan2(-inward.x, inward.y);
  const degrees = Math.round((radians * 180) / Math.PI);
  return ((degrees % 360) + 360) % 360;
}
