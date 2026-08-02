<script lang="ts">
  import type { PlanDocument, Selection } from '@planta/core'
  import { messages } from '../messages'
  import { describeSelection, type PanelModel } from './panelModel'

  interface Props {
    doc: PlanDocument
    selection: Selection
    onRename: (name: string) => void
    onColor: (index: number | null) => void
    onUsable: (include: boolean) => void
    onEdgeLength: (text: string) => void
    onNodeCoordinate: (axis: 'x' | 'y', text: string) => void
    onDelete: () => void
  }

  const {
    doc,
    selection,
    onRename,
    onColor,
    onUsable,
    onEdgeLength,
    onNodeCoordinate,
    onDelete,
  }: Props = $props()

  const model: PanelModel = $derived(describeSelection(doc, selection))

  function applyOnEnter(event: KeyboardEvent, apply: (text: string) => void): void {
    if (event.key !== 'Enter') return
    event.preventDefault()
    apply((event.currentTarget as HTMLInputElement).value)
  }
</script>

<section class="panel" aria-label={messages.panelTitle}>
  <h2 class="panel-title">{messages.panelTitle}</h2>

  {#if model.kind === 'empty'}
    <dl class="rows">
      <dt>{messages.summaryUsableArea}</dt>
      <dd data-testid="usable-area">{model.usableArea}</dd>
      <dt>{messages.summaryTotalArea}</dt>
      <dd>{model.totalArea}</dd>
      <dt>{messages.summaryRoomCount}</dt>
      <dd data-testid="room-count">{model.roomCount}</dd>
    </dl>
    {#if model.roomCount === 0}
      <p class="empty">{messages.emptyCanvas}</p>
    {/if}
  {:else if model.kind === 'room'}
    <label class="field">
      <span class="label">{messages.panelRoomName}</span>
      <input
        class="input"
        type="text"
        value={model.name}
        aria-label={messages.panelRoomName}
        onkeydown={(event) => applyOnEnter(event, onRename)}
        onblur={(event) => onRename(event.currentTarget.value)}
      />
    </label>

    <dl class="rows">
      <dt>{messages.panelArea}</dt>
      <dd data-testid="room-area">{model.area}</dd>
      <dt>{messages.panelPerimeter}</dt>
      <dd>{model.perimeter}</dd>
    </dl>

    <div class="swatches" role="group" aria-label={messages.panelColor}>
      <button
        type="button"
        class="swatch swatch--none"
        class:selected={model.colorIndex === null}
        aria-label={messages.panelColorNone}
        onclick={() => onColor(null)}
      ></button>
      {#each model.palette as swatch, index (swatch)}
        <button
          type="button"
          class="swatch"
          class:selected={model.colorIndex === index}
          style="background: {swatch}"
          aria-label={messages.panelColorOption(index + 1)}
          onclick={() => onColor(index)}
        ></button>
      {/each}
    </div>

    <label class="toggle">
      <input
        type="checkbox"
        checked={model.includeInUsableArea}
        onchange={(event) => onUsable(event.currentTarget.checked)}
      />
      <span>{messages.panelCountsAsUsable}</span>
    </label>

    <button type="button" class="danger" onclick={onDelete}>{messages.panelDelete}</button>
  {:else if model.kind === 'edge'}
    <label class="field">
      <span class="label">{messages.panelLength}</span>
      <input
        class="input"
        type="text"
        inputmode="numeric"
        value={model.lengthText}
        aria-label={messages.panelLength}
        data-testid="edge-length"
        onkeydown={(event) => applyOnEnter(event, onEdgeLength)}
      />
    </label>

    <dl class="rows">
      <dt>{messages.panelAngle}</dt>
      <dd>{model.angle}</dd>
      <dt>{messages.panelAdjacentRooms}</dt>
      <dd>{model.adjacentRooms}</dd>
    </dl>
  {:else if model.kind === 'node'}
    <label class="field">
      <span class="label">{messages.panelX}</span>
      <input
        class="input"
        type="text"
        inputmode="numeric"
        value={model.xText}
        aria-label={messages.panelX}
        onkeydown={(event) => applyOnEnter(event, (text) => onNodeCoordinate('x', text))}
      />
    </label>
    <label class="field">
      <span class="label">{messages.panelY}</span>
      <input
        class="input"
        type="text"
        inputmode="numeric"
        value={model.yText}
        aria-label={messages.panelY}
        onkeydown={(event) => applyOnEnter(event, (text) => onNodeCoordinate('y', text))}
      />
    </label>

    <dl class="rows">
      <dt>{messages.panelConnectedRooms}</dt>
      <dd>{model.connectedRooms}</dd>
    </dl>
  {:else if model.kind === 'furniture'}
    <dl class="rows">
      <dt>{messages.panelFurnitureName}</dt>
      <dd data-testid="furniture-name">{model.name}</dd>
      <dt>{messages.panelWidth}</dt>
      <dd>{model.widthText}</dd>
      <dt>{messages.panelDepth}</dt>
      <dd>{model.depthText}</dd>
      <dt>{messages.panelRotation}</dt>
      <dd>{model.rotationText}</dd>
      <dt>{messages.panelClearance}</dt>
      <dd>{model.clearanceText}</dd>
    </dl>
  {:else}
    <dl class="rows">
      <dt>{messages.panelRoomCount}</dt>
      <dd>{model.rooms}</dd>
      <dt>{messages.panelNodeCount}</dt>
      <dd>{model.nodes}</dd>
      <dt>{messages.panelEdgeCount}</dt>
      <dd>{model.edges}</dd>
      <dt>{messages.panelFurnitureCount}</dt>
      <dd>{model.furniture}</dd>
    </dl>
    {#if model.rooms > 0}
      <button type="button" class="danger" onclick={onDelete}>{messages.panelDelete}</button>
    {/if}
  {/if}
</section>

<style>
  .panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 264px;
    height: 100vh;
    padding: 12px 16px;
    background: var(--surface);
    border-left: 1px solid var(--border);
    box-sizing: border-box;
    font-size: 13px;
    overflow-y: auto;
  }

  .panel-title {
    margin: 0 0 8px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }

  .rows {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 4px 12px;
    margin: 0 0 12px;
  }

  .rows dt {
    color: var(--text-muted);
  }

  .rows dd {
    margin: 0;
    font-family: 'IBM Plex Mono', monospace;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .field {
    display: block;
    margin-bottom: 8px;
  }

  .label {
    display: block;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    margin-bottom: 2px;
  }

  .input {
    width: 100%;
    padding: 3px 6px;
    box-sizing: border-box;
    border: 1px solid var(--border);
    border-radius: var(--radius-field);
    background: var(--surface-raised);
    font-family: 'IBM Plex Mono', monospace;
    font-variant-numeric: tabular-nums;
    font-size: 13px;
    color: var(--text);
  }

  .input:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -1px;
  }

  .swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 10px;
  }

  .swatch {
    width: 20px;
    height: 20px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius-field);
    cursor: pointer;
  }

  .swatch--none {
    background: var(--surface-raised);
  }

  .swatch.selected {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  .swatch:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 12px;
  }

  .danger {
    width: 100%;
    padding: 4px 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius-field);
    background: var(--surface-raised);
    font: inherit;
    color: var(--text);
    cursor: pointer;
  }

  .danger:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  .empty {
    margin: 12px 0 0;
    color: var(--text-muted);
    line-height: 1.4;
  }
</style>
