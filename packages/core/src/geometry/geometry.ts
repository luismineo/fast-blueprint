// ============================================================
// Geometria pura — spec 02-unidades-e-geometria.md
// ============================================================

export interface Point {
  x: number;
  y: number;
}

/**
 * Área pelo método Shoelace (fórmula do cadarço).
 * Retorna valor com sinal: positivo = horário (Y cresce para baixo).
 * Resultado em mm².
 */
export function shoelaceArea(points: Point[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p = points[i]!;
    const q = points[(i + 1) % n]!;
    area += p.x * q.y - q.x * p.y;
  }
  return area / 2;
}

/**
 * Área absoluta do polígono (sempre positiva).
 */
export function polygonArea(points: Point[]): number {
  return Math.abs(shoelaceArea(points));
}

/**
 * Retorna true se o polígono está em sentido horário.
 * Com Y crescendo para baixo, shoelace positivo = horário.
 */
export function isClockwise(points: Point[]): boolean {
  return shoelaceArea(points) > 0;
}

/**
 * Normaliza o ciclo para sentido horário.
 * Se anti-horário, inverte a ordem.
 */
export function orientLoop(points: Point[]): Point[] {
  if (points.length < 3) return points;
  if (isClockwise(points)) return points;
  return [...points].reverse();
}

/**
 * Comprimento euclidiano entre dois pontos.
 */
export function edgeLength(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Centroide do polígono (média aritmética dos vértices).
 * Para polígonos côncavos, pode cair fora — o renderer cuida disso.
 */
export function centroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  const n = points.length;
  return { x: sx / n, y: sy / n };
}

/**
 * Ponto-em-polígono via ray casting.
 * Raio horizontal para +X, com tratamento de vértice conforme spec 02.
 */
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i]!.x;
    const yi = polygon[i]!.y;
    const xj = polygon[j]!.x;
    const yj = polygon[j]!.y;

    if (yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Projeta um ponto sobre a reta definida por dois pontos.
 * Retorna o parâmetro t (0 = lineStart, 1 = lineEnd) e o ponto projetado.
 */
export function projectPointOnLine(
  point: Point,
  lineStart: Point,
  lineEnd: Point,
): { t: number; point: Point } {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const len2 = dx * dx + dy * dy;

  if (len2 === 0) {
    return { t: 0, point: { x: lineStart.x, y: lineStart.y } };
  }

  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / len2;
  return {
    t,
    point: {
      x: lineStart.x + t * dx,
      y: lineStart.y + t * dy,
    },
  };
}

/**
 * Ponto mais próximo no segmento (clamp t em [0, 1]).
 */
export function closestPointOnSegment(
  point: Point,
  a: Point,
  b: Point,
): { t: number; point: Point } {
  const proj = projectPointOnLine(point, a, b);
  const t = Math.max(0, Math.min(1, proj.t));
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return {
    t,
    point: {
      x: a.x + t * dx,
      y: a.y + t * dy,
    },
  };
}

/**
 * Distância euclidiana entre dois pontos.
 */
export function distance(a: Point, b: Point): number {
  return edgeLength(a, b);
}

/**
 * Ângulo em radianos de a para b (0 = +X, cresce horário).
 */
export function angle(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/**
 * Ponto deslocado a partir de origin na direção e comprimento dados.
 * Ângulo em radianos (0 = +X, cresce horário).
 */
export function pointAtDistance(origin: Point, angleRad: number, length: number): Point {
  return {
    x: origin.x + Math.cos(angleRad) * length,
    y: origin.y + Math.sin(angleRad) * length,
  };
}

/**
 * Ângulo em radianos normalizado para direção cardinal mais próxima.
 * Com shift=true, inclui múltiplos de 45°.
 */
export function snapAngle(angleRad: number, shift: boolean): number {
  const stepDeg = shift ? 45 : 90;
  const stepRad = (stepDeg * Math.PI) / 180;
  return Math.round(angleRad / stepRad) * stepRad;
}

/**
 * Distância de um ponto a uma reta (distância perpendicular).
 */
export function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return distance(point, lineStart);
  return Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / len;
}

/**
 * Arredonda um número para o múltiplo mais próximo de gridSize.
 */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}