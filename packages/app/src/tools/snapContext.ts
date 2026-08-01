import { resolveSnap, type NodeId, type PlanDocument, type Point, type SnapResult } from '@planta/core'
import type { DraftNode } from './roomTool'

export interface SnapInputs {
  readonly doc: PlanDocument
  readonly draft: readonly DraftNode[]
  readonly scale: number
  readonly shift: boolean
  readonly alt: boolean
}

/**
 * Resolve o snap considerando **também os nós em andamento**.
 *
 * Sem os nós do traço corrente, `SnapResult.merged` nunca aponta para o nó
 * inicial durante o primeiro cômodo, e fechar clicando nele é inalcançável.
 */
export function resolveToolSnap(point: Point, inputs: SnapInputs): SnapResult {
  const byId = new Map<NodeId, { id: NodeId; x: number; y: number }>()
  for (const node of inputs.doc.nodes) byId.set(node.id, { id: node.id, x: node.x, y: node.y })
  for (const node of inputs.draft) byId.set(node.id, { id: node.id, x: node.x, y: node.y })

  const last = inputs.draft[inputs.draft.length - 1]

  return resolveSnap(point, {
    nodes: [...byId.values()],
    origin: last ? { x: last.x, y: last.y } : null,
    gridSize: inputs.doc.meta.gridSize,
    scale: inputs.scale,
    shift: inputs.shift,
    alt: inputs.alt,
  })
}
