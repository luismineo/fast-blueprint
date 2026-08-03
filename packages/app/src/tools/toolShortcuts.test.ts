import { describe, expect, it } from 'vitest'
import { classifyKey, type FocusKind, type KeyContext } from './toolShortcuts'

function ctx(overrides: Partial<KeyContext> = {}): KeyContext {
  return {
    key: 'a',
    ctrlOrMeta: false,
    shift: false,
    focus: 'canvas',
    tool: 'room',
    drawing: true,
    selectionHasFurniture: false,
    lengthFieldEmpty: true,
    angleFieldEmpty: true,
    ...overrides,
  }
}

describe('classifyKey — regra D0', () => {
  it('dígito com foco no canvas foca o campo de comprimento', () => {
    expect(classifyKey(ctx({ key: '3' })).kind).toBe('focusHudField')
  })

  it('dígito com foco no campo continua indo para a ferramenta, nao para o campo', () => {
    expect(classifyKey(ctx({ key: '3', focus: 'hudLength' })).kind).toBe('focusHudField')
  })

  it('dígito vai para o campo que tem foco', () => {
    expect(classifyKey(ctx({ key: '9', focus: 'canvas' }))).toEqual({
      kind: 'focusHudField',
      field: 'length',
    })
    expect(classifyKey(ctx({ key: '9', focus: 'hudLength' }))).toEqual({
      kind: 'focusHudField',
      field: 'length',
    })
    expect(classifyKey(ctx({ key: '9', focus: 'hudAngle' }))).toEqual({
      kind: 'focusHudField',
      field: 'angle',
    })
  })

  it('Backspace olha o campo que tem foco, nao sempre o de comprimento', () => {
    // Ângulo preenchido, comprimento vazio: apaga caractere do ângulo.
    expect(
      classifyKey(
        ctx({
          key: 'Backspace',
          focus: 'hudAngle',
          angleFieldEmpty: false,
          lengthFieldEmpty: true,
        }),
      ).kind,
    ).toBe('passToField')

    // Ângulo vazio: remove o último segmento.
    expect(
      classifyKey(ctx({ key: 'Backspace', focus: 'hudAngle', angleFieldEmpty: true })),
    ).toEqual({ kind: 'toolEvent', event: { type: 'backspace' } })
  })

  it('c fecha o polígono pelo campo de comprimento, mesmo com foco no ângulo', () => {
    expect(
      classifyKey(ctx({ key: 'c', focus: 'hudAngle', lengthFieldEmpty: true })),
    ).toEqual({ kind: 'toolEvent', event: { type: 'close' } })
  })

  it('dígito com foco no nome do comodo e texto', () => {
    expect(classifyKey(ctx({ key: '3', focus: 'roomName' })).kind).toBe('passToField')
  })

  it('letra comum com foco em campo vai para o campo', () => {
    expect(classifyKey(ctx({ key: 'q', focus: 'hudLength' })).kind).toBe('passToField')
  })

  it('Ctrl+Z desfaz mesmo com foco em campo', () => {
    expect(classifyKey(ctx({ key: 'z', ctrlOrMeta: true, focus: 'hudLength' })).kind).toBe('undo')
  })

  it('Ctrl+Shift+Z refaz', () => {
    expect(classifyKey(ctx({ key: 'z', ctrlOrMeta: true, shift: true })).kind).toBe('redo')
  })

  it('Home fora de campo enquadra, dentro de campo nao', () => {
    expect(classifyKey(ctx({ key: 'Home', drawing: false })).kind).toBe('frameAll')
    expect(classifyKey(ctx({ key: 'Home', focus: 'hudLength' })).kind).toBe('passToField')
  })
})

describe('classifyKey — fechar com C', () => {
  it('C com o campo vazio fecha, mesmo com foco no campo', () => {
    const action = classifyKey(ctx({ key: 'c', focus: 'hudLength', lengthFieldEmpty: true }))
    expect(action).toEqual({ kind: 'toolEvent', event: { type: 'close' } })
  })

  it('C com o campo preenchido e texto: pode ser sufixo de unidade', () => {
    expect(classifyKey(ctx({ key: 'c', focus: 'hudLength', lengthFieldEmpty: false })).kind).toBe(
      'passToField',
    )
  })

  it('C com foco no canvas fecha', () => {
    expect(classifyKey(ctx({ key: 'c' })).kind).toBe('toolEvent')
  })
})

describe('classifyKey — Backspace e Escape', () => {
  it('Backspace com campo vazio remove segmento; com campo preenchido edita o texto', () => {
    expect(classifyKey(ctx({ key: 'Backspace', focus: 'hudLength' })).kind).toBe('toolEvent')
    expect(
      classifyKey(ctx({ key: 'Backspace', focus: 'hudLength', lengthFieldEmpty: false })).kind,
    ).toBe('passToField')
  })

  it('Escape chega a ferramenta mesmo com foco em campo', () => {
    for (const focus of ['canvas', 'hudLength', 'hudAngle'] satisfies FocusKind[]) {
      expect(classifyKey(ctx({ key: 'Escape', focus })).kind).toBe('toolEvent')
    }
  })

  it('Escape sem desenho em andamento vai para a Ferramenta Selecionar', () => {
    expect(classifyKey(ctx({ key: 'Escape', drawing: false }))).toEqual({
      kind: 'selectEvent',
      event: { type: 'escape' },
    })
  })
})

describe('classifyKey — foco em campo de texto genérico (busca do catálogo, painel de propriedades)', () => {
  it('Backspace/Delete com seleção não excluem — vão para o campo', () => {
    for (const key of ['Backspace', 'Delete']) {
      expect(
        classifyKey(ctx({ key, focus: 'other', drawing: false, selectionHasFurniture: true })),
      ).toEqual({ kind: 'passToField' })
    }
  })

  it('letra de atalho de ferramenta não troca de ferramenta — vai para o campo', () => {
    for (const key of ['r', 'v', 'w', 'f', 'm']) {
      expect(classifyKey(ctx({ key, focus: 'other', drawing: false }))).toEqual({
        kind: 'passToField',
      })
    }
  })

  it('q/e e setas não giram nem movem o móvel selecionado — vão para o campo', () => {
    for (const key of ['q', 'e', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      expect(
        classifyKey(ctx({ key, focus: 'other', drawing: false, selectionHasFurniture: true })),
      ).toEqual({ kind: 'passToField' })
    }
  })

  it('dígito não é roteado para o HUD — vai para o campo', () => {
    expect(classifyKey(ctx({ key: '3', focus: 'other' }))).toEqual({ kind: 'passToField' })
  })

  it('Home não enquadra tudo — vai para o campo', () => {
    expect(classifyKey(ctx({ key: 'Home', focus: 'other', drawing: false }))).toEqual({
      kind: 'passToField',
    })
  })

  it('Escape e Ctrl/Cmd continuam funcionando (as duas exceções de D0)', () => {
    expect(classifyKey(ctx({ key: 'Escape', focus: 'other', drawing: false })).kind).toBe(
      'selectEvent',
    )
    expect(classifyKey(ctx({ key: 'z', focus: 'other', ctrlOrMeta: true })).kind).toBe('undo')
  })
})

describe('classifyKey — atalhos da Ferramenta Selecionar', () => {
  it('V ativa a Ferramenta Selecionar', () => {
    expect(classifyKey(ctx({ key: 'v', drawing: false, tool: 'select' }))).toEqual({
      kind: 'activateTool',
      tool: 'select',
    })
  })

  it('Ctrl+A seleciona tudo, mas não dentro de um campo de texto', () => {
    expect(classifyKey(ctx({ key: 'a', ctrlOrMeta: true, focus: 'canvas' }))).toEqual({
      kind: 'selectEvent',
      event: { type: 'selectAll' },
    })
    expect(classifyKey(ctx({ key: 'a', ctrlOrMeta: true, focus: 'roomName' })).kind).toBe(
      'none',
    )
  })

  it('Delete fora de campo exclui a seleção', () => {
    expect(classifyKey(ctx({ key: 'Delete', drawing: false, tool: 'select' }))).toEqual({
      kind: 'selectEvent',
      event: { type: 'deleteSelection' },
    })
  })

  it('Backspace durante o desenho continua removendo o último segmento', () => {
    expect(classifyKey(ctx({ key: 'Backspace', drawing: true, tool: 'room' }))).toEqual({
      kind: 'toolEvent',
      event: { type: 'backspace' },
    })
  })
})

describe('classifyKey — ativar ferramenta', () => {
  it('R ativa a ferramenta comodo', () => {
    expect(classifyKey(ctx({ key: 'r', tool: 'select', drawing: false }))).toEqual({
      kind: 'activateTool',
      tool: 'room',
    })
  })

  it('R com foco em campo e texto', () => {
    expect(classifyKey(ctx({ key: 'r', focus: 'roomName' })).kind).toBe('passToField')
  })

  it('F ativa a Ferramenta Mobília', () => {
    expect(classifyKey(ctx({ key: 'f', tool: 'select', drawing: false }))).toEqual({
      kind: 'activateTool',
      tool: 'furniture',
    })
  })
})

describe('classifyKey — atalhos escopados à seleção de mobília', () => {
  const furniture = { tool: 'select', drawing: false, selectionHasFurniture: true } as const

  it('Q e E giram 90°, e com Shift 15°', () => {
    expect(classifyKey(ctx({ ...furniture, key: 'q' }))).toEqual({
      kind: 'furnitureEvent',
      action: { kind: 'rotate', deltaDeg: -90 },
    })
    expect(classifyKey(ctx({ ...furniture, key: 'e' }))).toEqual({
      kind: 'furnitureEvent',
      action: { kind: 'rotate', deltaDeg: 90 },
    })
    expect(classifyKey(ctx({ ...furniture, key: 'Q', shift: true }))).toEqual({
      kind: 'furnitureEvent',
      action: { kind: 'rotate', deltaDeg: -15 },
    })
  })

  it('as setas movem 10 mm, e com Shift 100 mm', () => {
    expect(classifyKey(ctx({ ...furniture, key: 'ArrowLeft' }))).toEqual({
      kind: 'furnitureEvent',
      action: { kind: 'nudge', dx: -10, dy: 0 },
    })
    expect(classifyKey(ctx({ ...furniture, key: 'ArrowDown', shift: true }))).toEqual({
      kind: 'furnitureEvent',
      action: { kind: 'nudge', dx: 0, dy: 100 },
    })
  })

  it('Ctrl+D duplica', () => {
    expect(classifyKey(ctx({ ...furniture, key: 'd', ctrlOrMeta: true }))).toEqual({
      kind: 'furnitureEvent',
      action: { kind: 'duplicate' },
    })
  })

  /** A ferramenta ativa não importa: o escopo é a seleção (spec 03 § Mobília). */
  it('valem também com a Ferramenta Mobília ativa', () => {
    expect(
      classifyKey(ctx({ ...furniture, tool: 'furniture', key: 'e' })).kind,
    ).toBe('furnitureEvent')
  })

  it('sem mobília selecionada, Q e as setas não fazem nada', () => {
    expect(classifyKey(ctx({ key: 'q', tool: 'select', drawing: false })).kind).toBe('none')
    expect(classifyKey(ctx({ key: 'ArrowLeft', tool: 'select', drawing: false })).kind).toBe(
      'none',
    )
    expect(
      classifyKey(ctx({ key: 'd', ctrlOrMeta: true, tool: 'select', drawing: false })).kind,
    ).toBe('none')
  })

  it('com foco num campo, nenhum deles dispara', () => {
    expect(classifyKey(ctx({ ...furniture, key: 'e', focus: 'roomName' })).kind).toBe(
      'passToField',
    )
  })

  it('Ctrl+B recolhe o painel', () => {
    expect(classifyKey(ctx({ key: 'b', ctrlOrMeta: true })).kind).toBe('togglePanel')
  })
})
