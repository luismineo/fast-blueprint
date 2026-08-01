import type { RoomToolEvent } from './roomTool'

export type FocusKind = 'canvas' | 'hudLength' | 'hudAngle' | 'roomName' | 'other'

export interface KeyContext {
  readonly key: string
  readonly ctrlOrMeta: boolean
  readonly shift: boolean
  readonly focus: FocusKind
  readonly toolActive: boolean
  readonly drawing: boolean
  readonly lengthFieldEmpty: boolean
}

export type KeyAction =
  | { readonly kind: 'none' }
  | { readonly kind: 'passToField' }
  | { readonly kind: 'toolEvent'; readonly event: RoomToolEvent }
  | { readonly kind: 'activateRoomTool' }
  | { readonly kind: 'frameAll' }
  | { readonly kind: 'undo' }
  | { readonly kind: 'redo' }
  | { readonly kind: 'focusHudField'; readonly field: 'length' | 'angle' }

const IN_FIELD: ReadonlySet<FocusKind> = new Set<FocusKind>(['hudLength', 'hudAngle', 'roomName'])

/**
 * Regra D0 de `03-ferramentas-e-interacao.md`: enquanto o foco está num campo,
 * nenhum atalho global dispara. As únicas exceções são `Esc` e combinações
 * com `Ctrl/Cmd`.
 */
export function classifyKey(ctx: KeyContext): KeyAction {
  if (ctx.ctrlOrMeta) {
    if (ctx.key === 'z') return ctx.shift ? { kind: 'redo' } : { kind: 'undo' }
    if (ctx.key === 'y') return { kind: 'redo' }
    return { kind: 'none' }
  }

  const inField = IN_FIELD.has(ctx.focus)

  if (ctx.key === 'Escape') {
    if (!ctx.toolActive || !ctx.drawing) return { kind: 'none' }
    return { kind: 'toolEvent', event: { type: 'escape' } }
  }

  // Dígitos são permanentemente reservados para a entrada numérica
  // (`03-ferramentas-e-interacao.md`). Roteá-los sempre pela ferramenta, mesmo
  // com o campo focado, mantém o valor sob controle do estado: deixar o
  // browser inserir o caractere depende da posição do cursor no campo e
  // embaralha a ordem dos dígitos.
  if (ctx.toolActive && ctx.drawing && ctx.focus !== 'roomName' && /^[0-9]$/.test(ctx.key)) {
    return { kind: 'focusHudField', field: 'length' }
  }

  if (inField) {
    if (ctx.focus === 'roomName') return { kind: 'passToField' }

    if (ctx.key === 'Enter') return { kind: 'toolEvent', event: { type: 'enter' } }
    if (ctx.key === 'Tab') {
      return { kind: 'focusHudField', field: ctx.focus === 'hudLength' ? 'angle' : 'length' }
    }
    if (ctx.key === 'Backspace' && ctx.lengthFieldEmpty) {
      return { kind: 'toolEvent', event: { type: 'backspace' } }
    }
    // `c` fecha o polígono com o campo vazio, e é caractere de sufixo de
    // unidade ("320cm") com o campo preenchido. Sem essa distinção, a
    // sequência documentada `320 Enter … C` não fecharia: depois do Enter o
    // foco está no campo, e todo `c` viraria texto.
    if ((ctx.key === 'c' || ctx.key === 'C') && ctx.lengthFieldEmpty) {
      return { kind: 'toolEvent', event: { type: 'close' } }
    }
    return { kind: 'passToField' }
  }

  if (ctx.key === 'Home') return { kind: 'frameAll' }

  if (ctx.toolActive && ctx.drawing) {
    if (ctx.key === 'Enter') return { kind: 'toolEvent', event: { type: 'enter' } }
    if (ctx.key === 'Backspace') return { kind: 'toolEvent', event: { type: 'backspace' } }
    if (ctx.key === 'c' || ctx.key === 'C') return { kind: 'toolEvent', event: { type: 'close' } }
    if (ctx.key === 'Tab') return { kind: 'focusHudField', field: 'length' }
  }

  if (ctx.key === 'r' || ctx.key === 'R') return { kind: 'activateRoomTool' }

  return { kind: 'none' }
}
