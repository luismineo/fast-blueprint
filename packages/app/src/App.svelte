<script lang="ts">
  import { onMount } from 'svelte'
  import { CanvasTarget, Profiler, lightTheme, panBy, render, type Camera, type Size } from '@planta/renderer'
  import { Scheduler } from './scheduler'
  import {
    applyWheelIntent,
    beginPanDrag,
    classifyWheel,
    continuePanDrag,
    endsPanDrag,
    homeCamera,
    isHomeShortcutEligible,
    shouldStartPan,
    toLocalPoint,
    type PanDragState,
  } from './canvasInput'

  let canvasEl: HTMLCanvasElement | undefined = $state.raw()
  let perfSummary = $state('')

  const debugPerf =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('debug') === 'perf'

  function setupCanvas(canvas: HTMLCanvasElement, profiler: Profiler | undefined): () => void {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D nao suportado')

    const target = new CanvasTarget(ctx)

    let camera: Camera = { tx: 0, ty: 0, scale: 1 }
    let viewport: Size = { width: 0, height: 0 }
    let spacePressed = false
    let dragState: PanDragState | null = null

    const scheduler = new Scheduler(() => {
      render({ camera, viewport, theme: lightTheme, target, profiler })
    })

    function currentDpr(): number {
      return window.devicePixelRatio || 1
    }

    function resize(): void {
      const rect = canvas.getBoundingClientRect()
      viewport = { width: rect.width, height: rect.height }
      const dpr = currentDpr()
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      target.setDevicePixelRatio(dpr)
      camera = homeCamera(viewport)
      scheduler.markDirty()
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    resize()

    let dprQuery = window.matchMedia(`(resolution: ${currentDpr()}dppx)`)
    function onDprChange(): void {
      resize()
      dprQuery.removeEventListener('change', onDprChange)
      dprQuery = window.matchMedia(`(resolution: ${currentDpr()}dppx)`)
      dprQuery.addEventListener('change', onDprChange)
    }
    dprQuery.addEventListener('change', onDprChange)

    function onWheel(event: WheelEvent): void {
      event.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const intent = classifyWheel({
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
        ctrlKey: event.ctrlKey,
        cursor: toLocalPoint(event.clientX, event.clientY, rect),
      })
      camera = applyWheelIntent(camera, intent)
      scheduler.markDirty()
    }

    function onPointerDown(event: PointerEvent): void {
      if (!shouldStartPan(event.button, spacePressed)) return
      const rect = canvas.getBoundingClientRect()
      dragState = beginPanDrag(event.pointerId, toLocalPoint(event.clientX, event.clientY, rect))
      canvas.setPointerCapture(event.pointerId)
      event.preventDefault()
    }

    function onPointerMove(event: PointerEvent): void {
      if (!dragState) return
      const rect = canvas.getBoundingClientRect()
      const step = continuePanDrag(dragState, event.pointerId, toLocalPoint(event.clientX, event.clientY, rect))
      if (!step) return
      camera = panBy(camera, step.delta)
      dragState = step.state
      scheduler.markDirty()
    }

    function onPointerUp(event: PointerEvent): void {
      if (!dragState || !endsPanDrag(dragState, event.pointerId)) return
      dragState = null
      canvas.releasePointerCapture(event.pointerId)
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.code === 'Space') {
        spacePressed = true
        event.preventDefault()
        return
      }
      if (event.code === 'Home' && isHomeShortcutEligible(document.activeElement)) {
        camera = homeCamera(viewport)
        scheduler.markDirty()
        event.preventDefault()
      }
    }

    function onKeyUp(event: KeyboardEvent): void {
      if (event.code === 'Space') spacePressed = false
    }

    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    let perfInterval: ReturnType<typeof setInterval> | undefined
    if (profiler) {
      perfInterval = setInterval(() => {
        perfSummary = profiler
          .summary()
          .map((entry) => `${entry.pass}: ${entry.ms.toFixed(2)}ms`)
          .join('\n')
      }, 500)
    }

    return () => {
      resizeObserver.disconnect()
      dprQuery.removeEventListener('change', onDprChange)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      if (perfInterval) clearInterval(perfInterval)
      scheduler.stop()
    }
  }

  onMount(() => {
    if (!canvasEl) return
    return setupCanvas(canvasEl, debugPerf ? new Profiler() : undefined)
  })
</script>

<canvas bind:this={canvasEl} class="canvas-fullscreen"></canvas>

{#if debugPerf}
  <pre class="perf-overlay">{perfSummary}</pre>
{/if}

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
  }

  .canvas-fullscreen {
    display: block;
    width: 100vw;
    height: 100vh;
    touch-action: none;
  }

  .perf-overlay {
    position: fixed;
    top: 8px;
    right: 8px;
    margin: 0;
    padding: 8px 10px;
    background: rgba(0, 0, 0, 0.75);
    color: rgb(255, 255, 255);
    font: 11px 'IBM Plex Mono', monospace;
    white-space: pre;
    pointer-events: none;
  }
</style>
