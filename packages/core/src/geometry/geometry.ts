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
export function pointInPolygon(point: Point, polygon: readonly Point[]): boolean {
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

// ============================================================
// Geometria de mobília — spec 02 § Geometria de mobília
// ============================================================

/**
 * Tolerância da fronteira, em mm.
 *
 * O arredondamento para milímetro inteiro pode tirar um canto da reta da
 * parede em até √2/2 mm; 1 mm é o menor limiar inteiro que cobre isso.
 */
const BOUNDARY_TOLERANCE_MM = 1;

/**
 * Arredonda para milímetro inteiro, sem produzir `-0`.
 *
 * `Math.round` devolve `-0` para qualquer negativo minúsculo, e o resíduo de
 * `Math.cos`/`Math.sin` em múltiplos de 90° é exatamente isso. `-0` passa em
 * `===` mas falha em comparação estrutural — em `toEqual` de teste e no
 * round-trip de arquivo.
 */
export function roundMm(value: number): number {
  const rounded = Math.round(value);
  return rounded === 0 ? 0 : rounded;
}

/**
 * Cantos de um retângulo orientado, em milímetros inteiros.
 *
 * Ordem: os dois primeiros são a face **traseira** (borda em `−depth`, a que
 * encosta na parede), os dois últimos a face frontal
 * (`06-catalogo-de-mobilia.md` § Convenção de orientação).
 */
export function obbCorners(
  center: Point,
  width: number,
  depth: number,
  rotationDeg: number,
): Point[] {
  const out: Point[] = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];
  writeObbCorners(out, center, width, depth, rotationDeg);
  return out;
}

/**
 * Como `obbCorners`, escrevendo num buffer de quatro pontos já alocado.
 *
 * É o que o pass de mobília usa: nenhuma alocação dentro de um pass de desenho
 * (`04-renderizacao.md` § Orçamento de performance, regra 2).
 */
export function writeObbCorners(
  out: Point[],
  center: Point,
  width: number,
  depth: number,
  rotationDeg: number,
): void {
  const radians = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const hw = width / 2;
  const hd = depth / 2;

  writeCorner(out[0]!, center, -hw, -hd, cos, sin);
  writeCorner(out[1]!, center, hw, -hd, cos, sin);
  writeCorner(out[2]!, center, hw, hd, cos, sin);
  writeCorner(out[3]!, center, -hw, hd, cos, sin);
}

function writeCorner(
  target: Point,
  center: Point,
  x: number,
  y: number,
  cos: number,
  sin: number,
): void {
  target.x = roundMm(center.x + x * cos - y * sin);
  target.y = roundMm(center.y + x * sin + y * cos);
}

/**
 * Sobreposição entre dois polígonos convexos pelo teorema dos eixos
 * separadores.
 *
 * Para dois retângulos são os 4 eixos candidatos da spec 02 — as normais das
 * arestas de cada um, duas a duas paralelas. Contato exato **não** é
 * sobreposição: dois móveis encostados lado a lado são o arranjo normal de um
 * quarto pequeno, e acusá-los seria aviso falso em posição correta.
 */
export function satOverlap(a: readonly Point[], b: readonly Point[]): boolean {
  return !hasSeparatingAxis(a, b) && !hasSeparatingAxis(b, a);
}

/**
 * Projeções calculadas em variáveis locais, sem tupla de retorno: este caminho
 * roda por par de móveis a cada mudança de documento, e uma tupla por eixo
 * seriam oito alocações por par.
 */
function hasSeparatingAxis(from: readonly Point[], other: readonly Point[]): boolean {
  for (let i = 0; i < from.length; i += 1) {
    const start = from[i]!;
    const end = from[(i + 1) % from.length]!;
    const axisX = -(end.y - start.y);
    const axisY = end.x - start.x;
    if (axisX === 0 && axisY === 0) continue;

    let minA = Infinity;
    let maxA = -Infinity;
    for (const point of from) {
      const value = point.x * axisX + point.y * axisY;
      if (value < minA) minA = value;
      if (value > maxA) maxA = value;
    }

    let minB = Infinity;
    let maxB = -Infinity;
    for (const point of other) {
      const value = point.x * axisX + point.y * axisY;
      if (value < minB) minB = value;
      if (value > maxB) maxB = value;
    }

    if (maxA <= minB || maxB <= minA) return true;
  }
  return false;
}

/**
 * Distância entre dois segmentos. Zero quando eles se cruzam ou se tocam.
 *
 * Medir só de ponta a segmento erra o caso em que um atravessa o outro: os
 * extremos ficam longe e a interseção passa despercebida. É o que decide se um
 * móvel arrastado **por cima** de uma parede encosta nela
 * (`02-unidades-e-geometria.md` § Snap a parede).
 */
export function segmentDistance(a1: Point, a2: Point, b1: Point, b2: Point): number {
  if (segmentsCross(a1, a2, b1, b2)) return 0;

  return Math.min(
    distance(a1, closestPointOnSegment(a1, b1, b2).point),
    distance(a2, closestPointOnSegment(a2, b1, b2).point),
    distance(b1, closestPointOnSegment(b1, a1, a2).point),
    distance(b2, closestPointOnSegment(b2, a1, a2).point),
  );
}

function segmentsCross(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const side = (p: Point, q: Point, r: Point): number =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);

  const d1 = side(b1, b2, a1);
  const d2 = side(b1, b2, a2);
  const d3 = side(a1, a2, b1);
  const d4 = side(a1, a2, b2);

  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}

export type Containment = 'inside' | 'partial' | 'outside';

/**
 * Contenção de um retângulo num polígono, pelos quatro cantos.
 *
 * A fronteira conta como dentro (`01-modelo-de-dominio.md` § Invariantes): o
 * snap a parede põe dois cantos exatamente sobre a aresta, e o ray casting é
 * assimétrico ali — num retângulo com Y para baixo, o canto sobre a parede de
 * cima cai dentro e o canto sobre a de baixo cai fora.
 */
export function containment(
  corners: readonly Point[],
  polygon: readonly Point[],
): Containment {
  let inside = 0;
  for (const corner of corners) {
    if (pointInPolygonInclusive(corner, polygon)) inside += 1;
  }

  if (inside === 0) return 'outside';
  return inside === corners.length ? 'inside' : 'partial';
}

/** Ponto-em-polígono com a fronteira contando como dentro. */
export function pointInPolygonInclusive(point: Point, polygon: readonly Point[]): boolean {
  return onPolygonBoundary(point, polygon) || pointInPolygon(point, polygon);
}

/**
 * Ponto-em-polígono com a fronteira contando como **fora**.
 *
 * É o teste de quem pergunta "há área em comum?": dois cômodos que
 * compartilham uma parede têm vértices um na fronteira do outro, e o ray
 * casting responde ali de forma arbitrária (`01-modelo-de-dominio.md`
 * § Invariantes).
 */
export function pointStrictlyInPolygon(point: Point, polygon: readonly Point[]): boolean {
  return !onPolygonBoundary(point, polygon) && pointInPolygon(point, polygon);
}

function onPolygonBoundary(point: Point, polygon: readonly Point[]): boolean {
  for (let i = 0; i < polygon.length; i += 1) {
    const from = polygon[i]!;
    const to = polygon[(i + 1) % polygon.length]!;
    const foot = closestPointOnSegment(point, from, to).point;
    if (distance(point, foot) <= BOUNDARY_TOLERANCE_MM) return true;
  }
  return false;
}

/**
 * Região comum a dois polígonos convexos, por recorte de Sutherland–Hodgman.
 *
 * É o que a hachura de colisão desenha (`04-renderizacao.md` § Mobília).
 * Devolve lista vazia quando não há região comum.
 */
export function convexIntersection(
  subject: readonly Point[],
  clip: readonly Point[],
): Point[] {
  if (subject.length < 3 || clip.length < 3) return [];

  const window = orientLoop([...clip]);
  let output = orientLoop([...subject]);

  for (let i = 0; i < window.length && output.length > 0; i += 1) {
    output = clipAgainstEdge(output, window[i]!, window[(i + 1) % window.length]!);
  }

  return output;
}

/**
 * Recorte contra o semiplano interno de uma aresta.
 *
 * O ciclo está normalizado para horário, e com Y para baixo a normal interna é
 * `(-dy, dx)` — a mesma que a cota usa para desenhar por fora
 * (`04-renderizacao.md` § Cotas).
 */
function clipAgainstEdge(points: readonly Point[], from: Point, to: Point): Point[] {
  const normal: Point = { x: -(to.y - from.y), y: to.x - from.x };
  const side = (point: Point): number =>
    (point.x - from.x) * normal.x + (point.y - from.y) * normal.y;

  const output: Point[] = [];

  for (let i = 0; i < points.length; i += 1) {
    const current = points[i]!;
    const previous = points[(i + points.length - 1) % points.length]!;
    const currentInside = side(current) >= 0;
    const previousInside = side(previous) >= 0;

    if (currentInside !== previousInside) {
      const crossing = lineCrossing(previous, current, from, to);
      if (crossing) output.push(crossing);
    }
    if (currentInside) output.push(current);
  }

  return output;
}

function lineCrossing(a: Point, b: Point, c: Point, d: Point): Point | null {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const cdx = d.x - c.x;
  const cdy = d.y - c.y;

  const denominator = abx * cdy - aby * cdx;
  if (denominator === 0) return null;

  const t = ((c.x - a.x) * cdy - (c.y - a.y) * cdx) / denominator;
  return { x: a.x + abx * t, y: a.y + aby * t };
}

// ============================================================
// Achatamento de arco — adr/0006-glifos-de-mobilia.md § 3
// ============================================================

const FULL_CIRCLE_SEGMENTS = 24;

/**
 * Escreve os pontos de um arco elíptico achatado num buffer pré-alocado.
 *
 * O arco é definido no sistema de coordenadas local do móvel (já escalado por
 * width × depth). Os pontos são escritos em `out` a partir de `outOffset` e o
 * último ponto coincide com o primeiro quando o arco é um círculo completo —
 * não fecha o anel sozinho; o chamador decide se fecha.
 *
 * Ângulos em radianos, 0 = +X, crescendo no sentido horário (Y para baixo).
 *
 * Retorna o número de pontos escritos.
 */
export function writeArcPoints(
  out: Point[],
  outOffset: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  startAngle: number,
  endAngle: number,
  segments: number = FULL_CIRCLE_SEGMENTS,
): number {
  const sweep = endAngle - startAngle;
  const step = sweep / segments;

  for (let i = 0; i < segments; i += 1) {
    const angle = startAngle + step * i;
    out[outOffset + i]!.x = cx + rx * Math.cos(angle);
    out[outOffset + i]!.y = cy + ry * Math.sin(angle);
  }

  return segments;
}
