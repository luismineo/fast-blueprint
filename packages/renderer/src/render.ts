import { clearPass } from './passes/clear'
import { gridPass } from './passes/grid'
import { hudPass } from './passes/hud'
import type { RenderContext } from './renderContext'

const PASSES: ReadonlyArray<{ readonly name: string; readonly run: (ctx: RenderContext) => void }> = [
  { name: 'clear', run: clearPass },
  { name: 'grid', run: gridPass },
  { name: 'hud', run: hudPass },
]

const loggedErrorSignatures = new Set<string>()

export function render(ctx: RenderContext): void {
  for (const pass of PASSES) {
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
