import type { Camera, Size } from './camera'
import type { Theme } from './theme'
import type { DrawTarget } from './target/DrawTarget'
import type { Profiler } from './profiler'
import type { PlanDocument } from '@planta/core'

export interface RenderContext {
  readonly camera: Camera
  readonly viewport: Size
  readonly theme: Theme
  readonly target: DrawTarget
  readonly profiler?: Profiler
  readonly doc?: PlanDocument
}