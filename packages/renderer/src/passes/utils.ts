import type { PlanDocument, NodeId } from '@planta/core'

/**
 * Resolve um loop de NodeId[] para um array de {x,y}.
 * Retorna null se algum nó não for encontrado.
 */
export function resolveRoomPoints(
  doc: PlanDocument,
  loop: NodeId[],
): { x: number; y: number }[] | null {
  const result: { x: number; y: number }[] = []
  for (const id of loop) {
    const node = doc.nodes.find((n) => n.id === id)
    if (!node) return null
    result.push({ x: node.x, y: node.y })
  }
  return result
}