import type { Camera } from '../camera'
import type { DrawTarget, LineStyle, TextStyle, FillStyle } from './DrawTarget'

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function styleToStroke(style: LineStyle): string {
  const parts: string[] = [
    `stroke="${style.color}"`,
    `stroke-width="${style.width}"`,
    `fill="none"`,
  ]
  if (style.opacity !== undefined && style.opacity !== 1) {
    parts.push(`opacity="${style.opacity}"`)
  }
  if (style.dash && style.dash.length > 0) {
    parts.push(`stroke-dasharray="${style.dash.join(' ')}"`)
  }
  return parts.join(' ')
}

function textAnchor(align: TextStyle['align']): string {
  switch (align) {
    case 'right': return 'end'
    case 'center': return 'middle'
    default: return 'start'
  }
}

function dominantBaseline(baseline: TextStyle['baseline']): string {
  switch (baseline) {
    case 'top': return 'text-before-edge'
    case 'middle': return 'central'
    case 'bottom': return 'text-after-edge'
    default: return 'auto'
  }
}

export class SvgTarget implements DrawTarget {
  private _elements: string[] = []
  private _worldTransform: Camera | null = null
  private _inWorldGroup = false

  clear(color: string): void {
    this._closeWorldGroup()
    this._elements.push(`<rect width="100%" height="100%" fill="${color}"/>`)
  }

  setWorldTransform(camera: Camera): void {
    this._closeWorldGroup()
    this._worldTransform = camera
    this._elements.push(
      `<g transform="matrix(${camera.scale},0,0,${camera.scale},${camera.tx},${camera.ty})">`,
    )
    this._inWorldGroup = true
  }

  resetTransform(): void {
    this._closeWorldGroup()
    this._worldTransform = null
  }

  line(x1: number, y1: number, x2: number, y2: number, style: LineStyle): void {
    this._elements.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${styleToStroke(style)}/>`,
    )
  }

  polyline(points: { x: number; y: number }[], style: LineStyle, count = points.length): void {
    if (count < 2) return
    const pts: string[] = []
    for (let i = 0; i < count; i++) {
      pts.push(`${points[i]!.x},${points[i]!.y}`)
    }
    this._elements.push(
      `<polyline points="${pts.join(' ')}" ${styleToStroke(style)}/>`,
    )
  }

  filledPolygon(points: { x: number; y: number }[], fill: FillStyle): void {
    if (points.length < 3) return
    const pts = points.map((p) => `${p.x},${p.y}`).join(' ')
    const opacity = fill.opacity !== undefined && fill.opacity !== 1
      ? ` opacity="${fill.opacity}"`
      : ''
    this._elements.push(
      `<polygon points="${pts}" fill="${fill.color}" stroke="none"${opacity}/>`,
    )
  }

  text(x: number, y: number, content: string, style: TextStyle): void {
    const anchor = textAnchor(style.align)
    const baseline = dominantBaseline(style.baseline)
    this._elements.push(
      `<text x="${x}" y="${y}" fill="${style.color}" font="${escapeXml(style.font)}" text-anchor="${anchor}" dominant-baseline="${baseline}">${escapeXml(content)}</text>`,
    )
  }

  textRotated(x: number, y: number, content: string, angle: number, style: TextStyle): void {
    const anchor = textAnchor(style.align ?? 'center')
    const baseline = dominantBaseline(style.baseline ?? 'middle')
    const degrees = (angle * 180) / Math.PI
    this._elements.push(
      `<text x="0" y="0" fill="${style.color}" font="${escapeXml(style.font)}" text-anchor="${anchor}" dominant-baseline="${baseline}" transform="translate(${x},${y}) rotate(${degrees})">${escapeXml(content)}</text>`,
    )
  }

  toSvg(width: number, height: number, viewBox?: string): string {
    this._closeWorldGroup()
    const vb = viewBox ?? `0 0 ${width} ${height}`
    const header = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${vb}">`
    return `${header}\n${this._elements.join('\n')}\n</svg>`
  }

  private _closeWorldGroup(): void {
    if (this._inWorldGroup) {
      this._elements.push('</g>')
      this._inWorldGroup = false
    }
  }
}
