import { describe, it, expect } from 'vitest';
import { DocumentStore } from './store';
import type { NodeId, PlanDocument, RoomId } from '../model';
import { createEmptyDocument } from '../model';
import { applyCommand } from '../commands';

const n = (id: string): NodeId => id as NodeId;

function squareDocument(): PlanDocument {
  return applyCommand(createEmptyDocument(), {
    type: 'CreateRoom',
    payload: {
      nodes: [
        { id: n('a'), x: 0, y: 0 },
        { id: n('b'), x: 3200, y: 0 },
        { id: n('c'), x: 3200, y: 2500 },
        { id: n('d'), x: 0, y: 2500 },
      ],
      loop: [n('a'), n('b'), n('c'), n('d')],
      name: 'Quarto',
      roomId: 'r1' as RoomId,
    },
  }).document;
}

function nodeAt(doc: PlanDocument, id: string): { x: number; y: number } {
  const node = doc.nodes.find((candidate) => candidate.id === id);
  if (!node) throw new Error(`nó ${id} não existe`);
  return { x: node.x, y: node.y };
}

/** Um frame de arraste: um `MoveNode` transiente, como a ferramenta emite. */
function dragFrame(store: DocumentStore, id: string, x: number, y: number): void {
  store.dispatch({ type: 'MoveNode', transient: true, payload: { nodeId: n(id), x, y } });
}

describe('arraste — entrada pendente e histórico (spec 08 § Histórico)', () => {
  it('arrastar um nó por 40 frames produz uma única entrada de undo', () => {
    const store = new DocumentStore(squareDocument());

    for (let frame = 1; frame <= 40; frame += 1) {
      dragFrame(store, 'b', 3200 + frame * 10, 0);
    }
    store.sealPending();

    expect(nodeAt(store.current, 'b')).toEqual({ x: 3600, y: 0 });
    expect(store.canUndo).toBe(true);

    store.undo();
    expect(store.canUndo).toBe(false);
    expect(nodeAt(store.current, 'b')).toEqual({ x: 3200, y: 0 });
  });

  it('arrastar por 3 frames distintos e desfazer devolve o nó à posição inicial', () => {
    const store = new DocumentStore(squareDocument());

    dragFrame(store, 'b', 3300, 100);
    dragFrame(store, 'b', 3400, 200);
    dragFrame(store, 'b', 3500, 300);
    store.sealPending();

    expect(nodeAt(store.current, 'b')).toEqual({ x: 3500, y: 300 });

    store.undo();

    expect(nodeAt(store.current, 'b')).toEqual({ x: 3200, y: 0 });
  });

  it('redo depois de desfazer um arraste devolve a posição final, não um ponto do meio', () => {
    const store = new DocumentStore(squareDocument());

    dragFrame(store, 'b', 3300, 100);
    dragFrame(store, 'b', 3400, 200);
    dragFrame(store, 'b', 3500, 300);
    store.sealPending();

    store.undo();
    store.redo();

    expect(nodeAt(store.current, 'b')).toEqual({ x: 3500, y: 300 });
  });

  it('Esc durante um arraste reverte para a posição inicial e não empilha entrada', () => {
    const store = new DocumentStore(squareDocument());

    dragFrame(store, 'b', 3300, 100);
    dragFrame(store, 'b', 3400, 200);
    dragFrame(store, 'b', 3500, 300);

    store.abortPending();

    expect(nodeAt(store.current, 'b')).toEqual({ x: 3200, y: 0 });
    expect(store.hasPending).toBe(false);
    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(false);
  });

  it('Ctrl+Z com entrada pendente aberta não altera documento nem pilha, e o arraste segue', () => {
    const store = new DocumentStore(squareDocument());

    dragFrame(store, 'b', 3300, 100);
    dragFrame(store, 'b', 3400, 200);

    store.undo();

    expect(nodeAt(store.current, 'b')).toEqual({ x: 3400, y: 200 });
    expect(store.hasPending).toBe(true);
    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(false);

    dragFrame(store, 'b', 3500, 300);
    store.sealPending();

    expect(nodeAt(store.current, 'b')).toEqual({ x: 3500, y: 300 });
    expect(store.canUndo).toBe(true);

    store.undo();
    expect(nodeAt(store.current, 'b')).toEqual({ x: 3200, y: 0 });
  });

  it('undo de um arraste seguido de undo do comando anterior desfaz na ordem certa', () => {
    const store = new DocumentStore();

    store.dispatch({
      type: 'CreateRoom',
      payload: {
        nodes: [
          { id: n('a'), x: 0, y: 0 },
          { id: n('b'), x: 3200, y: 0 },
          { id: n('c'), x: 3200, y: 2500 },
        ],
        loop: [n('a'), n('b'), n('c')],
        name: 'Quarto',
      },
    });

    dragFrame(store, 'b', 3300, 100);
    dragFrame(store, 'b', 3400, 200);
    dragFrame(store, 'b', 3500, 300);
    store.sealPending();

    store.undo();
    expect(nodeAt(store.current, 'b')).toEqual({ x: 3200, y: 0 });

    store.undo();
    expect(store.current.rooms).toHaveLength(0);
    expect(store.current.nodes).toHaveLength(0);
  });

  it('compactação: 40 frames de replace colapsam num grupo de dois patches', () => {
    const store = new DocumentStore(squareDocument());

    for (let frame = 1; frame <= 40; frame += 1) {
      dragFrame(store, 'b', 3200 + frame * 10, frame);
    }
    store.sealPending();

    const entry = store.lastEntry;
    expect(entry).not.toBeNull();
    expect(entry!.inversePatchGroups).toHaveLength(1);
    expect(entry!.inversePatchGroups[0]).toHaveLength(2);
    expect(entry!.patchGroups[0]).toHaveLength(2);
  });
});

describe('Batch', () => {
  it('produz uma única entrada de histórico e desfaz os dois comandos juntos', () => {
    const store = new DocumentStore(squareDocument());

    store.dispatch({
      type: 'Batch',
      payload: {
        label: 'Mover canto',
        commands: [
          { type: 'MoveNode', payload: { nodeId: n('b'), x: 4000, y: 0 } },
          { type: 'MoveNode', payload: { nodeId: n('c'), x: 4000, y: 2500 } },
        ],
      },
    });

    expect(nodeAt(store.current, 'b')).toEqual({ x: 4000, y: 0 });
    expect(nodeAt(store.current, 'c')).toEqual({ x: 4000, y: 2500 });

    store.undo();

    expect(nodeAt(store.current, 'b')).toEqual({ x: 3200, y: 0 });
    expect(nodeAt(store.current, 'c')).toEqual({ x: 3200, y: 2500 });
    expect(store.canUndo).toBe(false);
  });

  it('um comando interno rejeitado rejeita o lote inteiro sem tocar no documento', () => {
    const before = squareDocument();
    const store = new DocumentStore(before);

    store.dispatch({
      type: 'Batch',
      payload: {
        label: 'Mover canto',
        commands: [
          { type: 'MoveNode', payload: { nodeId: n('b'), x: 4000, y: 0 } },
          { type: 'MoveNode', payload: { nodeId: n('zzz'), x: 1, y: 1 } },
        ],
      },
    });

    expect(store.current).toBe(before);
    expect(store.canUndo).toBe(false);
    expect(store.lastError?.code).toBe('NODE_NOT_FOUND');
  });

  it('redo de um lote reaplica os comandos na ordem original', () => {
    const store = new DocumentStore(squareDocument());

    store.dispatch({
      type: 'Batch',
      payload: {
        label: 'Mover canto',
        commands: [
          { type: 'MoveNode', payload: { nodeId: n('b'), x: 4000, y: 0 } },
          { type: 'MoveNode', payload: { nodeId: n('c'), x: 4000, y: 2500 } },
        ],
      },
    });

    store.undo();
    store.redo();

    expect(nodeAt(store.current, 'b')).toEqual({ x: 4000, y: 0 });
    expect(nodeAt(store.current, 'c')).toEqual({ x: 4000, y: 2500 });
  });
});
