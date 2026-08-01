import { describe, expect, it } from 'vitest'
import { classifyKey, type FocusKind, type KeyContext } from './toolShortcuts'

function ctx(overrides: Partial<KeyContext> = {}): KeyContext {
  return {
    key: 'a',
    ctrlOrMeta: false,
    shift: false,
    focus: 'canvas',
    toolActive: true,
    drawing: true,
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

describe('classifyKey — atalhos da Ferramenta Selecionar', () => {
  it('V ativa a Ferramenta Selecionar', () => {
    expect(classifyKey(ctx({ key: 'v', drawing: false, toolActive: false })).kind).toBe(
      'activateSelectTool',
    )
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
    expect(classifyKey(ctx({ key: 'Delete', drawing: false, toolActive: false }))).toEqual({
      kind: 'selectEvent',
      event: { type: 'deleteSelection' },
    })
  })

  it('Backspace durante o desenho continua removendo o último segmento', () => {
    expect(classifyKey(ctx({ key: 'Backspace', drawing: true, toolActive: true }))).toEqual({
      kind: 'toolEvent',
      event: { type: 'backspace' },
    })
  })
})

describe('classifyKey — ativar ferramenta', () => {
  it('R ativa a ferramenta comodo', () => {
    expect(classifyKey(ctx({ key: 'r', toolActive: false, drawing: false })).kind).toBe(
      'activateRoomTool',
    )
  })

  it('R com foco em campo e texto', () => {
    expect(classifyKey(ctx({ key: 'r', focus: 'roomName' })).kind).toBe('passToField')
  })
})
