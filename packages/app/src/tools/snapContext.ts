import {
  resolveSnap,
  type NodeId,
  type PlanDocument,
  type Point,
  type SnapEdge,
  type SnapResult,
} from '@planta/core'
import type { DraftNode } from './roomTool'

export interface SnapInputs {
  readonly doc: PlanDocument
  readonly draft: readonly DraftNode[]
  readonly scale: number
  readonly shift: boolean
  readonly alt: boolean
  /** Origem do eixo quando não há traço em andamento (arraste da Selecionar). */
  readonly origin?: Point | null
  /** Nós que o resolvedor deve ignorar — os que estão sendo arrastados. */
  readonly exclude?: readonly NodeId[]
}

/**
 * Resolve o snap considerando **também os nós em andamento**.
 *
 * Sem os nós do traço corrente, `SnapResult.merged` nunca aponta para o nó
 * inicial durante o primeiro cômodo, e fechar clicando nele é inalcançável.
 */
export function resolveToolSnap(point: Point, inputs: SnapInputs): SnapResult {
  const excluded = new Set(inputs.exclude ?? [])

  const byId = new Map<NodeId, { id: NodeId; x: number; y: number }>()
  for (const node of inputs.doc.nodes) {
    if (excluded.has(node.id)) continue
    byId.set(node.id, { id: node.id, x: node.x, y: node.y })
  }
  for (const node of inputs.draft) {
    if (excluded.has(node.id)) continue
    byId.set(node.id, { id: node.id, x: node.x, y: node.y })
  }

  const last = inputs.draft[inputs.draft.length - 1]
  const origin = last ? { x: last.x, y: last.y } : (inputs.origin ?? null)

  return resolveSnap(point, {
    nodes: [...byId.values()],
    edges: documentEdges(inputs.doc, excluded),
    origin,
    gridSize: inputs.doc.meta.gridSize,
    scale: inputs.scale,
    shift: inputs.shift,
    alt: inputs.alt,
  })
}

/**
 * Nó exatamente nesta coordenada, considerando também o traço em andamento.
 *
 * Consulta exata, não resolvedor de snap: quem chama já tem um ponto que não
 * pode ser movido — o comprimento digitado é exato — e só precisa saber se
 * aquele lugar já é ocupado.
 */
export function exactNodeAt(
  point: Point,
  inputs: Pick<SnapInputs, 'doc' | 'draft'>,
): NodeId | null {
  for (const node of inputs.draft) {
    if (node.x === point.x && node.y === point.y) return node.id
  }
  for (const node of inputs.doc.nodes) {
    if (node.x === point.x && node.y === point.y) return node.id
  }
  return null
}

/**
 * Arestas do documento para ponto médio, projeção e extensão.
 *
 * Uma aresta com ponta em nó arrastado é omitida: ela se move junto do cursor,
 * e deixar o próprio traço restringir o próprio traço faz o ponto grudar em si
 * mesmo.
 */
function documentEdges(doc: PlanDocument, excluded: ReadonlySet<NodeId>): SnapEdge[] {
  const position = new Map<NodeId, Point>()
  for (const node of doc.nodes) position.set(node.id, { x: node.x, y: node.y })

  const edges: SnapEdge[] = []

  for (const room of doc.rooms) {
    for (let i = 0; i < room.loop.length; i += 1) {
      const fromId = room.loop[i]!
      const toId = room.loop[(i + 1) % room.loop.length]!
      if (excluded.has(fromId) || excluded.has(toId)) continue

      const from = position.get(fromId)
      const to = position.get(toId)
      if (from && to) edges.push({ a: from, b: to })
    }
  }

  for (const wall of doc.walls) {
    if (excluded.has(wall.a) || excluded.has(wall.b)) continue
    const from = position.get(wall.a)
    const to = position.get(wall.b)
    if (from && to) edges.push({ a: from, b: to })
  }

  return edges
}
