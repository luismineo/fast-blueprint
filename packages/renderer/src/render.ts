import { clearPass } from './passes/clear'
import { gridPass } from './passes/grid'
import { roomFillsPass } from './passes/roomFills'
import { wallsPass } from './passes/walls'
import { dimensionsPass } from './passes/dimensions'
import { roomLabelsPass } from './passes/roomLabels'
import { snapGuidesPass } from './passes/snapGuides'
import { toolOverlayPass } from './passes/toolOverlay'
import { selectionPass } from './passes/selection'
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
  { name: 'dimensions', space: 'screen', run: dimensionsPass },
  { name: 'roomLabels', space: 'screen', run: roomLabelsPass },
  { name: 'snapGuides', space: 'screen', run: snapGuidesPass },
  { name: 'toolOverlay', space: 'screen', run: toolOverlayPass },
  { name: 'selection', space: 'screen', run: selectionPass },
  { name: 'hud', space: 'screen', run: hudPass },
]

/**
 * Espaço em que cada pass desenha. Exposto para o teste asserir a regra
 * estrutural — passes de texto e de overlay em espaço de tela — em vez de
 * inferi-la de um array posicional.
 */
export function passSpaces(): Readonly<Record<string, PassSpace>> {
  const spaces: Record<string, PassSpace> = {}
  for (const pass of PASSES) spaces[pass.name] = pass.space
  return spaces
}

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