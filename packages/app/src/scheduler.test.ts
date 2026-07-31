import { describe, expect, it, vi } from 'vitest'
import { Scheduler, type CancelFrame, type RequestFrame } from './scheduler'

function createFakeRaf(): { requestFrame: RequestFrame; cancelFrame: CancelFrame; flush: () => void } {
  const pending: FrameRequestCallback[] = []
  let nextHandle = 1

  const requestFrame = vi.fn((callback: FrameRequestCallback) => {
    pending.push(callback)
    return nextHandle++
  })
  const cancelFrame = vi.fn()
  const flush = (): void => {
    const callbacks = pending.splice(0, pending.length)
    for (const callback of callbacks) callback(0)
  }

  return { requestFrame, cancelFrame, flush }
}

describe('Scheduler', () => {
  it('so agenda um frame por sequencia de marcacoes sujas (dirty flag)', () => {
    const { requestFrame, cancelFrame, flush } = createFakeRaf()
    const render = vi.fn()
    const scheduler = new Scheduler(render, requestFrame, cancelFrame)

    scheduler.markDirty()
    scheduler.markDirty()
    scheduler.markDirty()

    expect(requestFrame).toHaveBeenCalledTimes(1)
    flush()
    expect(render).toHaveBeenCalledTimes(1)
  })

  it('agenda um novo frame somente depois que o anterior ja rendeu', () => {
    const { requestFrame, cancelFrame, flush } = createFakeRaf()
    const render = vi.fn()
    const scheduler = new Scheduler(render, requestFrame, cancelFrame)

    scheduler.markDirty()
    flush()
    scheduler.markDirty()
    flush()

    expect(requestFrame).toHaveBeenCalledTimes(2)
    expect(render).toHaveBeenCalledTimes(2)
  })

  it('nao agenda frame nem redesenha antes de qualquer marcacao suja (frame ocioso, specs/04 orcamento de performance)', () => {
    const { requestFrame, cancelFrame } = createFakeRaf()
    const render = vi.fn()
    new Scheduler(render, requestFrame, cancelFrame)

    expect(requestFrame).not.toHaveBeenCalled()
    expect(render).not.toHaveBeenCalled()
  })

  it('stop cancela o frame agendado', () => {
    const { requestFrame, cancelFrame } = createFakeRaf()
    const render = vi.fn()
    const scheduler = new Scheduler(render, requestFrame, cancelFrame)

    scheduler.markDirty()
    scheduler.stop()

    expect(cancelFrame).toHaveBeenCalledTimes(1)
  })
})
