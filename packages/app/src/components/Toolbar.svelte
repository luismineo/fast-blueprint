<script lang="ts">
  import { messages } from '../messages'
  import type { ToolId } from '../tools/toolShortcuts'
  import {
    TOOLBAR_BUTTONS,
    moveToolbarFocus,
    toolbarIndexOf,
    type ToolbarId,
  } from './toolbarModel'

  interface Props {
    tool: ToolId
    onSelect: (tool: ToolId) => void
  }

  const { tool, onSelect }: Props = $props()

  let buttons: HTMLButtonElement[] = $state.raw([])
  let focused = $state(toolbarIndexOf('select'))

  const labels: Record<ToolbarId, string> = {
    select: messages.toolSelect,
    room: messages.toolRoom,
    wall: messages.toolWall,
    furniture: messages.toolFurniture,
    measure: messages.toolMeasure,
  }

  /**
   * Roving tabindex: só o botão focado é alcançável por `Tab`, e as setas
   * circulam dentro da barra (`03-ferramentas-e-interacao.md` § Regra D0).
   */
  function onKeyDown(event: KeyboardEvent): void {
    const next = moveToolbarFocus(focused, event.key, TOOLBAR_BUTTONS.length)
    if (next === null) return

    event.preventDefault()
    focused = next
    buttons[next]?.focus()
  }

  function activate(id: ToolbarId): void {
    if (id === 'wall' || id === 'measure') return
    onSelect(id)
  }
</script>

<!--
  `tabindex="-1"` no container, e não `0`: quem entra por `Tab` é o botão com
  roving tabindex. O container fica alcançável só por foco programático.
-->
<div
  class="toolbar"
  role="toolbar"
  tabindex="-1"
  aria-orientation="vertical"
  aria-label={messages.toolbarLabel}
  onkeydown={onKeyDown}
>
  {#each TOOLBAR_BUTTONS as button, index (button.id)}
    <button
      bind:this={buttons[index]}
      type="button"
      class="tool"
      class:active={button.id === tool}
      class:unavailable={!button.enabled}
      aria-disabled={!button.enabled}
      tabindex={index === focused ? 0 : -1}
      aria-pressed={button.id === tool}
      aria-label={button.enabled
        ? messages.toolTooltip(labels[button.id], button.shortcut)
        : messages.toolUnavailable(labels[button.id])}
      title={button.enabled
        ? messages.toolTooltip(labels[button.id], button.shortcut)
        : messages.toolUnavailable(labels[button.id])}
      data-testid="tool-{button.id}"
      onclick={() => activate(button.id)}
      onfocus={() => (focused = index)}
    >
      {button.shortcut}
    </button>
  {/each}
</div>

<style>
  .toolbar {
    position: fixed;
    top: 0;
    left: 0;
    width: 48px;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding-top: 8px;
    box-sizing: border-box;
    background: var(--surface);
    border-right: 1px solid var(--border);
  }

  .tool {
    width: 32px;
    height: 32px;
    border: 1px solid transparent;
    border-radius: var(--radius-field);
    background: transparent;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    color: var(--text);
    cursor: pointer;
  }

  .tool:hover:not(.unavailable) {
    background: var(--surface-raised);
  }

  .tool.active {
    border-color: var(--accent);
    color: var(--accent);
  }

  /*
    `aria-disabled`, e não o atributo `disabled`: botão desabilitado de verdade
    sai da ordem de foco, e o padrão ARIA toolbar precisa que `Home` e `End`
    alcancem o primeiro e o último item, existindo eles ou não.
  */
  .tool.unavailable {
    color: var(--border);
    cursor: default;
  }

  .tool:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
</style>
