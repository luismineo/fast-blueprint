import type { DrawTarget, LineStyle, TextStyle } from './DrawTarget'

export class CanvasTarget implements DrawTarget {
  private readonly ctx: CanvasRenderingContext2D

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx
  }

  clear(color: string): void {
    const { canvas } = this.ctx
    this.ctx.save()
    this.ctx.resetTransform()
    this.ctx.fillStyle = color
    this.ctx.fillRect(0, 0, canvas.width, canvas.height)
    this.ctx.restore()
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

  text(x: number, y: number, content: string, style: TextStyle): void {
    this.ctx.save()
    this.ctx.fillStyle = style.color
    this.ctx.font = style.font
    this.ctx.textAlign = style.align ?? 'left'
    this.ctx.textBaseline = style.baseline ?? 'alphabetic'
    this.ctx.fillText(content, x, y)
    this.ctx.restore()
  }
}
