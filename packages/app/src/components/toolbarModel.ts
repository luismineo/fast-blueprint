import type { ToolId } from '../tools/toolShortcuts'

/**
 * Barra de ferramentas (`07-ui-e-layout.md` § Layout): cinco ícones, nada mais.
 *
 * Parede e Medir aparecem desabilitadas. Mostrar o que ainda não existe é
 * melhor que reordenar a barra a cada milestone: a posição de cada ferramenta
 * fica estável, e a tecla que a spec 03 já reserva continua sendo a mesma.
 */
export type ToolbarId = ToolId | 'wall' | 'measure'

export interface ToolbarButton {
  readonly id: ToolbarId
  /** Tecla da tabela unificada de `03-ferramentas-e-interacao.md`. */
  readonly shortcut: string
  readonly enabled: boolean
}

export const TOOLBAR_BUTTONS: readonly ToolbarButton[] = [
  { id: 'select', shortcut: 'V', enabled: true },
  { id: 'room', shortcut: 'R', enabled: true },
  { id: 'wall', shortcut: 'W', enabled: false },
  { id: 'furniture', shortcut: 'F', enabled: true },
  { id: 'measure', shortcut: 'M', enabled: false },
]

/**
 * Movimento de foco do padrão ARIA toolbar, com roving tabindex.
 *
 * Setas circulam; `Home` e `End` vão ao primeiro e ao último. Devolve `null`
 * para tecla que a barra não reivindica — é o que deixa o atalho global
 * seguir seu caminho (regra D0 de `03-ferramentas-e-interacao.md`).
 */
export function moveToolbarFocus(current: number, key: string, count: number): number | null {
  if (count === 0) return null

  switch (key) {
    case 'ArrowDown':
    case 'ArrowRight':
      return (current + 1) % count
    case 'ArrowUp':
    case 'ArrowLeft':
      return (current - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}

export function toolbarIndexOf(tool: ToolId): number {
  const index = TOOLBAR_BUTTONS.findIndex((button) => button.id === tool)
  return index === -1 ? 0 : index
}
