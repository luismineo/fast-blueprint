import { clearPass } from './passes/clear'
import { gridPass } from './passes/grid'
import { roomFillsPass } from './passes/roomFills'
import { wallsPass } from './passes/walls'
import { dimensionsPass } from './passes/dimensions'
import { roomLabelsPass } from './passes/roomLabels'
import { snapGuidesPass } from './passes/snapGuides'
import { toolOverlayPass } from './passes/toolOverlay'
import { hudPass } from './passes/hud'
import type { RenderContext } from './renderContext'

type PassSpace = 'world' | 'screen'

interface PassEntry {
  readonly name: string
  readonly space: PassSpace
  readonly run: (ctx: RenderContext) => void
}

const PASSES: readonly PassEntry[] = [
  { name: 'clear', space: 'screen', run: clearPass },
  { name: 'grid', space: 'world', run: gridPass },
  { name: 'roomFills', space: 'world', run: roomFillsPass },
  { name: 'walls', space: 'world', run: wallsPass },
  { name: 'dimensions', space: 'world', run: dimensionsPass },
  { name: 'roomLabels', space: 'world', run: roomLabelsPass },
  { name: 'snapGuides', space: 'world', run: snapGuidesPass },
  { name: 'toolOverlay', space: 'world', run: toolOverlayPass },
  { name: 'hud', space: 'screen', run: hudPass },
]

const loggedErrorSignatures = new Set<string>()

export function render(ctx: RenderContext): void {
  for (const pass of PASSES) {
    if (pass.space === 'world') {
      ctx.target.setWorldTransform(ctx.camera)
    } else {
      ctx.target.resetTransform()
    }
    runPass(ctx, pass.name, pass.run)
  }
}

function runPass(ctx: RenderContext, name: string, run: (ctx: RenderContext) => void): void {
  try {
    if (ctx.profiler) {
      ctx.profiler.measure(name, () => run(ctx))
    } else {
      run(ctx)
    }
  } catch (error) {
    const signature = `${name}:${error instanceof Error ? error.message : String(error)}`
    if (!loggedErrorSignatures.has(signature)) {
      loggedErrorSignatures.add(signature)
      console.error(`[renderer] pass "${name}" falhou, demais passes continuam`, error)
    }
  }
}