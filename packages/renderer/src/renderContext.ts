import type { Camera, Size } from './camera'
import type { Theme } from './theme'
import type { DrawTarget } from './target/DrawTarget'
import type { Profiler } from './profiler'
import type {
  FurnitureGlyph,
  OverlayPrimitive,
  PlanDocument,
  Selection,
  SelectionRef,
} from '@planta/core'

export interface RenderContext {
  readonly camera: Camera
  readonly viewport: Size
  readonly theme: Theme
  readonly target: DrawTarget
  readonly profiler?: Profiler
  readonly doc?: PlanDocument
  readonly overlays?: readonly OverlayPrimitive[]
  readonly selection?: Selection
  /** Entidade sob o cursor, para o handle com contorno (spec 03 § Handles). */
  readonly hover?: SelectionRef | null
  /**
   * Mapa catalogId → glifo, montado pelo app.
   *
   * `renderer` não importa `catalog`; o app resolve e entrega aqui
   * (`08-arquitetura.md` § Pacotes, `adr/0006-glifos-de-mobilia.md` § 5).
   */
  readonly glyphs?: ReadonlyMap<string, FurnitureGlyph>
}
