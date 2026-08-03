import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AutosaveScheduler } from './autosave'

describe('AutosaveScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('debounces schedule calls by 5s', async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined)
    const scheduler = new AutosaveScheduler(saveFn)

    scheduler.schedule('1')
    vi.advanceTimersByTime(2000)
    scheduler.schedule('2')
    vi.advanceTimersByTime(2000)
    scheduler.schedule('3')
    
    expect(saveFn).not.toHaveBeenCalled()
    
    vi.advanceTimersByTime(5000)
    
    expect(saveFn).toHaveBeenCalledTimes(1)
    expect(saveFn).toHaveBeenCalledWith('3')
  })

  it('flushes immediately and clears timer', async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined)
    const scheduler = new AutosaveScheduler(saveFn)

    scheduler.schedule('1')
    await scheduler.flush()

    expect(saveFn).toHaveBeenCalledTimes(1)
    expect(saveFn).toHaveBeenCalledWith('1')

    vi.advanceTimersByTime(5000)
    expect(saveFn).toHaveBeenCalledTimes(1)
  })

  it('does nothing on flush if no pending json', async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined)
    const scheduler = new AutosaveScheduler(saveFn)

    await scheduler.flush()

    expect(saveFn).not.toHaveBeenCalled()
  })
})
