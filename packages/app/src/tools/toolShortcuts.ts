import type { RoomToolEvent } from './roomTool'
import type { SelectToolEvent } from './selectTool'
import { NUDGE_COARSE_MM, NUDGE_MM } from './furnitureActions'

export type ToolId = 'select' | 'room' | 'wall' | 'furniture' | 'measure'

export type FocusKind =
  | 'canvas'
  | 'hudLength'
  | 'hudAngle'
  | 'roomName'
  | 'toolbar'
  | 'other'

export interface KeyContext {
  readonly key: string
  readonly ctrlOrMeta: boolean
  readonly shift: boolean
  readonly focus: FocusKind
  readonly tool: ToolId
  readonly drawing: boolean
  readonly lengthFieldEmpty: boolean
  readonly angleFieldEmpty: boolean
  readonly selectionHasFurniture: boolean
}

/** Ações escopadas à seleção de mobília (spec 03 § Mobília). */
export type FurnitureAction =
  | { readonly kind: 'rotate'; readonly deltaDeg: number }
  | { readonly kind: 'nudge'; readonly dx: number; readonly dy: number }
  | { readonly kind: 'duplicate' }

export type KeyAction =
  | { readonly kind: 'none' }
  | { readonly kind: 'passToField' }
  | { readonly kind: 'toolEvent'; readonly event: RoomToolEvent }
  | { readonly kind: 'wallEvent'; readonly event: { type: 'enter' } | { type: 'backspace' } }
  | { readonly kind: 'selectEvent'; readonly event: SelectToolEvent }
  | { readonly kind: 'furnitureEvent'; readonly action: FurnitureAction }
  | { readonly kind: 'activateTool'; readonly tool: ToolId }
  | { readonly kind: 'frameAll' }
  | { readonly kind: 'undo' }
  | { readonly kind: 'redo' }
  | { readonly kind: 'togglePanel' }
  | { readonly kind: 'focusHudField'; readonly field: 'length' | 'angle' }
  | { readonly kind: 'focusWallHudField'; readonly field: 'length' | 'angle' }

const IN_FIELD: ReadonlySet<FocusKind> = new Set<FocusKind>(['hudLength', 'hudAngle', 'roomName'])

const ROTATION_STEP_DEG = 90
const ROTATION_FINE_DEG = 15

const ARROWS: Readonly<Record<string, { dx: number; dy: number }>> = {
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
}

/**
 * Regra D0 de `03-ferramentas-e-interacao.md`: enquanto o foco está num campo,
 * nenhum atalho global dispara. As únicas exceções são `Esc` e combinações
 * com `Ctrl/Cmd`.
 */
export function classifyKey(ctx: KeyContext): KeyAction {
  const inField = IN_FIELD.has(ctx.focus)

  if (ctx.ctrlOrMeta) {
    if (ctx.key === 'z') return ctx.shift ? { kind: 'redo' } : { kind: 'undo' }
    if (ctx.key === 'y') return { kind: 'redo' }
    if (ctx.key === 'b') return { kind: 'togglePanel' }
    if (ctx.key === 'a' && !inField) {
      return { kind: 'selectEvent', event: { type: 'selectAll' } }
    }
    if (ctx.key === 'd' && ctx.selectionHasFurniture) {
      return { kind: 'furnitureEvent', action: { kind: 'duplicate' } }
    }
    return { kind: 'none' }
  }

  if (ctx.key === 'Escape') {
    if (ctx.tool === 'room' && ctx.drawing) {
      return { kind: 'toolEvent', event: { type: 'escape' } }
    }
    return { kind: 'selectEvent', event: { type: 'escape' } }
  }

  // Widget composto gerencia a própria navegação: com foco na barra de
  // ferramentas, `Home` move o foco em vez de enquadrar, e nenhum atalho
  // global dispara. É a mesma regra D0 que vale para campo de texto — o
  // elemento com foco consome a tecla.
  if (ctx.focus === 'toolbar') return { kind: 'none' }

  // Dígitos são permanentemente reservados para a entrada numérica
  // (`03-ferramentas-e-interacao.md`). Roteá-los sempre pela ferramenta, mesmo
  // com o campo focado, mantém o valor sob controle do estado: deixar o
  // browser inserir o caractere depende da posição do cursor no campo e
  // embaralha a ordem dos dígitos.
  //
  // O dígito vai para o campo que **tem foco**. Mandar todo dígito para
  // comprimento tornaria a entrada de ângulo inalcançável, já que o único
  // caminho até aquele campo é `Tab`.
  if (ctx.tool === 'room' && ctx.drawing && ctx.focus !== 'roomName' && /^[0-9]$/.test(ctx.key)) {
    return { kind: 'focusHudField', field: ctx.focus === 'hudAngle' ? 'angle' : 'length' }
  }

  if (inField) {
    if (ctx.focus === 'roomName') return { kind: 'passToField' }

    if (ctx.key === 'Enter') return { kind: 'toolEvent', event: { type: 'enter' } }
    if (ctx.key === 'Tab') {
      return { kind: 'focusHudField', field: ctx.focus === 'hudLength' ? 'angle' : 'length' }
    }
    if (ctx.key === 'Backspace' && focusedFieldEmpty(ctx)) {
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

  // `Q`, `E` e as setas são escopados à **seleção**, não à ferramenta ativa: o
  // estado mais comum é móvel inserido com a Ferramenta Selecionar de volta.
  if (ctx.selectionHasFurniture) {
    const furniture = furnitureAction(ctx)
    if (furniture) return { kind: 'furnitureEvent', action: furniture }
  }

  if (ctx.key === 'Home') return { kind: 'frameAll' }

  if (ctx.tool === 'room' && ctx.drawing) {
    if (ctx.key === 'Enter') return { kind: 'toolEvent', event: { type: 'enter' } }
    if (ctx.key === 'Backspace') return { kind: 'toolEvent', event: { type: 'backspace' } }
    if (ctx.key === 'c' || ctx.key === 'C') return { kind: 'toolEvent', event: { type: 'close' } }
    if (ctx.key === 'Tab') return { kind: 'focusHudField', field: 'length' }
  }

  if (ctx.tool === 'wall' && ctx.drawing) {
    if (ctx.key === 'Enter') return { kind: 'wallEvent', event: { type: 'enter' } }
    if (ctx.key === 'Backspace') return { kind: 'wallEvent', event: { type: 'backspace' } }
    if (ctx.key === 'Tab') return { kind: 'focusWallHudField', field: 'length' }
  }

  if (ctx.key === 'Delete' || ctx.key === 'Backspace') {
    return { kind: 'selectEvent', event: { type: 'deleteSelection' } }
  }

  if (ctx.key === 'r' || ctx.key === 'R') return { kind: 'activateTool', tool: 'room' }
  if (ctx.key === 'v' || ctx.key === 'V') return { kind: 'activateTool', tool: 'select' }
  if (ctx.key === 'w' || ctx.key === 'W') return { kind: 'activateTool', tool: 'wall' }
  if (ctx.key === 'f' || ctx.key === 'F') return { kind: 'activateTool', tool: 'furniture' }
  if (ctx.key === 'm' || ctx.key === 'M') return { kind: 'activateTool', tool: 'measure' }

  return { kind: 'none' }
}

function furnitureAction(ctx: KeyContext): FurnitureAction | null {
  const step = ctx.shift ? ROTATION_FINE_DEG : ROTATION_STEP_DEG

  if (ctx.key === 'q' || ctx.key === 'Q') return { kind: 'rotate', deltaDeg: -step }
  if (ctx.key === 'e' || ctx.key === 'E') return { kind: 'rotate', deltaDeg: step }

  const arrow = ARROWS[ctx.key]
  if (arrow) {
    const distance = ctx.shift ? NUDGE_COARSE_MM : NUDGE_MM
    return { kind: 'nudge', dx: arrow.dx * distance, dy: arrow.dy * distance }
  }

  return null
}

/**
 * `Backspace` apaga caractere do campo que tem foco e só remove o último
 * segmento quando esse campo está vazio.
 *
 * As demais regras de "campo vazio" (`c` fecha o polígono) continuam olhando o
 * campo de comprimento, independentemente do foco — `c` não é caractere de
 * ângulo, e é o comprimento que a sequência de referência preenche.
 */
function focusedFieldEmpty(ctx: KeyContext): boolean {
  return ctx.focus === 'hudAngle' ? ctx.angleFieldEmpty : ctx.lengthFieldEmpty
}
