<script lang="ts">
  import type { CatalogItem } from '@planta/catalog'
  import { messages } from '../messages'
  import { describeCatalog, type CatalogEntry } from './catalogModel'
  import type { FurnitureGlyph } from '@planta/core'
  import { CanvasTarget } from '@planta/renderer'

  interface Props {
    items: readonly CatalogItem[]
    recentIds: readonly string[]
    glyphs?: ReadonlyMap<string, FurnitureGlyph>
    onChoose: (entry: CatalogEntry) => void
    onDragStart: (entry: CatalogEntry) => void
  }

  const { items, recentIds, glyphs = new Map(), onChoose, onDragStart }: Props = $props()

  let query = $state('')

  const model = $derived(describeCatalog(items, query, recentIds, glyphs))

  function drawThumb(canvas: HTMLCanvasElement, entry: { glyph?: FurnitureGlyph; thumbnail: { width: number; height: number } }) {
    const glyph = entry.glyph
    if (!glyph) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const target = new CanvasTarget(ctx)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const w = canvas.width
    const h = canvas.height
    for (const prim of glyph.primitives) {
      switch (prim.kind) {
        case 'line': {
          target.line(
            prim.x1 * w, prim.y1 * h,
            prim.x2 * w, prim.y2 * h,
            { color: '#5B6775', width: 1 },
          )
          break
        }
        case 'rect': {
          target.polyline([
            { x: prim.x * w, y: prim.y * h },
            { x: (prim.x + prim.w) * w, y: prim.y * h },
            { x: (prim.x + prim.w) * w, y: (prim.y + prim.h) * h },
            { x: prim.x * w, y: (prim.y + prim.h) * h },
            { x: prim.x * w, y: prim.y * h },
          ], { color: '#5B6775', width: 1 })
          break
        }
        case 'circle': {
          const cx = prim.cx * w
          const cy = prim.cy * h
          const r = prim.r * Math.min(w, h)
          const segs = 24
          const pts: { x: number; y: number }[] = []
          for (let i = 0; i <= segs; i += 1) {
            const a = (i * 2 * Math.PI) / segs
            pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) })
          }
          target.polyline(pts, { color: '#5B6775', width: 1 })
          break
        }
        case 'arc': {
          const cx = prim.cx * w
          const cy = prim.cy * h
          const r = prim.r * Math.min(w, h)
          const sweep = prim.endAngle - prim.startAngle
          const segs = Math.max(2, Math.round(Math.abs(sweep) / (2 * Math.PI) * 24))
          const pts: { x: number; y: number }[] = []
          for (let i = 0; i <= segs; i += 1) {
            const a = prim.startAngle + (i * sweep) / segs
            pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) })
          }
          target.polyline(pts, { color: '#5B6775', width: 1 })
          break
        }
      }
    }
  }
</script>

<section class="catalog" aria-label={messages.catalogTitle}>
  <h2 class="catalog-title">{messages.catalogTitle}</h2>

  <input
    class="search"
    type="search"
    autocomplete="off"
    aria-label={messages.catalogSearchLabel}
    placeholder={messages.catalogSearchPlaceholder}
    data-testid="catalog-search"
    bind:value={query}
  />

  {#if model.empty}
    <p class="empty">{messages.catalogNoResults}</p>
  {/if}

  {#if model.recent.length > 0}
    <details class="group" open>
      <summary>{messages.catalogRecent}</summary>
      <ul class="items">
        {#each model.recent as entry (entry.id)}
          <li>
            <button
              type="button"
              class="item"
              draggable="true"
              data-testid="catalog-item-{entry.id}"
              onclick={() => onChoose(entry)}
              ondragstart={() => onDragStart(entry)}
            >
              {#if entry.glyph}
                <canvas
                  class="thumb-canvas"
                  width={entry.thumbnail.width}
                  height={entry.thumbnail.height}
                  style="width: {entry.thumbnail.width}px; height: {entry.thumbnail.height}px;"
                  use:drawThumb={entry}
                ></canvas>
              {:else}
                <span
                  class="thumb"
                  style="width: {entry.thumbnail.width}px; height: {entry.thumbnail.height}px;"
                ></span>
              {/if}
              <span class="item-name">{entry.name}</span>
              <span class="item-size">{entry.dimensions} {messages.unitCm}</span>
            </button>
          </li>
        {/each}
      </ul>
    </details>
  {/if}

  {#each model.groups as group (group.category)}
    <details class="group" open={model.searching}>
      <summary>{messages.catalogCategory[group.category]}</summary>
      <ul class="items">
        {#each group.items as entry (entry.id)}
          <li>
            <button
              type="button"
              class="item"
              draggable="true"
              data-testid="catalog-item-{entry.id}"
              onclick={() => onChoose(entry)}
              ondragstart={() => onDragStart(entry)}
            >
              {#if entry.glyph}
                <canvas
                  class="thumb-canvas"
                  width={entry.thumbnail.width}
                  height={entry.thumbnail.height}
                  style="width: {entry.thumbnail.width}px; height: {entry.thumbnail.height}px;"
                  use:drawThumb={entry}
                ></canvas>
              {:else}
                <span
                  class="thumb"
                  style="width: {entry.thumbnail.width}px; height: {entry.thumbnail.height}px;"
                ></span>
              {/if}
              <span class="item-name">{entry.name}</span>
              <span class="item-size">{entry.dimensions} {messages.unitCm}</span>
            </button>
          </li>
        {/each}
      </ul>
    </details>
  {/each}
</section>

<style>
  .catalog {
    border-top: 1px solid var(--border);
    padding-top: 12px;
    margin-top: 12px;
  }

  .catalog-title {
    margin: 0 0 8px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }

  .search {
    width: 100%;
    padding: 4px 6px;
    box-sizing: border-box;
    margin-bottom: 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius-field);
    background: var(--surface-raised);
    font: inherit;
    font-size: 13px;
    color: var(--text);
  }

  .search:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -1px;
  }

  .group {
    margin-bottom: 4px;
  }

  .group summary {
    cursor: pointer;
    padding: 2px 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .group summary:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  .items {
    list-style: none;
    margin: 2px 0 0;
    padding: 0;
  }

  .item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 3px 4px;
    border: none;
    border-radius: var(--radius-field);
    background: transparent;
    font: inherit;
    font-size: 12px;
    color: var(--text);
    text-align: left;
    cursor: grab;
  }

  .item:hover {
    background: var(--surface-raised);
  }

  .item:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -1px;
  }

  .thumb {
    flex: none;
    display: block;
    border: 1px solid var(--text-muted);
    background: var(--surface-raised);
  }

  .item-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-size {
    flex: none;
    font-family: 'IBM Plex Mono', monospace;
    font-variant-numeric: tabular-nums;
    font-size: 11px;
    color: var(--text-muted);
  }

  .empty {
    margin: 8px 0;
    color: var(--text-muted);
  }

  .thumb-canvas {
    border: 1px solid var(--text-muted);
    background: var(--surface-raised);
    flex: none;
  }
</style>

