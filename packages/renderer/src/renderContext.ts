import type { Camera, Size } from './camera'
import type { Theme } from './theme'
import type { DrawTarget } from './target/DrawTarget'
import type { Profiler } from './profiler'
import type {
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
}