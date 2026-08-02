import { describe, expect, it } from 'vitest'
import { TOOLBAR_BUTTONS, moveToolbarFocus, toolbarIndexOf } from './toolbarModel'
import { classifyKey, type KeyContext } from '../tools/toolShortcuts'

function ctx(overrides: Partial<KeyContext> = {}): KeyContext {
  return {
    key: 'a',
    ctrlOrMeta: false,
    shift: false,
    focus: 'canvas',
    tool: 'select',
    drawing: false,
    lengthFieldEmpty: true,
    angleFieldEmpty: true,
    selectionHasFurniture: false,
    ...overrides,
  }
}

describe('barra de ferramentas', () => {
  it('tem os cinco botões da spec 07, na ordem da tabela de atalhos', () => {
    expect(TOOLBAR_BUTTONS.map((button) => button.shortcut)).toEqual([
      'V',
      'R',
      'W',
      'F',
      'M',
    ])
  })

  it('todos os cinco botões estão habilitados a partir do M3.5', () => {
    const disabled = TOOLBAR_BUTTONS.filter((button) => !button.enabled)

    expect(disabled).toEqual([])
  })

  it('o índice acompanha a ferramenta ativa', () => {
    expect(toolbarIndexOf('select')).toBe(0)
    expect(toolbarIndexOf('room')).toBe(1)
    expect(toolbarIndexOf('wall')).toBe(2)
    expect(toolbarIndexOf('furniture')).toBe(3)
    expect(toolbarIndexOf('measure')).toBe(4)
  })
})

describe('roving tabindex', () => {
  const count = TOOLBAR_BUTTONS.length

  it('setas circulam nos dois sentidos', () => {
    expect(moveToolbarFocus(0, 'ArrowDown', count)).toBe(1)
    expect(moveToolbarFocus(count - 1, 'ArrowDown', count)).toBe(0)
    expect(moveToolbarFocus(0, 'ArrowUp', count)).toBe(count - 1)
  })

  it('Home e End vão ao primeiro e ao último', () => {
    expect(moveToolbarFocus(2, 'Home', count)).toBe(0)
    expect(moveToolbarFocus(2, 'End', count)).toBe(count - 1)
  })

  it('tecla que a barra não reivindica devolve null', () => {
    expect(moveToolbarFocus(0, 'r', count)).toBeNull()
    expect(moveToolbarFocus(0, 'Enter', count)).toBeNull()
  })

  it('barra vazia não move foco', () => {
    expect(moveToolbarFocus(0, 'Home', 0)).toBeNull()
  })
})

/**
 * Critério de `03-ferramentas-e-interacao.md`: com foco na barra, `Home` move o
 * foco e **não** aciona Enquadrar tudo; com foco no canvas, enquadra.
 */
describe('regra D0 com a barra de ferramentas', () => {
  it('Home com foco no canvas enquadra tudo', () => {
    expect(classifyKey(ctx({ key: 'Home' })).kind).toBe('frameAll')
  })

  it('Home com foco na barra não enquadra', () => {
    expect(classifyKey(ctx({ key: 'Home', focus: 'toolbar' })).kind).toBe('none')
    expect(moveToolbarFocus(2, 'Home', TOOLBAR_BUTTONS.length)).toBe(0)
  })

  it('End com foco na barra vai ao último botão, sem atalho global', () => {
    expect(classifyKey(ctx({ key: 'End', focus: 'toolbar' })).kind).toBe('none')
    expect(moveToolbarFocus(0, 'End', TOOLBAR_BUTTONS.length)).toBe(
      TOOLBAR_BUTTONS.length - 1,
    )
  })

  it('nenhum atalho de ferramenta dispara com foco na barra', () => {
    expect(classifyKey(ctx({ key: 'r', focus: 'toolbar' })).kind).toBe('none')
    expect(classifyKey(ctx({ key: 'f', focus: 'toolbar' })).kind).toBe('none')
  })

  it('Esc e Ctrl continuam valendo, que são as exceções da regra', () => {
    expect(classifyKey(ctx({ key: 'Escape', focus: 'toolbar' })).kind).toBe('selectEvent')
    expect(classifyKey(ctx({ key: 'z', ctrlOrMeta: true, focus: 'toolbar' })).kind).toBe(
      'undo',
    )
    expect(classifyKey(ctx({ key: 'b', ctrlOrMeta: true, focus: 'toolbar' })).kind).toBe(
      'togglePanel',
    )
  })
})
