import {
  DOCUMENT_COLORS,
  computeOccupancy,
  computeRoomArea,
  computeUsableArea,
  documentWarnings,
  edgePoints,
  formatAngle,
  formatArea,
  formatLength,
  formatPercent,
  furnitureInRoom,
  roomPoints,
  type EdgeRef,
  type FurnitureId,
  type NodeId,
  type PlanDocument,
  type Selection,
  type SelectionRef,
} from '@planta/core'
import { messages } from '../messages'

export type PanelModel =
  | {
      readonly kind: 'empty'
      readonly usableArea: string
      readonly totalArea: string
      readonly roomCount: number
      readonly furnitureCount: number
      readonly warnings: readonly PanelWarning[]
    }
  | {
      readonly kind: 'room'
      readonly name: string
      readonly area: string
      readonly perimeter: string
      readonly colorIndex: number | null
      readonly palette: readonly string[]
      readonly includeInUsableArea: boolean
      readonly furnitureCount: number
      readonly occupancy: string
    }
  | {
      readonly kind: 'edge'
      readonly lengthText: string
      readonly angle: string
      readonly adjacentRooms: string
    }
  | {
      readonly kind: 'node'
      readonly xText: string
      readonly yText: string
      readonly connectedRooms: string
    }
  | {
      readonly kind: 'furniture'
      readonly name: string
      readonly widthText: string
      readonly depthText: string
      readonly rotationText: string
      readonly clearanceText: string
      readonly locked: boolean
      readonly colorIndex: number | null
      readonly palette: readonly string[]
    }
  | {
      readonly kind: 'multi'
      readonly rooms: number
      readonly nodes: number
      readonly edges: number
      readonly furniture: number
    }

/**
 * Modelo do painel de propriedades a partir da seleção
 * (`07-ui-e-layout.md` § Painel de propriedades).
 *
 * Toda derivação vive aqui, e não no componente: `08-arquitetura.md` proíbe
 * cálculo geométrico em `.svelte`. O componente lê strings prontas.
 */
export function describeSelection(doc: PlanDocument, selection: Selection): PanelModel {
  if (selection.length === 0) return emptyModel(doc)
  if (selection.length > 1) return multiModel(selection)

  const ref = selection[0]!
  switch (ref.kind) {
    case 'room':
      return roomModel(doc, ref)
    case 'edge':
      return edgeModel(doc, ref.edge)
    case 'node':
      return nodeModel(doc, ref.nodeId)
    case 'furniture':
      return furnitureModel(doc, ref.furnitureId)
  }
}

function emptyModel(doc: PlanDocument): PanelModel {
  let total = 0
  for (const room of doc.rooms) total += computeRoomArea(doc, room.id)

  return {
    kind: 'empty',
    usableArea: formatArea(computeUsableArea(doc)),
    totalArea: formatArea(total),
    roomCount: doc.rooms.length,
    furnitureCount: doc.furniture.length,
    warnings: describeWarnings(doc),
  }
}

export interface PanelWarning {
  /** Identidade estável do aviso, para a lista renderizada. */
  readonly key: string
  readonly text: string
}

/**
 * Avisos ativos, um por issue de nível `warning`
 * (`07-ui-e-layout.md` § Painel de propriedades).
 *
 * A composição "qual entidade" + "qual aviso" vive aqui, e não no componente:
 * é derivação. `core` devolve issue estruturada com código e ids, e o texto sai
 * de `messages` — a mesma divisão que a spec 07 § Erros de `core` prescreve.
 *
 * A chave vem do código e dos ids, nunca do texto: dois móveis com o mesmo
 * nome produzem dois avisos com o mesmo texto, e uma lista com chave repetida
 * quebra a renderização inteira.
 *
 * **W5 fica de fora.** Nó órfão é estado normal de edição — excluir um cômodo
 * deixa quatro deles de uma vez —, e a spec 01 diz que eles são removidos por
 * garbage collection ao salvar, nunca durante a edição. Não há ação que o
 * usuário possa tomar, e quatro linhas iguais afogariam os avisos que importam.
 */
function describeWarnings(doc: PlanDocument): PanelWarning[] {
  const warnings: PanelWarning[] = []

  for (const issue of documentWarnings(doc)) {
    if (issue.code === 'W5') continue

    const names = issue.ids.map((id) => entityName(doc, id))
    const key = `${issue.code}:${issue.ids.join(',')}`

    switch (issue.code) {
      case 'W1':
        warnings.push({ key, text: `${names[0] ?? ''} · ${messages.selfIntersectingRoom}` })
        break
      case 'W2':
        warnings.push({ key, text: `${names.join(' · ')} · ${messages.overlappingRooms}` })
        break
      case 'W3':
        warnings.push({ key, text: `${names[0] ?? ''} · ${messages.furnitureOutsideRoom}` })
        break
      default:
        warnings.push({
          key,
          text: messages.furnitureOverlap(names[0] ?? '', names[1] ?? ''),
        })
    }
  }

  return warnings
}

function entityName(doc: PlanDocument, id: string): string {
  const room = doc.rooms.find((candidate) => candidate.id === id)
  if (room) return room.name

  const item = doc.furniture.find((candidate) => candidate.id === id)
  return item ? item.name : id
}

function roomModel(doc: PlanDocument, ref: SelectionRef & { kind: 'room' }): PanelModel {
  const room = doc.rooms.find((candidate) => candidate.id === ref.roomId)
  if (!room) return emptyModel(doc)

  const points = roomPoints(doc, room.id) ?? []
  let perimeter = 0
  for (let i = 0; i < points.length; i += 1) {
    const from = points[i]!
    const to = points[(i + 1) % points.length]!
    perimeter += Math.hypot(to.x - from.x, to.y - from.y)
  }

  const colorIndex = room.color === null ? null : DOCUMENT_COLORS.indexOf(room.color)

  return {
    kind: 'room',
    name: room.name,
    area: formatArea(computeRoomArea(doc, room.id)),
    perimeter: formatLength(perimeter, 'm'),
    colorIndex: colorIndex === -1 ? null : colorIndex,
    palette: DOCUMENT_COLORS,
    includeInUsableArea: room.includeInUsableArea,
    furnitureCount: furnitureInRoom(doc, room.id).length,
    occupancy: formatPercent(computeOccupancy(doc, room.id)),
  }
}

function edgeModel(doc: PlanDocument, edge: EdgeRef): PanelModel {
  const ends = edgePoints(doc, edge)
  if (!ends) return emptyModel(doc)

  const [from, to] = ends
  const length = Math.hypot(to.x - from.x, to.y - from.y)

  return {
    kind: 'edge',
    lengthText: String(Math.round(length / 10)),
    angle: formatAngle(Math.atan2(to.y - from.y, to.x - from.x)),
    adjacentRooms: joinNames(roomsOnEdge(doc, edge)),
  }
}

function nodeModel(doc: PlanDocument, nodeId: NodeId): PanelModel {
  const node = doc.nodes.find((candidate) => candidate.id === nodeId)
  if (!node) return emptyModel(doc)

  const names = doc.rooms
    .filter((room) => room.loop.includes(nodeId))
    .map((room) => room.name)

  return {
    kind: 'node',
    xText: String(node.x),
    yText: String(node.y),
    connectedRooms: joinNames(names),
  }
}

function furnitureModel(doc: PlanDocument, furnitureId: FurnitureId): PanelModel {
  const item = doc.furniture.find((candidate) => candidate.id === furnitureId)
  if (!item) return emptyModel(doc)

  const colorIndex = item.color === null ? null : DOCUMENT_COLORS.indexOf(item.color)

  return {
    kind: 'furniture',
    name: item.name,
    widthText: String(Math.round(item.width / 10)),
    depthText: String(Math.round(item.depth / 10)),
    rotationText: String(item.rotation),
    clearanceText: String(Math.round(item.clearance / 10)),
    locked: item.locked,
    colorIndex: colorIndex === -1 ? null : colorIndex,
    palette: DOCUMENT_COLORS,
  }
}

function multiModel(selection: Selection): PanelModel {
  let rooms = 0
  let nodes = 0
  let edges = 0
  let furniture = 0

  for (const ref of selection) {
    if (ref.kind === 'room') rooms += 1
    else if (ref.kind === 'node') nodes += 1
    else if (ref.kind === 'furniture') furniture += 1
    else edges += 1
  }

  return { kind: 'multi', rooms, nodes, edges, furniture }
}

/** Cômodos que contêm os dois extremos da aresta — os que ela separa. */
function roomsOnEdge(doc: PlanDocument, edge: EdgeRef): string[] {
  if (edge.kind === 'wall') return []

  const owner = doc.rooms.find((candidate) => candidate.id === edge.roomId)
  if (!owner || edge.index < 0 || edge.index >= owner.loop.length) return []

  const fromId = owner.loop[edge.index]!
  const toId = owner.loop[(edge.index + 1) % owner.loop.length]!

  return doc.rooms
    .filter((room) => room.loop.includes(fromId) && room.loop.includes(toId))
    .map((room) => room.name)
}

function joinNames(names: readonly string[]): string {
  return names.join(', ')
}
