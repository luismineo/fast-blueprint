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
    ROOM_COLORS,
    generateNodeId,
    generateRoomId,
    hitTest,
    pruneSelection,
    tryParseLength,
    type OverlayPrimitive,
    type PlanDocument,
    type Point,
    type RoomId,
    type Selection,
    type SelectionRef,
    type SetEdgeLengthPayload,
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
  import {
    initialSelectState,
    selectToolTransition,
    type EditRequest,
    type SelectToolContext,
    type SelectToolEvent,
    type SelectToolState,
  } from './tools/selectTool'
  import { exactNodeAt, resolveToolSnap } from './tools/snapContext'
  import { classifyKey, type FocusKind } from './tools/toolShortcuts'
  import PropertiesPanel from './components/PropertiesPanel.svelte'

  const HUD_OFFSET_PX = 16

  let canvasEl: HTMLCanvasElement | undefined = $state.raw()
  let lengthEl: HTMLInputElement | undefined = $state.raw()
  let angleEl: HTMLInputElement | undefined = $state.raw()
  let nameEl: HTMLInputElement | undefined = $state.raw()
  let edgeEl: HTMLInputElement | undefined = $state.raw()

  let camera: Camera = $state.raw({ tx: 0, ty: 0, scale: 1 })
  let viewport: Size = $state.raw({ width: 0, height: 0 })
  let cursorPx: Point = $state.raw({ x: 0, y: 0 })
  let roomState: RoomToolState = $state.raw(initialRoomState())
  let selectState: SelectToolState = $state.raw(initialSelectState())
  let selection: Selection = $state.raw([])
  let hover: SelectionRef | null = $state.raw(null)
  let overlays: readonly OverlayPrimitive[] = $state.raw([])
  let hud: RoomHudModel | null = $state.raw(null)
  let naming: NamingRequest | null = $state.raw(null)
  let namingValue = $state('')
  let edgeEdit: (EditRequest & { kind: 'edgeLength' }) | null = $state.raw(null)
  let edgeEditValue = $state('')
  // "Mover junto" / "Só este cômodo", lembrada durante a sessão
  // (`03-ferramentas-e-interacao.md` § Editar comprimento de aresta).
  let sharedNodeMode: SetEdgeLengthPayload['mode'] = $state('moveTogether')
  let toolActive = $state(false)
  let perfSummary = $state('')

  const store = new DocumentStore()
  let doc: PlanDocument = $state.raw(store.current)

  const debugPerf =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('debug') === 'perf'

  const hudLeft = $derived(cursorPx.x + HUD_OFFSET_PX)
  const hudTop = $derived(cursorPx.y + HUD_OFFSET_PX)
  const namingPos: Point = $derived.by(() => {
    const request = naming
    return request ? worldToScreen(camera, request.centroid) : { x: 0, y: 0 }
  })
  const edgeEditPos: Point = $derived.by(() => {
    const request = edgeEdit
    return request ? worldToScreen(camera, request.at) : { x: 0, y: 0 }
  })

  function focusKind(): FocusKind {
    const active = typeof document === 'undefined' ? null : document.activeElement
    if (!active) return 'canvas'
    if (active === lengthEl) return 'hudLength'
    if (active === angleEl) return 'hudAngle'
    if (active === nameEl || active === edgeEl) return 'roomName'
    if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') return 'other'
    return 'canvas'
  }

  function worldAt(px: Point): Point {
    return { x: (px.x - camera.tx) / camera.scale, y: (px.y - camera.ty) / camera.scale }
  }

  function toolContext(shift: boolean): RoomToolContext {
    const world = worldAt(cursorPx)
    const draft = roomState.kind === 'idle' ? [] : roomState.nodes
    const current = store.current
    return {
      cursor: world,
      snap: resolveToolSnap(world, {
        doc: current,
        draft,
        scale: camera.scale,
        shift,
        alt: false,
      }),
      shift,
      nodeAt: (point) => exactNodeAt(point, { doc: current, draft }),
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
      openNameEditor(result.naming.roomId, result.naming)
      toolActive = false
    }
  }

  function selectContext(alt: boolean): SelectToolContext {
    const world = worldAt(cursorPx)
    const current = store.current
    return {
      doc: current,
      cursor: world,
      hit: hitTest(world, { doc: current, scale: camera.scale }),
      selection,
      snap: (point, exclude) =>
        resolveToolSnap(point, {
          doc: current,
          draft: [],
          scale: camera.scale,
          shift: false,
          alt,
          exclude,
        }),
      newNodeId: generateNodeId,
    }
  }

  function dispatchSelect(event: SelectToolEvent, alt = false): void {
    const result = selectToolTransition(selectState, event, selectContext(alt))
    selectState = result.state
    selection = result.selection
    hover = result.hover
    overlays = result.overlays

    for (const command of result.commands) store.dispatch(command)
    if (result.historyBoundary === 'commit') store.sealPending()
    if (result.historyBoundary === 'abort') store.abortPending()

    if (result.edit) beginEdit(result.edit)
  }

  function beginEdit(request: EditRequest): void {
    if (request.kind === 'roomName') {
      openNameEditor(request.roomId, null)
      return
    }
    edgeEdit = request
    edgeEditValue = String(Math.round(request.currentLength / 10))
    void focusEdgeField()
  }

  function openNameEditor(roomId: RoomId, request: NamingRequest | null): void {
    const room = store.current.rooms.find((r) => r.id === roomId)
    namingValue = room?.name ?? ''
    naming = request ?? { roomId, centroid: roomCentroid(roomId) }
    void focusNameField()
  }

  function roomCentroid(roomId: RoomId): Point {
    const current = store.current
    const room = current.rooms.find((r) => r.id === roomId)
    if (!room) return worldAt(cursorPx)

    let sx = 0
    let sy = 0
    let count = 0
    for (const nodeId of room.loop) {
      const node = current.nodes.find((candidate) => candidate.id === nodeId)
      if (!node) continue
      sx += node.x
      sy += node.y
      count += 1
    }
    return count === 0 ? worldAt(cursorPx) : { x: sx / count, y: sy / count }
  }

  async function focusNameField(): Promise<void> {
    await tick()
    nameEl?.focus()
    nameEl?.select()
  }

  async function focusEdgeField(): Promise<void> {
    await tick()
    edgeEl?.focus()
    edgeEl?.select()
  }

  function commitEdgeLength(mode: 'moveTogether' | 'detach'): void {
    const request = edgeEdit
    edgeEdit = null
    if (!request) return

    sharedNodeMode = mode
    const length = tryParseLength(edgeEditValue)
    if (length !== null && length > 0) {
      store.dispatch({
        type: 'SetEdgeLength',
        payload: { edge: request.edge, length, mode, newNodeId: generateNodeId() },
      })
      selection = pruneSelection(store.current, selection)
    }
    canvasEl?.focus()
  }

  function cancelEdgeLength(): void {
    edgeEdit = null
    canvasEl?.focus()
  }

  function selectedRoomId(): RoomId | null {
    const ref = selection.find((candidate) => candidate.kind === 'room')
    return ref && ref.kind === 'room' ? ref.roomId : null
  }

  function renameSelectedRoom(name: string): void {
    const roomId = selectedRoomId()
    const trimmed = name.trim()
    if (!roomId || trimmed === '') return

    const room = store.current.rooms.find((candidate) => candidate.id === roomId)
    if (!room || room.name === trimmed) return

    store.dispatch({ type: 'RenameRoom', payload: { roomId, name: trimmed } })
  }

  function colorSelectedRoom(index: number | null): void {
    const roomId = selectedRoomId()
    if (!roomId) return

    const color = index === null ? null : (ROOM_COLORS[index] ?? null)
    store.dispatch({ type: 'SetRoomColor', payload: { roomId, color } })
  }

  function setSelectedRoomUsable(include: boolean): void {
    const roomId = selectedRoomId()
    if (!roomId) return
    store.dispatch({
      type: 'SetRoomUsable',
      payload: { roomId, includeInUsableArea: include },
    })
  }

  function applyPanelEdgeLength(text: string): void {
    const ref = selection.find((candidate) => candidate.kind === 'edge')
    if (!ref || ref.kind !== 'edge') return

    const length = tryParseLength(text)
    if (length === null || length <= 0) return

    store.dispatch({
      type: 'SetEdgeLength',
      payload: {
        edge: ref.edge,
        length,
        mode: sharedNodeMode,
        newNodeId: generateNodeId(),
      },
    })
    selection = pruneSelection(store.current, selection)
  }

  function applyNodeCoordinate(axis: 'x' | 'y', text: string): void {
    const ref = selection.find((candidate) => candidate.kind === 'node')
    if (!ref || ref.kind !== 'node') return

    const value = tryParseLength(text)
    if (value === null) return

    const node = store.current.nodes.find((candidate) => candidate.id === ref.nodeId)
    if (!node) return

    store.dispatch({
      type: 'MoveNode',
      payload: {
        nodeId: ref.nodeId,
        x: axis === 'x' ? value : node.x,
        y: axis === 'y' ? value : node.y,
      },
    })
  }

  function deleteSelection(): void {
    dispatchSelect({ type: 'deleteSelection' })
  }

  function onEdgeKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitEdgeLength(edgeEdit?.endNodeShared ? sharedNodeMode : 'moveTogether')
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      cancelEdgeLength()
    }
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
      render({
        camera,
        viewport,
        theme: lightTheme,
        target,
        profiler,
        doc: store.current,
        overlays,
        selection,
        hover,
      })
    })

    function activateSelect(): void {
      toolActive = false
      roomState = initialRoomState()
      selectState = initialSelectState()
      overlays = []
      hud = null
    }

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

      if (event.button !== 0) return

      cursorPx = toLocalPoint(event.clientX, event.clientY, canvas.getBoundingClientRect())

      if (toolActive) {
        dispatchTool({ type: 'pointerDown', clickCount: 1 }, event.shiftKey)
      } else {
        canvas.setPointerCapture(event.pointerId)
        dispatchSelect(
          {
            type: 'pointerDown',
            clickCount: 1,
            additive: event.ctrlKey || event.metaKey,
          },
          event.altKey,
        )
      }

      scheduler.markDirty()
      event.preventDefault()
    }

    /**
     * `PointerEvent.detail` é sempre 0 em `pointerdown` — medido no navegador,
     * os dois cliques de um duplo chegam com 0 e só o evento `dblclick` traz 2.
     * Ler a contagem do `pointerdown` deixava o duplo clique inalcançável nas
     * duas ferramentas.
     */
    function onDoubleClick(event: MouseEvent): void {
      cursorPx = toLocalPoint(event.clientX, event.clientY, canvas.getBoundingClientRect())

      if (toolActive) {
        dispatchTool({ type: 'pointerDown', clickCount: 2 }, event.shiftKey)
      } else {
        dispatchSelect({ type: 'pointerDown', clickCount: 2, additive: false }, event.altKey)
      }

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

      if (toolActive) {
        dispatchTool({ type: 'pointerMove' }, event.shiftKey)
      } else {
        dispatchSelect({ type: 'pointerMove' }, event.altKey)
      }

      scheduler.markDirty()
    }

    function onPointerUp(event: PointerEvent): void {
      if (dragState && endsPanDrag(dragState, event.pointerId)) {
        dragState = null
        canvas.releasePointerCapture(event.pointerId)
        return
      }

      if (toolActive || event.button !== 0) return

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }
      cursorPx = toLocalPoint(event.clientX, event.clientY, canvas.getBoundingClientRect())
      dispatchSelect({ type: 'pointerUp' }, event.altKey)
      scheduler.markDirty()
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
          selection = pruneSelection(store.current, selection)
          return

        case 'redo':
          event.preventDefault()
          store.redo()
          selection = pruneSelection(store.current, selection)
          return

        case 'frameAll':
          event.preventDefault()
          camera = homeCamera(viewport)
          scheduler.markDirty()
          return

        case 'activateRoomTool':
          event.preventDefault()
          toolActive = true
          selection = []
          hover = null
          roomState = initialRoomState()
          dispatchTool({ type: 'activate' })
          scheduler.markDirty()
          return

        case 'activateSelectTool':
          event.preventDefault()
          activateSelect()
          scheduler.markDirty()
          return

        case 'toolEvent':
          event.preventDefault()
          dispatchTool(action.event, event.shiftKey)
          scheduler.markDirty()
          return

        case 'selectEvent': {
          event.preventDefault()
          // `Esc` sem seleção volta para a Ferramenta Selecionar; com seleção,
          // apenas limpa (`03-ferramentas-e-interacao.md` § tabela unificada).
          const wasEmpty = selection.length === 0
          if (toolActive) {
            if (action.event.type === 'escape' && wasEmpty) activateSelect()
            scheduler.markDirty()
            return
          }
          dispatchSelect(action.event, event.altKey)
          scheduler.markDirty()
          return
        }

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
    canvas.addEventListener('dblclick', onDoubleClick)
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
      canvas.removeEventListener('dblclick', onDoubleClick)
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

<PropertiesPanel
  {doc}
  {selection}
  onRename={renameSelectedRoom}
  onColor={colorSelectedRoom}
  onUsable={setSelectedRoomUsable}
  onEdgeLength={applyPanelEdgeLength}
  onNodeCoordinate={applyNodeCoordinate}
  onDelete={deleteSelection}
/>

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

{#if edgeEdit}
  <div class="edge-edit" style="left: {edgeEditPos.x}px; top: {edgeEditPos.y}px;">
    <input
      bind:this={edgeEl}
      class="edge-edit-field"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      aria-label={messages.edgeLengthLabel}
      bind:value={edgeEditValue}
      onkeydown={onEdgeKeyDown}
    />
    <span class="edge-edit-unit">{messages.unitCm}</span>
    {#if edgeEdit.endNodeShared}
      <div class="edge-edit-choice">
        <button
          type="button"
          class="edge-edit-button"
          class:preferred={sharedNodeMode === 'moveTogether'}
          data-testid="shared-move-together"
          onclick={() => commitEdgeLength('moveTogether')}
        >
          {messages.sharedNodeMoveTogether}
        </button>
        <button
          type="button"
          class="edge-edit-button"
          class:preferred={sharedNodeMode === 'detach'}
          onclick={() => commitEdgeLength('detach')}
        >
          {messages.sharedNodeDetachOnly}
        </button>
      </div>
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

  .edge-edit {
    position: fixed;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px;
    padding: 4px 8px;
    background: var(--surface-raised);
    border: 1px solid var(--accent);
    border-radius: var(--radius-field);
    box-shadow: var(--shadow-floating);
    font-size: 12px;
  }

  .edge-edit-field {
    width: 56px;
    border: none;
    background: transparent;
    font-family: 'IBM Plex Mono', monospace;
    font-variant-numeric: tabular-nums;
    font-size: 12px;
    color: var(--text);
    outline: none;
  }

  .edge-edit-unit {
    color: var(--text-muted);
  }

  .edge-edit-choice {
    display: flex;
    gap: 4px;
    width: 100%;
    margin-top: 4px;
  }

  .edge-edit-button {
    flex: 1;
    padding: 2px 6px;
    border: 1px solid var(--border);
    border-radius: var(--radius-field);
    background: var(--surface);
    font: inherit;
    font-size: 11px;
    color: var(--text);
    cursor: pointer;
    white-space: nowrap;
  }

  .edge-edit-button.preferred {
    border-color: var(--accent);
    color: var(--accent);
  }

  .edge-edit-button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
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
