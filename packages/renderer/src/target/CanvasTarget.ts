import type { Camera } from '../camera'
import type { DrawTarget, LineStyle, TextStyle, FillStyle } from './DrawTarget'

export class CanvasTarget implements DrawTarget {
  private readonly ctx: CanvasRenderingContext2D
  private dpr: number

  constructor(ctx: CanvasRenderingContext2D, dpr = 1) {
    this.ctx = ctx
    this.dpr = dpr
  }

  setDevicePixelRatio(dpr: number): void {
    this.dpr = dpr
  }

  clear(color: string): void {
    const { canvas } = this.ctx
    this.ctx.save()
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.fillStyle = color
    this.ctx.fillRect(0, 0, canvas.width, canvas.height)
    this.ctx.restore()
  }

  setWorldTransform(camera: Camera): void {
    const scale = camera.scale * this.dpr
    this.ctx.setTransform(scale, 0, 0, scale, camera.tx * this.dpr, camera.ty * this.dpr)
  }

  resetTransform(): void {
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  line(x1: number, y1: number, x2: number, y2: number, style: LineStyle): void {
    this.ctx.save()
    this.ctx.globalAlpha = style.opacity ?? 1
    this.ctx.strokeStyle = style.color
    this.ctx.lineWidth = style.width
    this.ctx.beginPath()
    this.ctx.moveTo(x1, y1)
    this.ctx.lineTo(x2, y2)
    this.ctx.stroke()
    this.ctx.restore()
  }

  polyline(points: { x: number; y: number }[], style: LineStyle): void {
    if (points.length < 2) return
    this.ctx.save()
    this.ctx.globalAlpha = style.opacity ?? 1
    this.ctx.strokeStyle = style.color
    this.ctx.lineWidth = style.width
    this.ctx.beginPath()
    this.ctx.moveTo(points[0]!.x, points[0]!.y)
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i]!.x, points[i]!.y)
    }
    this.ctx.stroke()
    this.ctx.restore()
  }

  filledPolygon(points: { x: number; y: number }[], fill: FillStyle): void {
    if (points.length < 3) return
    this.ctx.save()
    this.ctx.globalAlpha = fill.opacity ?? 1
    this.ctx.fillStyle = fill.color
    this.ctx.beginPath()
    this.ctx.moveTo(points[0]!.x, points[0]!.y)
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i]!.x, points[i]!.y)
    }
    this.ctx.closePath()
    this.ctx.fill()
    this.ctx.restore()
  }

  text(x: number, y: number, content: string, style: TextStyle): void {
    this.ctx.save()
    this.ctx.fillStyle = style.color
    this.ctx.font = style.font
    this.ctx.textAlign = style.align ?? 'left'
    this.ctx.textBaseline = style.baseline ?? 'alphabetic'
    this.ctx.fillText(content, x, y)
    this.ctx.restore()
  }

  textRotated(x: number, y: number, content: string, angle: number, style: TextStyle): void {
    this.ctx.save()
    this.ctx.translate(x, y)
    this.ctx.rotate(angle)
    this.ctx.fillStyle = style.color
    this.ctx.font = style.font
    this.ctx.textAlign = style.align ?? 'center'
    this.ctx.textBaseline = style.baseline ?? 'middle'
    this.ctx.fillText(content, 0, 0)
    this.ctx.restore()
  }
}