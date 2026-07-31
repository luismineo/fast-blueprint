export type RenderCallback = () => void
export type RequestFrame = (callback: FrameRequestCallback) => number
export type CancelFrame = (handle: number) => void

export class Scheduler {
  private readonly renderCallback: RenderCallback
  private readonly requestFrame: RequestFrame
  private readonly cancelFrame: CancelFrame
  private dirty = false
  private frameHandle: number | null = null

  constructor(
    renderCallback: RenderCallback,
    requestFrame: RequestFrame = (callback) => requestAnimationFrame(callback),
    cancelFrame: CancelFrame = (handle) => cancelAnimationFrame(handle),
  ) {
    this.renderCallback = renderCallback
    this.requestFrame = requestFrame
    this.cancelFrame = cancelFrame
  }

  markDirty(): void {
    this.dirty = true
    this.scheduleFrame()
  }

  stop(): void {
    if (this.frameHandle === null) return
    this.cancelFrame(this.frameHandle)
    this.frameHandle = null
  }

  private scheduleFrame(): void {
    if (this.frameHandle !== null) return
    this.frameHandle = this.requestFrame(() => {
      this.frameHandle = null
      if (!this.dirty) return
      this.dirty = false
      this.renderCallback()
    })
  }
}
