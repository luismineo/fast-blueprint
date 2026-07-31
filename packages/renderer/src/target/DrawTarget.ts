export interface LineStyle {
  readonly color: string
  readonly width: number
  readonly opacity?: number
}

export interface TextStyle {
  readonly color: string
  readonly font: string
  readonly align?: 'left' | 'center' | 'right'
  readonly baseline?: 'top' | 'middle' | 'bottom' | 'alphabetic'
}

export interface DrawTarget {
  clear(color: string): void
  line(x1: number, y1: number, x2: number, y2: number, style: LineStyle): void
  text(x: number, y: number, content: string, style: TextStyle): void
}
