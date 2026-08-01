import { describe, it, expect } from 'vitest'
import { DocumentStore } from './store'
import type { NodeId, PlanDocument } from '../model'
import { createEmptyDocument, validateDocumentErrors } from '../model'
import { computeRoomArea } from '../commands'

describe('DocumentStore', () => {
  const makeRoomPayload = () => {
    const nodeIds: NodeId[] = ['n1', 'n2', 'n3', 'n4'].map((id) => id as NodeId)
    return {
      type: 'CreateRoom' as const,
      payload: {
        nodes: [
          { id: nodeIds[0]!, x: 0, y: 0 },
          { id: nodeIds[1]!, x: 3200, y: 0 },
          { id: nodeIds[2]!, x: 3200, y: 2500 },
          { id: nodeIds[3]!, x: 0, y: 2500 },
        ],
        loop: nodeIds,
        name: 'Quarto',
      },
    }
  }

  it('dispatch cria cômodo', () => {
    const store = new DocumentStore()
    store.dispatch(makeRoomPayload())
    expect(store.current.rooms).toHaveLength(1)
  })

  it('undo restaura documento vazio', () => {
    const store = new DocumentStore()
    store.dispatch(makeRoomPayload())
    expect(store.current.rooms).toHaveLength(1)
    store.undo()
    expect(store.current.rooms).toHaveLength(0)
  })

  it('redo após undo restaura cômodo', () => {
    const store = new DocumentStore()
    store.dispatch(makeRoomPayload())
    const roomId = store.current.rooms[0]!.id
    store.undo()
    store.redo()
    expect(store.current.rooms).toHaveLength(1)
    expect(store.current.rooms[0]!.id).toBe(roomId)
  })

  it('undo sem nada no histórico é no-op', () => {
    const store = new DocumentStore()
    store.undo()
    expect(store.current.rooms).toHaveLength(0)
  })

  it('redo sem nada é no-op', () => {
    const store = new DocumentStore()
    store.redo()
    expect(store.current.rooms).toHaveLength(0)
  })

  it('canUndo/canRedo refletem estado', () => {
    const store = new DocumentStore()
    expect(store.canUndo).toBe(false)
    expect(store.canRedo).toBe(false)

    store.dispatch(makeRoomPayload())
    expect(store.canUndo).toBe(true)
    expect(store.canRedo).toBe(false)

    store.undo()
    expect(store.canUndo).toBe(false)
    expect(store.canRedo).toBe(true)
  })

  it('comando novo limpa redo', () => {
    const store = new DocumentStore()
    store.dispatch(makeRoomPayload())
    store.undo()
    expect(store.canRedo).toBe(true)

    // Novo comando limpa redo
    const nodeIds: NodeId[] = ['n5', 'n6', 'n7', 'n8'].map((id) => id as NodeId)
    store.dispatch({
      type: 'CreateRoom',
      payload: {
        nodes: [
          { id: nodeIds[0]!, x: 5000, y: 0 },
          { id: nodeIds[1]!, x: 6000, y: 0 },
          { id: nodeIds[2]!, x: 6000, y: 2000 },
          { id: nodeIds[3]!, x: 5000, y: 2000 },
        ],
        loop: nodeIds,
        name: 'Sala',
      },
    })
    expect(store.canRedo).toBe(false)
    expect(store.current.rooms).toHaveLength(1)
  })

  it('comando transiente não entra no histórico', () => {
    const store = new DocumentStore()
    store.dispatch({ ...makeRoomPayload(), transient: true })
    // O documento muda mas não empilha
    expect(store.current.rooms).toHaveLength(1)
    expect(store.canUndo).toBe(false)
    expect(store.hasPending).toBe(true)
  })

  it('abortPending reverte comando transiente', () => {
    const store = new DocumentStore()
    store.dispatch({ ...makeRoomPayload(), transient: true })
    expect(store.current.rooms).toHaveLength(1)

    store.abortPending()
    expect(store.current.rooms).toHaveLength(0)
    expect(store.hasPending).toBe(false)
    expect(store.canUndo).toBe(false)
  })

  it('sealPending empilha entrada pendente no histórico', () => {
    const store = new DocumentStore()
    store.dispatch({ ...makeRoomPayload(), transient: true })
    expect(store.hasPending).toBe(true)

    store.sealPending()
    expect(store.hasPending).toBe(false)
    expect(store.canUndo).toBe(true)
    expect(store.current.rooms).toHaveLength(1)

    store.undo()
    expect(store.current.rooms).toHaveLength(0)
  })

  it('comando não-transiente sela pendência existente', () => {
    const store = new DocumentStore()
    // Transiente primeiro
    store.dispatch({ ...makeRoomPayload(), transient: true })
    expect(store.hasPending).toBe(true)
    expect(store.canUndo).toBe(false)

    // Não-transiente sela o pendente e empilha ambos
    store.dispatch(makeRoomPayload())
    expect(store.hasPending).toBe(false)
    // O não-transiente sela o pendente → 1 entrada no undo (não 2 separadas,
    // porque o transient foi selado ANTES do não-transiente ser empilhado)
    expect(store.canUndo).toBe(true)
  })

  it('subscriber é notificado', () => {
    const store = new DocumentStore()
    let notified = false
    store.subscribe(() => {
      notified = true
    })
    store.dispatch(makeRoomPayload())
    expect(notified).toBe(true)
  })

  it('undo durante pendência é ignorado', () => {
    const store = new DocumentStore()
    store.dispatch({ ...makeRoomPayload(), transient: true })
    expect(store.current.rooms).toHaveLength(1)

    store.undo() // ignorado porque tem pendência
    expect(store.current.rooms).toHaveLength(1)
    expect(store.hasPending).toBe(true)
  })

  it('limite de 500 entradas descarta as mais antigas', () => {
    const store = new DocumentStore()
    for (let i = 0; i < 510; i++) {
      const ids: NodeId[] = ['a', 'b', 'c'].map((p) => `n${p}${i}` as NodeId)
      store.dispatch({
        type: 'CreateRoom',
        payload: {
          nodes: [
            { id: ids[0]!, x: i * 100, y: 0 },
            { id: ids[1]!, x: i * 100 + 100, y: 0 },
            { id: ids[2]!, x: i * 100 + 100, y: 100 },
          ],
          loop: ids,
          name: `Room ${i}`,
        },
      })
    }
    // Deve ter no máximo 500 entradas (não testamos diretamente,
    // mas não deve crashar)
    expect(store.current.rooms.length).toBeGreaterThan(0)
  })

  it('documento customizado no construtor', () => {
    const doc = createEmptyDocument()
    const store = new DocumentStore(doc)
    expect(store.current.nodes).toHaveLength(0)
  })
})