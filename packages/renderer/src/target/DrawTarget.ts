import type { Camera } from '../camera'

export interface LineStyle {
  readonly color: string
  readonly width: number
  readonly opacity?: number
  readonly dash?: readonly number[]
}

export interface TextStyle {
  readonly color: string
  readonly font: string
  readonly align?: 'left' | 'center' | 'right'
  readonly baseline?: 'top' | 'middle' | 'bottom' | 'alphabetic'
}

export interface FillStyle {
  readonly color: string
  readonly opacity?: number
}

export interface DrawTarget {
  clear(color: string): void
  setWorldTransform(camera: Camera): void
  resetTransform(): void
  line(x1: number, y1: number, x2: number, y2: number, style: LineStyle): void
  /**
   * `count`, se informado, desenha só os primeiros `count` pontos de `points`.
   * Existe para o chamador reaproveitar um buffer de tamanho fixo maior que o
   * anel do momento, sem precisar de `slice` (`04-renderizacao.md` § Orçamento
   * de performance, regra 2).
   */
  polyline(points: { x: number; y: number }[], style: LineStyle, count?: number): void
  filledPolygon(points: { x: number; y: number }[], fill: FillStyle): void
  text(x: number, y: number, content: string, style: TextStyle): void
  textRotated(x: number, y: number, content: string, angle: number, style: TextStyle): void
}