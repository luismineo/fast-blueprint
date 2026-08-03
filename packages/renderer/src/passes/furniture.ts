import {
  convexIntersection,
  formatDimensions,
  furnitureFlags,
  roundMm,
  satOverlap,
  writeArcPoints,
  writeObbCorners,
  type FurnitureGlyph,
  type FurnitureItem,
  type PlanDocument,
  type Point,
} from '@planta/core'
import type { RenderContext } from '../renderContext'
import { worldToScreenX, worldToScreenY } from '../camera'
import type { FillStyle, LineStyle, TextStyle } from '../target/DrawTarget'
import type { Theme } from '../theme'

const OUTLINE_DASH = [6, 4] as const
const ORIENTATION_WIDTH_PX = 2
const HATCH_SPACING_PX = 6
const LABEL_GAP_PX = 2
const MIN_LABEL_WIDTH_PX = 56
const MIN_LABEL_HEIGHT_PX = 26
const GLYPH_MIN_SCREEN_PX = 24

interface FurnitureStyles {
  readonly fill: FillStyle
  readonly stroke: LineStyle
  readonly dashed: LineStyle
  readonly orientation: LineStyle
  readonly hatch: LineStyle
  readonly glyph: LineStyle
  readonly name: TextStyle
  readonly size: TextStyle
}

const styleCache = new WeakMap<Theme, FurnitureStyles>()

function furnitureStyles(theme: Theme): FurnitureStyles {
  const cached = styleCache.get(theme)
  if (cached) return cached

  const styles: FurnitureStyles = {
    fill: { color: theme.furnitureFill },
    stroke: { color: theme.furnitureStroke, width: 1 },
    dashed: { color: theme.outsideRoom, width: 1, dash: OUTLINE_DASH },
    orientation: { color: theme.furnitureStroke, width: ORIENTATION_WIDTH_PX },
    hatch: { color: theme.collision, width: 1 },
    glyph: { color: theme.glyph, width: 1 },
    name: {
      color: theme.furnitureLabel,
      font: '11px Inter, sans-serif',
      align: 'center',
      baseline: 'bottom',
    },
    size: {
      color: theme.furnitureLabel,
      font: '10px "IBM Plex Mono", monospace',
      align: 'center',
      baseline: 'top',
    },
  }

  styleCache.set(theme, styles)
  return styles
}

/** Buffers reaproveitados entre frames: nenhuma alocação dentro do pass. */
const corners: Point[] = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
]
const screen: Point[] = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
]
const other: Point[] = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
]
/** Buffer para achatamento de arco de glifo — 24 segmentos para círculo cheio. */
const arcBuffer: Point[] = Array.from({ length: 24 }, () => ({ x: 0, y: 0 }))
/** Buffer para polilinha do glifo em espaço de tela. */
const glyphPoints: Point[] = Array.from({ length: 25 }, () => ({ x: 0, y: 0 }))

/**
 * Pass 5: retângulos de móveis, rótulos, marca de orientação e hachura de
 * colisão.
 *
 * Espaço de tela: o pass carrega texto, e espessura de contorno e passo de
 * hachura são constantes em pixels (`04-renderizacao.md` § Espessura
 * constante).
 */
export function furniturePass(ctx: RenderContext): void {
  const doc = ctx.doc
  if (!doc || doc.furniture.length === 0) return

  const styles = furnitureStyles(ctx.theme)
  const flags = furnitureFlags(doc)

  for (const item of doc.furniture) {
    writeObbCorners(corners, item.center, item.width, item.depth, item.rotation)
    toScreen(ctx, corners)

    const dashed = item.outline === true || flags.outsideRoom.has(item.id)

    if (item.outline !== true) {
      ctx.target.filledPolygon(screen, item.color === null ? styles.fill : { color: item.color })
    }

    ctx.target.polyline(screen, dashed ? styles.dashed : styles.stroke)

    const glyph = ctx.glyphs?.get(item.catalogId ?? '')
    const widthPx = item.width * ctx.camera.scale
    const depthPx = item.depth * ctx.camera.scale

    if (glyph && widthPx > GLYPH_MIN_SCREEN_PX && depthPx > GLYPH_MIN_SCREEN_PX) {
      drawGlyph(ctx, item, glyph, styles.glyph)
    } else {
      ctx.target.line(
        screen[2]!.x,
        screen[2]!.y,
        screen[3]!.x,
        screen[3]!.y,
        styles.orientation,
      )
    }

    drawLabel(ctx, item, styles)
  }

  drawCollisions(ctx, doc, styles)
}

/** Converte os quatro cantos e fecha o anel no quinto ponto do buffer. */
function toScreen(ctx: RenderContext, world: readonly Point[]): void {
  for (let i = 0; i < 4; i += 1) {
    screen[i]!.x = worldToScreenX(ctx.camera, world[i]!.x)
    screen[i]!.y = worldToScreenY(ctx.camera, world[i]!.y)
  }
  screen[4]!.x = screen[0]!.x
  screen[4]!.y = screen[0]!.y
}

function drawLabel(
  ctx: RenderContext,
  item: FurnitureItem,
  styles: FurnitureStyles,
): void {
  const widthPx = item.width * ctx.camera.scale
  const depthPx = item.depth * ctx.camera.scale
  if (widthPx < MIN_LABEL_WIDTH_PX || depthPx < MIN_LABEL_HEIGHT_PX) return

  const cx = worldToScreenX(ctx.camera, item.center.x)
  const cy = worldToScreenY(ctx.camera, item.center.y)

  ctx.target.text(cx, cy - LABEL_GAP_PX, item.name, styles.name)
  ctx.target.text(cx, cy + LABEL_GAP_PX, formatDimensions(item.width, item.depth), styles.size)
}

/**
 * Hachura na região comum a dois móveis.
 *
 * A região é o polígono de interseção, e a hachura são segmentos a 45°
 * recortados a ele — `DrawTarget` não tem `clip` nem `pattern`, e acrescentá-
 * los obrigaria o backend SVG do export a implementar os dois.
 *
 * O laço é O(n²), mas só chega aqui quem já está marcado como em colisão pelo
 * seletor memoizado: com nenhuma sobreposição, o custo é uma varredura da
 * lista.
 */
function drawCollisions(
  ctx: RenderContext,
  doc: PlanDocument,
  styles: FurnitureStyles,
): void {
  const flags = furnitureFlags(doc)
  if (flags.colliding.size === 0) return

  for (let i = 0; i < doc.furniture.length; i += 1) {
    const a = doc.furniture[i]!
    if (!flags.colliding.has(a.id)) continue

    writeObbCorners(corners, a.center, a.width, a.depth, a.rotation)

    for (let j = i + 1; j < doc.furniture.length; j += 1) {
      const b = doc.furniture[j]!
      if (!flags.colliding.has(b.id)) continue

      writeObbCorners(other, b.center, b.width, b.depth, b.rotation)
      if (!satOverlap(corners, other)) continue

      hatch(ctx, convexIntersection(corners, other), styles)
    }
  }
}

function hatch(ctx: RenderContext, region: readonly Point[], styles: FurnitureStyles): void {
  if (region.length < 3) return

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const point of region) {
    const x = worldToScreenX(ctx.camera, point.x)
    const y = worldToScreenY(ctx.camera, point.y)
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }

  // Diagonais a 45° varrendo a caixa da região, cada uma recortada ao polígono.
  const span = maxX - minX + (maxY - minY)
  for (let offset = 0; offset <= span; offset += HATCH_SPACING_PX) {
    clipHatchLine(ctx, region, minX + offset, minY, minX, minY + offset, styles)
  }
}

const entry: Point = { x: 0, y: 0 }
const exit: Point = { x: 0, y: 0 }

function clipHatchLine(
  ctx: RenderContext,
  region: readonly Point[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  styles: FurnitureStyles,
): void {
  let found = 0

  for (let i = 0; i < region.length; i += 1) {
    const from = region[i]!
    const to = region[(i + 1) % region.length]!

    const ax = worldToScreenX(ctx.camera, from.x)
    const ay = worldToScreenY(ctx.camera, from.y)
    const bx = worldToScreenX(ctx.camera, to.x)
    const by = worldToScreenY(ctx.camera, to.y)

    const denominator = (x2 - x1) * (by - ay) - (y2 - y1) * (bx - ax)
    if (denominator === 0) continue

    const t = ((ax - x1) * (by - ay) - (ay - y1) * (bx - ax)) / denominator
    const u = ((ax - x1) * (y2 - y1) - (ay - y1) * (x2 - x1)) / denominator
    if (u < 0 || u > 1) continue

    const target = found === 0 ? entry : exit
    target.x = x1 + (x2 - x1) * t
    target.y = y1 + (y2 - y1) * t
    found += 1
    if (found === 2) break
  }

  if (found === 2) {
    ctx.target.line(entry.x, entry.y, exit.x, exit.y, styles.hatch)
  }
}

/**
 * Expande as primitivas do glifo em coordenadas de mundo e desenha sobre
 * o retângulo do móvel.
 *
 * Cada primitiva é convertida do espaço [0,1]² para o sistema local do móvel
 * (centralizado), depois rotacionada e transladada para mundo, e finalmente
 * para tela.
 */
function drawGlyph(
  ctx: RenderContext,
  item: FurnitureItem,
  glyph: FurnitureGlyph,
  style: LineStyle,
): void {
  const hw = item.width / 2
  const hd = item.depth / 2
  const rad = (item.rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const cx = item.center.x
  const cy = item.center.y

  for (const prim of glyph.primitives) {
    switch (prim.kind) {
      case 'line':
        drawGlyphLine(ctx, prim.x1, prim.y1, prim.x2, prim.y2, hw, hd, cx, cy, cos, sin, style)
        break
      case 'rect':
        drawGlyphRect(ctx, prim, hw, hd, cx, cy, cos, sin, style)
        break
      case 'circle':
        drawGlyphArc(
          ctx, prim.cx, prim.cy, prim.r, 0, 2 * Math.PI, true,
          hw, hd, cx, cy, cos, sin, style,
        )
        break
      case 'arc':
        drawGlyphArc(
          ctx, prim.cx, prim.cy, prim.r, prim.startAngle, prim.endAngle, prim.closed,
          hw, hd, cx, cy, cos, sin, style,
        )
        break
    }
  }
}

/**
 * Ponto local (pré-rotação) reaproveitado por `drawGlyphLine` — nenhuma
 * alocação por segmento de glifo (`04-renderizacao.md` § Orçamento de
 * performance, regra 2).
 */
const glyphLocalA: Point = { x: 0, y: 0 }
const glyphLocalB: Point = { x: 0, y: 0 }

function writeGlyphWorld(
  out: Point,
  gx: number, gy: number,
  hw: number, hd: number, cx: number, cy: number,
  cos: number, sin: number,
): void {
  const lx = (gx - 0.5) * hw * 2
  const ly = (gy - 0.5) * hd * 2
  out.x = roundMm(cx + lx * cos - ly * sin)
  out.y = roundMm(cy + lx * sin + ly * cos)
}

function drawGlyphLine(
  ctx: RenderContext,
  x1: number, y1: number, x2: number, y2: number,
  hw: number, hd: number, cx: number, cy: number,
  cos: number, sin: number,
  style: LineStyle,
): void {
  writeGlyphWorld(glyphLocalA, x1, y1, hw, hd, cx, cy, cos, sin)
  writeGlyphWorld(glyphLocalB, x2, y2, hw, hd, cx, cy, cos, sin)
  ctx.target.line(
    worldToScreenX(ctx.camera, glyphLocalA.x),
    worldToScreenY(ctx.camera, glyphLocalA.y),
    worldToScreenX(ctx.camera, glyphLocalB.x),
    worldToScreenY(ctx.camera, glyphLocalB.y),
    style,
  )
}

function drawGlyphRect(
  ctx: RenderContext,
  prim: { x: number; y: number; w: number; h: number },
  hw: number, hd: number, cx: number, cy: number,
  cos: number, sin: number,
  style: LineStyle,
): void {
  const r = prim.x + prim.w
  const b = prim.y + prim.h

  drawGlyphLine(ctx, prim.x, prim.y, r, prim.y, hw, hd, cx, cy, cos, sin, style)
  drawGlyphLine(ctx, r, prim.y, r, b, hw, hd, cx, cy, cos, sin, style)
  drawGlyphLine(ctx, r, b, prim.x, b, hw, hd, cx, cy, cos, sin, style)
  drawGlyphLine(ctx, prim.x, b, prim.x, prim.y, hw, hd, cx, cy, cos, sin, style)
}

/**
 * Arco do glifo: achatado por `writeArcPoints` já em mm locais, rotacionado e
 * projetado para tela em `glyphPoints` — buffer fixo de 25 posições,
 * reaproveitado a cada chamada. `DrawTarget.polyline` recebe o `count` real,
 * então fechar o anel não precisa de `slice`.
 */
function drawGlyphArc(
  ctx: RenderContext,
  gcx: number, gcy: number, gr: number,
  startAngle: number, endAngle: number, closed: boolean,
  hw: number, hd: number, cx: number, cy: number,
  cos: number, sin: number,
  style: LineStyle,
): void {
  const width = hw * 2
  const depth = hd * 2
  const localCx = (gcx - 0.5) * width
  const localCy = (gcy - 0.5) * depth
  const count = writeArcPoints(arcBuffer, 0, localCx, localCy, gr * width, gr * depth, startAngle, endAngle)
  if (count < 2) return

  for (let i = 0; i < count; i += 1) {
    const lx = arcBuffer[i]!.x
    const ly = arcBuffer[i]!.y
    glyphPoints[i]!.x = worldToScreenX(ctx.camera, roundMm(cx + lx * cos - ly * sin))
    glyphPoints[i]!.y = worldToScreenY(ctx.camera, roundMm(cy + lx * sin + ly * cos))
  }

  if (!closed) {
    ctx.target.polyline(glyphPoints, style, count)
    return
  }

  glyphPoints[count]!.x = glyphPoints[0]!.x
  glyphPoints[count]!.y = glyphPoints[0]!.y
  ctx.target.polyline(glyphPoints, style, count + 1)
}
