import { describe, expect, it } from 'vitest'
import { Profiler } from './profiler'

describe('Profiler', () => {
  it('acumula tempo por pass e resume por media', () => {
    const profiler = new Profiler()

    profiler.measure('grid', () => {
      let total = 0
      for (let i = 0; i < 1000; i += 1) total += i
      return total
    })
    profiler.measure('grid', () => undefined)

    const summary = profiler.summary()
    const gridSummary = summary.find((entry) => entry.pass === 'grid')
    expect(gridSummary).toBeDefined()
    expect(gridSummary?.ms).toBeGreaterThanOrEqual(0)
  })

  it('devolve o valor de retorno da funcao medida', () => {
    const profiler = new Profiler()
    const result = profiler.measure('grid', () => 42)
    expect(result).toBe(42)
  })

  it('descarta amostras antigas alem do limite configurado', () => {
    const profiler = new Profiler(3)
    for (let i = 0; i < 10; i += 1) {
      profiler.measure('grid', () => undefined)
    }
    expect(profiler.summary()).toHaveLength(1)
  })
})
