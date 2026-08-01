<script lang="ts">
  import { onMount } from 'svelte'
  import { CanvasTarget, Profiler, lightTheme, panBy, render, type Camera, type Size } from '@planta/renderer'
  import { DocumentStore, resolveSnap, type Point, formatLength, formatAngle, formatArea } from '@planta/core'
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
  import { initialRoomState, roomToolTransition, type RoomToolState, type RoomToolResult } from './tools/roomTool'

  let canvasEl: HTMLCanvasElement | undefined = $state.raw()
  let perfSummary = $state('')
  let hudVisible = $state(false)
  let hudLength = $state('')
  let hudAngle = $state('')
  let hudArea = $state('')
  let hudSides = $state(0)
  let hudX = $state(0)
  let hudY = $state(0)
  let hudFocused = $state(false)

  const debugPerf =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('debug') === 'perf'

  function setupCanvas(canvas: HTMLCanvasElement, profiler: Profiler | undefined): () => void {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D nao suportado')

    const target = new CanvasTarget(ctx)
    const store = new DocumentStore()

    let camera: Camera = { tx: 0, ty: 0, scale: 1 }
    let viewport: Size = { width: 0, height: 0 }
    let spacePressed = false
    let dragState: PanDragState | null = null
    let roomState: RoomToolState = initialRoomState()
    let cursor = { x: 0, y: 0 }

    const scheduler = new Scheduler(() => {
      render({
        camera,
        viewport,
        theme: lightTheme,
        target,
        profiler,
        doc: store.current,
      })
    })

    function worldPoint(px: Point): Point {
      return {
        x: (px.x - camera.tx) / camera.scale,
        y: (px.y - camera.ty) / camera.scale,
      }
    }

    function snap(point: Point) {
      const ctx = {
        nodes: store.current.nodes.map((n) => ({ id: n.id, x: n.x, y: n.y })),
        origin: roomState.kind !== 'idle'
          ? roomState.kind === 'anchored'
            ? roomState.anchor
            : roomState.confirmedNodes.length > 0
              ? roomState.confirmedNodes[roomState.confirmedNodes.length - 1]!
              : roomState.anchor
          : null,
        gridSize: store.current.meta.gridSize,
        scale: camera.scale,
        shift: false,
        alt: false,
      }
      return resolveSnap(point, ctx)
    }

    function applyRoomResult(result: RoomToolResult): void {
      roomState = result.state
      if (result.command) {
        store.dispatch(result.command)
        hudVisible = false
        hudFocused = false
      }
      updateHud(result)
      scheduler.markDirty()
    }

    function updateHud(result: RoomToolResult): void {
      if (roomState.kind === 'idle') {
        hudVisible = false
        hudFocused = false
        return
      }
      hudVisible = true
      hudLength = result.segmentLength > 0 ? formatLength(Math.round(result.segmentLength), 'cm').replace(' cm', '') : ''
      hudAngle = result.direction !== null ? formatAngle(result.direction) : ''
      hudSides = result.nodeCount
      hudArea = result.provisionalArea !== null && result.provisionalArea > 0
        ? formatArea(result.provisionalArea)
        : ''
    }

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
      if (shouldStartPan(event.button, spacePressed)) {
        const rect = canvas.getBoundingClientRect()
        dragState = beginPanDrag(event.pointerId, toLocalPoint(event.clientX, event.clientY, rect))
        canvas.setPointerCapture(event.pointerId)
        event.preventDefault()
        return
      }

      if (event.button === 0) {
        const rect = canvas.getBoundingClientRect()
        const px = toLocalPoint(event.clientX, event.clientY, rect)
        cursor = px
        const wp = worldPoint(px)
        const sr = snap(wp)
        const result = roomToolTransition(roomState, { type: 'pointerDown', point: wp, snapResult: sr }, wp, null)
        applyRoomResult(result)
        event.preventDefault()
      }
    }

    function onPointerMove(event: PointerEvent): void {
      if (dragState) {
        const rect = canvas.getBoundingClientRect()
        const step = continuePanDrag(dragState, event.pointerId, toLocalPoint(event.clientX, event.clientY, rect))
        if (!step) return
        camera = panBy(camera, step.delta)
        dragState = step.state
        scheduler.markDirty()
        return
      }

      const rect = canvas.getBoundingClientRect()
      cursor = toLocalPoint(event.clientX, event.clientY, rect)
      if (roomState.kind !== 'idle') {
        // Atualiza HUD com posição do cursor
        const wp = worldPoint(cursor)
        const direction = roomState.kind === 'anchored'
          ? Math.atan2(wp.y - roomState.anchor.y, wp.x - roomState.anchor.x)
          : null
        hudX = cursor.x + 16
        hudY = cursor.y + 16
        if (direction !== null) {
          hudAngle = formatAngle(direction)
        }
        scheduler.markDirty()
      }
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

      // Roteamento para ferramenta cômodo
      if (roomState.kind !== 'idle') {
        if (event.key === 'Enter') {
          event.preventDefault()
          const wp = worldPoint(cursor)
          const result = roomToolTransition(roomState, { type: 'enter' }, wp, null)
          applyRoomResult(result)
          return
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          const wp = worldPoint(cursor)
          const result = roomToolTransition(roomState, { type: 'escape' }, wp, null)
          applyRoomResult(result)
          return
        }
        if (event.key === 'Backspace' && hudFocused) {
          // Deixa o campo de input processar
          return
        }
        if (event.key === 'Backspace' && !hudFocused) {
          event.preventDefault()
          const wp = worldPoint(cursor)
          const result = roomToolTransition(roomState, { type: 'backspace' }, wp, null)
          applyRoomResult(result)
          return
        }
        if (event.key === 'c' || event.key === 'C') {
          event.preventDefault()
          const wp = worldPoint(cursor)
          const result = roomToolTransition(roomState, { type: 'c' }, wp, null)
          applyRoomResult(result)
          return
        }
        if (/^[0-9]$/.test(event.key)) {
          event.preventDefault()
          const wp = worldPoint(cursor)
          const result = roomToolTransition(roomState, { type: 'digit', digit: event.key }, wp, null)
          applyRoomResult(result)
          return
        }
        return
      }

      // Atalho R para ativar ferramenta cômodo
      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault()
        roomState = initialRoomState()
        return
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

{#if hudVisible}
  <div class="hud" style="left: {hudX}px; top: {hudY}px;">
    <div class="hud-row">
      <input
        class="hud-input"
        type="text"
        value={hudLength}
        readonly={!hudFocused}
        onfocus={() => hudFocused = true}
        onblur={() => hudFocused = false}
        placeholder="cm"
      />
      <span class="hud-readonly">{hudAngle}</span>
    </div>
    {#if hudSides >= 3 && hudArea}
      <div class="hud-info">{hudSides} lados &middot; {hudArea}</div>
    {/if}
  </div>
{/if}

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

  .hud {
    position: fixed;
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 4px 8px;
    font: 12px 'Inter', sans-serif;
    pointer-events: auto;
    z-index: 10;
    box-shadow: 0 1px 4px rgba(0,0,0,0.12);
  }

  .hud-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .hud-input {
    width: 60px;
    border: 1px solid #999;
    border-radius: 2px;
    padding: 2px 4px;
    font: 12px 'Inter', sans-serif;
    text-align: right;
  }

  .hud-readonly {
    color: #666;
    min-width: 48px;
  }

  .hud-info {
    margin-top: 4px;
    color: #888;
    font-size: 11px;
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