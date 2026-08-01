<script lang="ts">
  import { onMount, tick } from 'svelte'
  import {
    CanvasTarget,
    Profiler,
    lightTheme,
    panBy,
    render,
    worldToScreen,
    type Camera,
    type Size,
  } from '@planta/renderer'
  import {
    DocumentStore,
    computeUsableArea,
    formatArea,
    generateNodeId,
    generateRoomId,
    type OverlayPrimitive,
    type PlanDocument,
    type Point,
    type RoomId,
  } from '@planta/core'
  import { Scheduler } from './scheduler'
  import { messages } from './messages'
  import './styles/tokens.css'
  import {
    applyWheelIntent,
    beginPanDrag,
    classifyWheel,
    continuePanDrag,
    endsPanDrag,
    homeCamera,
    shouldStartPan,
    toLocalPoint,
    type PanDragState,
  } from './canvasInput'
  import {
    initialRoomState,
    roomToolTransition,
    type NamingRequest,
    type RoomHudModel,
    type RoomToolContext,
    type RoomToolEvent,
    type RoomToolState,
  } from './tools/roomTool'
  import { resolveToolSnap } from './tools/snapContext'
  import { classifyKey, type FocusKind } from './tools/toolShortcuts'

  const HUD_OFFSET_PX = 16

  let canvasEl: HTMLCanvasElement | undefined = $state.raw()
  let lengthEl: HTMLInputElement | undefined = $state.raw()
  let angleEl: HTMLInputElement | undefined = $state.raw()
  let nameEl: HTMLInputElement | undefined = $state.raw()

  let camera: Camera = $state.raw({ tx: 0, ty: 0, scale: 1 })
  let viewport: Size = $state.raw({ width: 0, height: 0 })
  let cursorPx: Point = $state.raw({ x: 0, y: 0 })
  let roomState: RoomToolState = $state.raw(initialRoomState())
  let overlays: readonly OverlayPrimitive[] = $state.raw([])
  let hud: RoomHudModel | null = $state.raw(null)
  let naming: NamingRequest | null = $state.raw(null)
  let namingValue = $state('')
  let toolActive = $state(false)
  let perfSummary = $state('')

  const store = new DocumentStore()
  let doc: PlanDocument = $state.raw(store.current)

  const debugPerf =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('debug') === 'perf'

  const usableAreaText = $derived(formatArea(computeUsableArea(doc)))
  const roomCount = $derived(doc.rooms.length)
  const hudLeft = $derived(cursorPx.x + HUD_OFFSET_PX)
  const hudTop = $derived(cursorPx.y + HUD_OFFSET_PX)
  const namingPos: Point = $derived.by(() => {
    const request = naming
    return request ? worldToScreen(camera, request.centroid) : { x: 0, y: 0 }
  })

  function focusKind(): FocusKind {
    const active = typeof document === 'undefined' ? null : document.activeElement
    if (!active) return 'canvas'
    if (active === lengthEl) return 'hudLength'
    if (active === angleEl) return 'hudAngle'
    if (active === nameEl) return 'roomName'
    if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') return 'other'
    return 'canvas'
  }

  function worldAt(px: Point): Point {
    return { x: (px.x - camera.tx) / camera.scale, y: (px.y - camera.ty) / camera.scale }
  }

  function toolContext(shift: boolean): RoomToolContext {
    const world = worldAt(cursorPx)
    const draft = roomState.kind === 'idle' ? [] : roomState.nodes
    return {
      cursor: world,
      snap: resolveToolSnap(world, {
        doc: store.current,
        draft,
        scale: camera.scale,
        shift,
        alt: false,
      }),
      shift,
      newNodeId: generateNodeId,
      newRoomId: generateRoomId,
    }
  }

  function dispatchTool(event: RoomToolEvent, shift = false): void {
    const result = roomToolTransition(roomState, event, toolContext(shift))
    roomState = result.state
    overlays = result.overlays
    hud = result.hud

    for (const command of result.commands) store.dispatch(command)

    if (result.naming) {
      const room = store.current.rooms.find((r) => r.id === result.naming!.roomId)
      namingValue = room?.name ?? ''
      naming = result.naming
      toolActive = false
      void focusNameField()
    }
  }

  async function focusNameField(): Promise<void> {
    await tick()
    nameEl?.focus()
    nameEl?.select()
  }

  function commitName(): void {
    const request = naming
    naming = null
    if (!request) return

    const room = store.current.rooms.find((r) => r.id === request.roomId)
    const trimmed = namingValue.trim()
    if (room && trimmed !== '' && trimmed !== room.name) {
      store.dispatch({ type: 'RenameRoom', payload: { roomId: request.roomId as RoomId, name: trimmed } })
    }
    canvasEl?.focus()
  }

  function cancelName(): void {
    naming = null
    canvasEl?.focus()
  }

  function onNameKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitName()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      cancelName()
    }
  }

  function onLengthInput(event: Event): void {
    const value = (event.currentTarget as HTMLInputElement).value
    dispatchTool({ type: 'inputChange', value, field: 'length' })
  }

  function onAngleInput(event: Event): void {
    const value = (event.currentTarget as HTMLInputElement).value
    dispatchTool({ type: 'inputChange', value, field: 'angle' })
  }

  function setupCanvas(canvas: HTMLCanvasElement, profiler: Profiler | undefined): () => void {
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) throw new Error('Canvas 2D nao suportado')

    const target = new CanvasTarget(ctx2d)

    let spacePressed = false
    let dragState: PanDragState | null = null

    const scheduler = new Scheduler(() => {
      render({ camera, viewport, theme: lightTheme, target, profiler, doc: store.current, overlays })
    })

    const unsubscribe = store.subscribe((next) => {
      doc = next
      scheduler.markDirty()
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
      camera = applyWheelIntent(
        camera,
        classifyWheel({
          deltaX: event.deltaX,
          deltaY: event.deltaY,
          deltaMode: event.deltaMode,
          ctrlKey: event.ctrlKey,
          cursor: toLocalPoint(event.clientX, event.clientY, rect),
        }),
      )
      if (toolActive) dispatchTool({ type: 'pointerMove' })
      scheduler.markDirty()
    }

    function onPointerDown(event: PointerEvent): void {
      if (shouldStartPan(event.button, spacePressed)) {
        dragState = beginPanDrag(
          event.pointerId,
          toLocalPoint(event.clientX, event.clientY, canvas.getBoundingClientRect()),
        )
        canvas.setPointerCapture(event.pointerId)
        event.preventDefault()
        return
      }

      if (event.button !== 0 || !toolActive) return

      cursorPx = toLocalPoint(event.clientX, event.clientY, canvas.getBoundingClientRect())
      dispatchTool({ type: 'pointerDown', clickCount: event.detail }, event.shiftKey)
      scheduler.markDirty()
      event.preventDefault()
    }

    function onPointerMove(event: PointerEvent): void {
      const rect = canvas.getBoundingClientRect()

      if (dragState) {
        const step = continuePanDrag(
          dragState,
          event.pointerId,
          toLocalPoint(event.clientX, event.clientY, rect),
        )
        if (!step) return
        camera = panBy(camera, step.delta)
        dragState = step.state
        scheduler.markDirty()
        return
      }

      cursorPx = toLocalPoint(event.clientX, event.clientY, rect)
      if (!toolActive) return
      dispatchTool({ type: 'pointerMove' }, event.shiftKey)
      scheduler.markDirty()
    }

    function onPointerUp(event: PointerEvent): void {
      if (!dragState || !endsPanDrag(dragState, event.pointerId)) return
      dragState = null
      canvas.releasePointerCapture(event.pointerId)
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.code === 'Space' && focusKind() === 'canvas') {
        spacePressed = true
        event.preventDefault()
        return
      }

      const action = classifyKey({
        key: event.key,
        ctrlOrMeta: event.ctrlKey || event.metaKey,
        shift: event.shiftKey,
        focus: focusKind(),
        toolActive,
        drawing: roomState.kind !== 'idle',
        lengthFieldEmpty: (hud?.lengthText ?? '') === '',
        angleFieldEmpty: (hud?.angleText ?? '') === '',
      })

      switch (action.kind) {
        case 'none':
        case 'passToField':
          return

        case 'undo':
          event.preventDefault()
          store.undo()
          return

        case 'redo':
          event.preventDefault()
          store.redo()
          return

        case 'frameAll':
          event.preventDefault()
          camera = homeCamera(viewport)
          scheduler.markDirty()
          return

        case 'activateRoomTool':
          event.preventDefault()
          toolActive = true
          roomState = initialRoomState()
          dispatchTool({ type: 'activate' })
          scheduler.markDirty()
          return

        case 'toolEvent':
          event.preventDefault()
          dispatchTool(action.event, event.shiftKey)
          scheduler.markDirty()
          return

        case 'focusHudField': {
          event.preventDefault()
          const element = action.field === 'length' ? lengthEl : angleEl
          element?.focus()
          if (/^[0-9]$/.test(event.key)) {
            dispatchTool({ type: 'digit', digit: event.key, field: action.field })
            scheduler.markDirty()
          }
        }
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
      unsubscribe()
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

<canvas
  bind:this={canvasEl}
  class="canvas-fullscreen"
  class:tool-active={toolActive}
  tabindex="-1"
></canvas>

<aside class="summary" aria-label={messages.summaryTitle}>
  <h2 class="summary-title">{messages.summaryTitle}</h2>
  <dl class="summary-list">
    <dt>{messages.summaryUsableArea}</dt>
    <dd data-testid="usable-area">{usableAreaText}</dd>
    <dt>{messages.summaryRoomCount}</dt>
    <dd data-testid="room-count">{roomCount}</dd>
  </dl>
  {#if roomCount === 0 && !toolActive}
    <p class="summary-empty">{messages.emptyCanvas}</p>
  {/if}
</aside>

{#if hud}
  <div class="hud" role="group" aria-label={messages.hudLabel} style="left: {hudLeft}px; top: {hudTop}px;">
    <div class="hud-row">
      <input
        bind:this={lengthEl}
        class="hud-field"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        aria-label={messages.hudLengthLabel}
        value={hud.lengthText}
        placeholder={hud.measuredText}
        oninput={onLengthInput}
      />
      <span class="hud-unit">{messages.unitCm}</span>
      <input
        bind:this={angleEl}
        class="hud-field hud-field--angle"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        aria-label={messages.hudAngleLabel}
        value={hud.angleText}
        placeholder={hud.measuredAngleText}
        oninput={onAngleInput}
      />
      <span class="hud-unit">{messages.unitDegree}</span>
    </div>
    {#if hud.areaText}
      <div class="hud-info">{messages.hudSummary(hud.nodeCount, hud.areaText)}</div>
    {/if}
  </div>
{/if}

{#if naming}
  <input
    bind:this={nameEl}
    class="room-name"
    style="left: {namingPos.x}px; top: {namingPos.y}px;"
    aria-label={messages.roomNameLabel}
    bind:value={namingValue}
    onkeydown={onNameKeyDown}
    onblur={commitName}
  />
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
    font-family: Inter, system-ui, sans-serif;
    color: var(--text);
  }

  .canvas-fullscreen {
    display: block;
    width: 100vw;
    height: 100vh;
    touch-action: none;
    outline: none;
  }

  .canvas-fullscreen.tool-active {
    cursor: crosshair;
  }

  .summary {
    position: fixed;
    top: 0;
    right: 0;
    width: 264px;
    padding: 12px 16px;
    background: var(--surface);
    border-left: 1px solid var(--border);
    box-sizing: border-box;
    font-size: 13px;
  }

  .summary-title {
    margin: 0 0 8px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }

  .summary-list {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 4px 12px;
    margin: 0;
  }

  .summary-list dt {
    color: var(--text-muted);
  }

  .summary-list dd {
    margin: 0;
    font-family: 'IBM Plex Mono', monospace;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .summary-empty {
    margin: 12px 0 0;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .hud {
    position: fixed;
    padding: 4px 8px;
    background: var(--surface-raised);
    border: 1px solid var(--border);
    border-radius: var(--radius-field);
    box-shadow: var(--shadow-floating);
    font-size: 12px;
  }

  .hud:focus-within {
    box-shadow: 0 0 0 2px var(--accent);
  }

  .hud-row {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }

  .hud-field {
    width: 56px;
    border: none;
    background: transparent;
    font-family: 'IBM Plex Mono', monospace;
    font-variant-numeric: tabular-nums;
    font-size: 12px;
    color: var(--text);
    outline: none;
  }

  .hud-field--angle {
    width: 48px;
  }

  .hud-unit {
    color: var(--text-muted);
  }

  .hud-info {
    margin-top: 2px;
    padding-top: 2px;
    border-top: 1px solid var(--border);
    color: var(--text-muted);
  }

  .room-name {
    position: fixed;
    transform: translate(-50%, -50%);
    width: 120px;
    padding: 2px 4px;
    border: 1px solid var(--accent);
    border-radius: var(--radius-field);
    background: var(--surface-raised);
    font-size: 12px;
    text-align: center;
    outline: none;
  }

  .perf-overlay {
    position: fixed;
    top: 8px;
    left: 8px;
    margin: 0;
    padding: 8px 10px;
    background: rgba(0, 0, 0, 0.75);
    color: rgb(255, 255, 255);
    font: 11px 'IBM Plex Mono', monospace;
    white-space: pre;
    pointer-events: none;
  }
</style>
