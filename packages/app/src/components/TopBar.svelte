<script lang="ts">
  import { messages } from '../messages'

  interface Props {
    title: string
    dirty: boolean
    onOpen: () => void
    onSave: () => void
    onExportPng: () => void
    onExportSvg: () => void
    onExportCsv: () => void
    onRename: () => void
  }

  const { title, dirty, onOpen, onSave, onExportPng, onExportSvg, onExportCsv, onRename }: Props = $props()
</script>

<header class="topbar">
  <button type="button" class="title-btn" onclick={onRename} title={messages.renameDocument}>
    {title || 'Sem título'}{dirty ? '*' : ''}
  </button>
  <div class="actions">
    <button type="button" class="btn" onclick={onOpen}>{messages.menuOpen}</button>
    <button type="button" class="btn" onclick={onSave}>{messages.menuSave}</button>
    <div class="dropdown">
      <button type="button" class="btn">{messages.menuExport} ▾</button>
      <div class="dropdown-content">
        <button type="button" onclick={onExportPng}>PNG</button>
        <button type="button" onclick={onExportSvg}>SVG</button>
        <button type="button" onclick={onExportCsv}>CSV</button>
      </div>
    </div>
  </div>
</header>

<style>
  .topbar {
    position: fixed;
    top: 0;
    left: 48px;
    right: 0;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    box-sizing: border-box;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    z-index: 10;
  }
  
  .title-btn {
    font-weight: 600;
    font-size: 14px;
    background: transparent;
    border: none;
    color: var(--text);
    cursor: pointer;
    padding: 4px 8px;
    border-radius: var(--radius-field);
    margin-left: -8px;
  }
  .title-btn:hover {
    background: var(--surface-raised);
  }

  .actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .btn {
    padding: 6px 12px;
    background: var(--surface-raised);
    border: 1px solid var(--border);
    border-radius: var(--radius-field);
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    color: var(--text);
  }

  .btn:hover {
    background: var(--surface);
  }

  .dropdown {
    position: relative;
    display: inline-block;
  }

  .dropdown-content {
    display: none;
    position: absolute;
    right: 0;
    background-color: var(--surface-raised);
    min-width: 100px;
    box-shadow: var(--shadow-floating);
    border: 1px solid var(--border);
    border-radius: var(--radius-field);
    z-index: 11;
  }

  .dropdown-content button {
    color: var(--text);
    padding: 8px 12px;
    text-decoration: none;
    display: block;
    width: 100%;
    text-align: left;
    border: none;
    background: transparent;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
  }

  .dropdown-content button:hover {
    background-color: var(--surface);
  }

  .dropdown:hover .dropdown-content {
    display: block;
  }
</style>
