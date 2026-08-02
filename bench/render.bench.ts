import { bench, describe } from 'vitest'
import { buildApto44m2, buildFurnished } from '../packages/core/src/testing/fixtures'
import { render } from '../packages/renderer/src/render'
import { RecordingTarget } from '../packages/renderer/src/target/RecordingTarget'
import { lightTheme } from '../packages/renderer/src/theme'
import type { RenderContext } from '../packages/renderer/src/renderContext'

/**
 * Orçamento de 8 ms por frame (`04-renderizacao.md` § Orçamento de performance).
 *
 * Roda contra um `DrawTarget` que grava primitivas em vez de pintar pixels:
 * mede o trabalho que o renderer faz — resolver geometria, converter espaço,
 * derivar aviso — sem o custo do canvas, que é o mesmo para qualquer
 * implementação e varia com a máquina.
 *
 * `10-testes.md` § Testes de performance: roda em CI só sob a label `perf`,
 * porque a variância de runner compartilhado gera falso positivo. O número que
 * vale é o local.
 */

const furnished = buildFurnished()
const bare = buildApto44m2()

function contextFor(doc: typeof furnished): RenderContext {
  return {
    doc,
    camera: { tx: 40, ty: 40, scale: 0.09 },
    viewport: { width: 1280, height: 800 },
    theme: lightTheme,
    target: new RecordingTarget(),
    selection: [],
    hover: null,
  }
}

describe('render', () => {
  bench('apto-44m2 com 40 móveis', () => {
    render(contextFor(furnished))
  })

  bench('apto-44m2 sem mobília', () => {
    render(contextFor(bare))
  })
})
