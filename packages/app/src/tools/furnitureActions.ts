import type { Command, FurnitureId, PlanDocument, Selection } from '@planta/core'
import { selectedFurniture } from '@planta/core'
import { rotateBy } from './furnitureDrag'

/**
 * Ações escopadas à seleção de mobília: `Q`/`E`, setas e `Ctrl/Cmd+D`.
 *
 * Vivem aqui, e não na Ferramenta Mobília, porque a spec 03 as escopa à
 * **seleção** e não à ferramenta ativa — o estado mais comum é móvel
 * selecionado com a Ferramenta Selecionar ativa.
 *
 * Móvel travado é filtrado antes de virar comando. O comando também recusa
 * (`08-arquitetura.md` § Comandos do M3), mas emitir um lote que será rejeitado
 * inteiro faria um móvel travado no meio da seleção cancelar a rotação dos
 * outros.
 */
export const DUPLICATE_OFFSET_MM = 200
export const NUDGE_MM = 10
export const NUDGE_COARSE_MM = 100

export function rotateCommands(
  doc: PlanDocument,
  selection: Selection,
  deltaDeg: number,
): Command[] {
  const commands: Command[] = []

  for (const item of movable(doc, selection)) {
    commands.push({
      type: 'TransformFurniture',
      payload: {
        furnitureId: item.id,
        width: item.width,
        depth: item.depth,
        rotation: rotateBy(item.rotation, deltaDeg),
        center: item.center,
      },
    })
  }

  return batched(commands, 'Rotacionar')
}

export function nudgeCommands(
  doc: PlanDocument,
  selection: Selection,
  dx: number,
  dy: number,
): Command[] {
  const commands: Command[] = []

  for (const item of movable(doc, selection)) {
    commands.push({
      type: 'MoveFurniture',
      payload: {
        furnitureId: item.id,
        center: { x: item.center.x + dx, y: item.center.y + dy },
      },
    })
  }

  return batched(commands, 'Mover móvel')
}

/**
 * Duplica os móveis da seleção, deslocados 200 mm.
 *
 * Não existe comando de duplicação: uma cópia é um `AddFurniture` com os
 * campos do original. `locked` é copiado junto — a cópia de um móvel travado
 * nasce travada, que é o que "duplicar" quer dizer.
 */
export function duplicateCommands(
  doc: PlanDocument,
  selection: Selection,
  newId: () => FurnitureId,
): Command[] {
  const commands: Command[] = []

  for (const id of selectedFurniture(selection)) {
    const item = doc.furniture.find((candidate) => candidate.id === id)
    if (!item) continue

    commands.push({
      type: 'AddFurniture',
      payload: {
        furnitureId: newId(),
        catalogId: item.catalogId,
        name: item.name,
        width: item.width,
        depth: item.depth,
        center: {
          x: item.center.x + DUPLICATE_OFFSET_MM,
          y: item.center.y + DUPLICATE_OFFSET_MM,
        },
        rotation: item.rotation,
        clearance: item.clearance,
        color: item.color,
        locked: item.locked,
        outline: item.outline,
      },
    })
  }

  return batched(commands, 'Duplicar')
}

export function deleteFurnitureCommands(selection: Selection): Command[] {
  return selectedFurniture(selection).map((furnitureId) => ({
    type: 'DeleteFurniture',
    payload: { furnitureId },
  }))
}

function movable(doc: PlanDocument, selection: Selection) {
  const ids = new Set(selectedFurniture(selection))
  return doc.furniture.filter((item) => ids.has(item.id) && !item.locked)
}

/** Vários móveis numa ação só produzem **uma** entrada de histórico. */
function batched(commands: Command[], label: string): Command[] {
  if (commands.length <= 1) return commands
  return [{ type: 'Batch', payload: { label, commands } }]
}
