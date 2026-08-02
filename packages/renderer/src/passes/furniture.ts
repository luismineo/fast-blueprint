import {
  convexIntersection,
  formatDimensions,
  furnitureFlags,
  satOverlap,
  writeObbCorners,
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

interface FurnitureStyles {
  readonly fill: FillStyle
  readonly stroke: LineStyle
  readonly dashed: LineStyle
  readonly orientation: LineStyle
  readonly hatch: LineStyle
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

    // Marca de orientação na face frontal — a borda em +depth, oposta ao fundo
    // que encosta na parede.
    ctx.target.line(
      screen[2]!.x,
      screen[2]!.y,
      screen[3]!.x,
      screen[3]!.y,
      styles.orientation,
    )

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
