import type {
  Command,
  FurnitureId,
  FurnitureSnapResult,
  OverlayPrimitive,
  Point,
} from '@planta/core'
import { obbCorners } from '@planta/core'

/**
 * Item de catálogo já resolvido em dimensões.
 *
 * A ferramenta não conhece o pacote `catalog`: quem escolhe no painel monta
 * este rascunho. É a mesma fronteira que `AddFurniture` mantém em `core`.
 */
export interface FurnitureDraft {
  readonly catalogId: string | null
  readonly name: string
  readonly width: number
  readonly depth: number
  readonly clearance: number
  readonly outline: boolean
}

export type FurnitureToolState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'armed'; readonly draft: FurnitureDraft }

export type FurnitureToolEvent =
  | { readonly type: 'choose'; readonly draft: FurnitureDraft }
  | { readonly type: 'pointerMove' }
  | { readonly type: 'pointerDown' }
  | { readonly type: 'escape' }

export interface FurnitureToolContext {
  readonly cursor: Point
  readonly snap: (
    placement: { center: Point; rotation: number },
    size: { width: number; depth: number },
  ) => FurnitureSnapResult
  readonly newFurnitureId: () => FurnitureId
}

export interface FurnitureToolResult {
  readonly state: FurnitureToolState
  readonly commands: readonly Command[]
  readonly overlays: readonly OverlayPrimitive[]
  /** Preenchido no frame em que o móvel foi posicionado. */
  readonly placed: FurnitureId | null
}

export function initialFurnitureState(): FurnitureToolState {
  return { kind: 'idle' }
}

/**
 * Ferramenta Mobília: `Idle → Armed → posiciona → Idle`.
 *
 * Só insere. Mover, girar, redimensionar e duplicar vivem na Ferramenta
 * Selecionar (`03-ferramentas-e-interacao.md` § Mobília): a spec escopa `Q` e
 * `E` à seleção, e o estado logo depois de inserir é "móvel selecionado,
 * Ferramenta Selecionar ativa".
 */
export function furnitureToolTransition(
  state: FurnitureToolState,
  event: FurnitureToolEvent,
  ctx: FurnitureToolContext,
): FurnitureToolResult {
  switch (event.type) {
    case 'choose':
      return present({ kind: 'armed', draft: event.draft }, ctx)

    case 'pointerMove':
      return present(state, ctx)

    case 'escape':
      return present({ kind: 'idle' }, ctx)

    case 'pointerDown': {
      if (state.kind !== 'armed') return present(state, ctx)

      const placement = resolvePlacement(state.draft, ctx)
      const furnitureId = ctx.newFurnitureId()

      return {
        state: { kind: 'idle' },
        commands: [
          {
            type: 'AddFurniture',
            payload: {
              furnitureId,
              catalogId: state.draft.catalogId,
              name: state.draft.name,
              width: state.draft.width,
              depth: state.draft.depth,
              center: placement.center,
              rotation: placement.rotation,
              clearance: state.draft.clearance,
              outline: state.draft.outline ? true : undefined,
            },
          },
        ],
        overlays: [],
        placed: furnitureId,
      }
    }
  }
}

/** Fantasma do retângulo sob o cursor, já com o snap a parede resolvido. */
function present(
  state: FurnitureToolState,
  ctx: FurnitureToolContext,
): FurnitureToolResult {
  if (state.kind !== 'armed') {
    return { state, commands: [], overlays: [], placed: null }
  }

  const placement = resolvePlacement(state.draft, ctx)
  const corners = obbCorners(
    placement.center,
    state.draft.width,
    state.draft.depth,
    placement.rotation,
  )

  const overlays: OverlayPrimitive[] = [
    { kind: 'polyline', role: 'ghost', points: corners, closed: true },
  ]

  if (placement.edge) {
    overlays.push({
      kind: 'segment',
      role: 'edgeHighlight',
      a: placement.edge.a,
      b: placement.edge.b,
    })
  }

  return { state, commands: [], overlays, placed: null }
}

function resolvePlacement(draft: FurnitureDraft, ctx: FurnitureToolContext) {
  const result = ctx.snap(
    { center: roundPoint(ctx.cursor), rotation: 0 },
    { width: draft.width, depth: draft.depth },
  )
  return { ...result.placement, edge: result.edge }
}

function roundPoint(point: Point): Point {
  return { x: Math.round(point.x), y: Math.round(point.y) }
}
