import type { DrawTarget, LineStyle, TextStyle } from './DrawTarget'

export interface RecordedLine {
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
  readonly style: LineStyle
}

export interface RecordedText {
  readonly x: number
  readonly y: number
  readonly content: string
  readonly style: TextStyle
}

export class RecordingTarget implements DrawTarget {
  readonly clears: string[] = []
  readonly lines: RecordedLine[] = []
  readonly texts: RecordedText[] = []

  clear(color: string): void {
    this.clears.push(color)
  }

  line(x1: number, y1: number, x2: number, y2: number, style: LineStyle): void {
    this.lines.push({ x1, y1, x2, y2, style })
  }

  text(x: number, y: number, content: string, style: TextStyle): void {
    this.texts.push({ x, y, content, style })
  }
}
