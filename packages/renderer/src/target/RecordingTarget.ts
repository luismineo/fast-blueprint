import type { Camera } from '../camera'
import type { DrawTarget, LineStyle, TextStyle, FillStyle } from './DrawTarget'

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

export interface RecordedPolyline {
  readonly points: { x: number; y: number }[]
  readonly style: LineStyle
}

export interface RecordedPolygon {
  readonly points: { x: number; y: number }[]
  readonly fill: FillStyle
}

export interface RecordedTextRotated {
  readonly x: number
  readonly y: number
  readonly content: string
  readonly angle: number
  readonly style: TextStyle
}

export type RecordedTransform = { readonly kind: 'world'; readonly camera: Camera } | { readonly kind: 'reset' }

export class RecordingTarget implements DrawTarget {
  readonly clears: string[] = []
  readonly transforms: RecordedTransform[] = []
  readonly lines: RecordedLine[] = []
  readonly polylines: RecordedPolyline[] = []
  readonly polygons: RecordedPolygon[] = []
  readonly texts: RecordedText[] = []
  readonly textsRotated: RecordedTextRotated[] = []

  clear(color: string): void {
    this.clears.push(color)
  }

  setWorldTransform(camera: Camera): void {
    this.transforms.push({ kind: 'world', camera })
  }

  resetTransform(): void {
    this.transforms.push({ kind: 'reset' })
  }

  line(x1: number, y1: number, x2: number, y2: number, style: LineStyle): void {
    this.lines.push({ x1, y1, x2, y2, style })
  }

  polyline(points: { x: number; y: number }[], style: LineStyle): void {
    this.polylines.push({ points: [...points], style })
  }

  filledPolygon(points: { x: number; y: number }[], fill: FillStyle): void {
    this.polygons.push({ points: [...points], fill })
  }

  text(x: number, y: number, content: string, style: TextStyle): void {
    this.texts.push({ x, y, content, style })
  }

  textRotated(x: number, y: number, content: string, angle: number, style: TextStyle): void {
    this.textsRotated.push({ x, y, content, angle, style })
  }
}