import { describe, it, expect } from 'vitest';
import { applyCommand, computeRoomArea, computeUsableArea } from './commands';
import { shoelaceArea } from '../geometry';
import type { NodeId } from '../model';
import { createEmptyDocument, validateDocumentErrors } from '../model';
import { DocumentStore } from '../history';

describe('commands', () => {
  describe('CreateRoom', () => {
    it('retângulo 3200x2500 com área 8.000.000 mm²', () => {
      const doc = createEmptyDocument();
      const nodeIds: NodeId[] = [
        'n1' as NodeId,
        'n2' as NodeId,
        'n3' as NodeId,
        'n4' as NodeId,
      ];

      const result = applyCommand(doc, {
        type: 'CreateRoom',
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
      });

      expect(result.document.nodes).toHaveLength(4);
      expect(result.document.rooms).toHaveLength(1);
      expect(computeRoomArea(result.document, result.document.rooms[0]!.id)).toBe(
        8_000_000,
      );
    });

    it('merge de nós — coordenadas idênticas reusam nó existente', () => {
      const doc = createEmptyDocument();
      // Primeiro cômodo
      const nodeIds1: NodeId[] = ['n1', 'n2', 'n3', 'n4'].map(
        (id) => id as NodeId,
      );
      const r1 = applyCommand(doc, {
        type: 'CreateRoom',
        payload: {
          nodes: [
            { id: nodeIds1[0]!, x: 0, y: 0 },
            { id: nodeIds1[1]!, x: 3200, y: 0 },
            { id: nodeIds1[2]!, x: 3200, y: 2500 },
            { id: nodeIds1[3]!, x: 0, y: 2500 },
          ],
          loop: nodeIds1,
          name: 'Quarto',
        },
      });

      // Segundo cômodo adjacente (compartilha aresta direita)
      const nodeIds2: NodeId[] = ['n5', 'n6', 'n7', 'n8'].map(
        (id) => id as NodeId,
      );
      // n5 e n8 coincidem com n2 e n3 do primeiro cômodo
      const r2 = applyCommand(r1.document, {
        type: 'CreateRoom',
        payload: {
          nodes: [
            { id: nodeIds2[0]!, x: 3200, y: 0 }, // = n2
            { id: nodeIds2[1]!, x: 6400, y: 0 },
            { id: nodeIds2[2]!, x: 6400, y: 2500 },
            { id: nodeIds2[3]!, x: 3200, y: 2500 }, // = n3
          ],
          loop: nodeIds2,
          name: 'Sala',
        },
      });

      // Deve ter 6 nós, não 8 (n2 e n3 foram reusados)
      expect(r2.document.nodes).toHaveLength(6);
      expect(r2.document.rooms).toHaveLength(2);

      // Sem erros de validação
      const errors = validateDocumentErrors(r2.document);
      expect(errors).toEqual([]);
    });

    it('normaliza orientação para horário', () => {
      const doc = createEmptyDocument();
      const nodeIds: NodeId[] = ['n1', 'n2', 'n3', 'n4'].map(
        (id) => id as NodeId,
      );

      // Ciclo anti-horário: (0,0) (0,2500) (3200,2500) (3200,0)
      const result = applyCommand(doc, {
        type: 'CreateRoom',
        payload: {
          nodes: [
            { id: nodeIds[0]!, x: 0, y: 0 },
            { id: nodeIds[1]!, x: 0, y: 2500 },
            { id: nodeIds[2]!, x: 3200, y: 2500 },
            { id: nodeIds[3]!, x: 3200, y: 0 },
          ],
          loop: nodeIds,
          name: 'Test',
        },
      });

      // Área deve ser positiva
      expect(
        computeRoomArea(result.document, result.document.rooms[0]!.id),
      ).toBe(8_000_000);

      // O loop deve estar em ordem horária (shoelace positivo)
      const loop = result.document.rooms[0]!.loop;
      const points = loop.map((id) => {
        const n = result.document.nodes.find((nd) => nd.id === id)!;
        return { x: n.x, y: n.y };
      });
      expect(points).toHaveLength(4);
      // Verifica que é horário (shoelace positivo)
      expect(shoelaceArea(points)).toBeGreaterThan(0);
    });
  });

  describe('DeleteRoom', () => {
    it('remove cômodo mas mantém nós órfãos (W5)', () => {
      const doc = createEmptyDocument();
      const nodeIds: NodeId[] = ['n1', 'n2', 'n3', 'n4'].map(
        (id) => id as NodeId,
      );

      const r1 = applyCommand(doc, {
        type: 'CreateRoom',
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
      });

      const roomId = r1.document.rooms[0]!.id;

      const r2 = applyCommand(r1.document, {
        type: 'DeleteRoom',
        payload: { roomId },
      });

      expect(r2.document.rooms).toHaveLength(0);
      // Nós continuam (serão removidos pelo GC ao salvar)
      expect(r2.document.nodes).toHaveLength(4);
    });
  });

  describe('RenameRoom', () => {
    it('renomeia cômodo', () => {
      const doc = createEmptyDocument();
      const nodeIds: NodeId[] = ['n1', 'n2', 'n3'].map((id) => id as NodeId);

      const r1 = applyCommand(doc, {
        type: 'CreateRoom',
        payload: {
          nodes: [
            { id: nodeIds[0]!, x: 0, y: 0 },
            { id: nodeIds[1]!, x: 100, y: 0 },
            { id: nodeIds[2]!, x: 100, y: 100 },
          ],
          loop: nodeIds,
          name: 'Cômodo 1',
        },
      });

      const roomId = r1.document.rooms[0]!.id;

      const r2 = applyCommand(r1.document, {
        type: 'RenameRoom',
        payload: { roomId, name: 'Quarto' },
      });

      expect(r2.document.rooms[0]!.name).toBe('Quarto');
    });
  });

  describe('CreateWall', () => {
    it('polilinha de três trechos produz três paredes e uma entrada de histórico', () => {
      const store = new DocumentStore();
      const nodeIds: NodeId[] = ['n1', 'n2', 'n3', 'n4'].map((id) => id as NodeId);

      store.dispatch({
        type: 'CreateWall',
        payload: {
          nodes: [
            { id: nodeIds[0]!, x: 0, y: 0 },
            { id: nodeIds[1]!, x: 1000, y: 0 },
            { id: nodeIds[2]!, x: 1000, y: 1000 },
            { id: nodeIds[3]!, x: 2000, y: 1000 },
          ],
          segments: [
            { a: nodeIds[0]!, b: nodeIds[1]! },
            { a: nodeIds[1]!, b: nodeIds[2]! },
            { a: nodeIds[2]!, b: nodeIds[3]! },
          ],
        },
      });

      expect(store.current.walls).toHaveLength(3);
      expect(store.current.nodes).toHaveLength(4);

      store.undo();

      expect(store.current.walls).toHaveLength(0);
      expect(store.current.nodes).toHaveLength(0);
    });

    it('reusa nó existente por coordenada idêntica (E6) — a bancada gruda na parede do cômodo', () => {
      const doc = createEmptyDocument();
      const roomNodes: NodeId[] = ['r1', 'r2', 'r3', 'r4'].map((id) => id as NodeId);
      const withRoom = applyCommand(doc, {
        type: 'CreateRoom',
        payload: {
          nodes: [
            { id: roomNodes[0]!, x: 0, y: 0 },
            { id: roomNodes[1]!, x: 3200, y: 0 },
            { id: roomNodes[2]!, x: 3200, y: 2500 },
            { id: roomNodes[3]!, x: 0, y: 2500 },
          ],
          loop: roomNodes,
          name: 'Quarto',
        },
      }).document;

      const result = applyCommand(withRoom, {
        type: 'CreateWall',
        payload: {
          nodes: [
            { id: 'w1' as NodeId, x: 0, y: 0 },
            { id: 'w2' as NodeId, x: -1000, y: 0 },
          ],
          segments: [{ a: 'w1' as NodeId, b: 'w2' as NodeId }],
        },
      });

      expect(result.document.nodes).toHaveLength(5);
      expect(result.document.walls).toHaveLength(1);
      expect(result.document.walls[0]!.a).toBe(roomNodes[0]);
    });

    it('segmento que reproduz parede já existente é omitido; o resto do comando é aplicado', () => {
      const doc = createEmptyDocument();
      const n1 = 'n1' as NodeId;
      const n2 = 'n2' as NodeId;
      const n3 = 'n3' as NodeId;

      const withWall = applyCommand(doc, {
        type: 'CreateWall',
        payload: {
          nodes: [
            { id: n1, x: 0, y: 0 },
            { id: n2, x: 1000, y: 0 },
          ],
          segments: [{ a: n1, b: n2 }],
        },
      }).document;

      expect(withWall.walls).toHaveLength(1);

      const result = applyCommand(withWall, {
        type: 'CreateWall',
        payload: {
          nodes: [{ id: n3, x: 2000, y: 0 }],
          // Primeiro segmento reproduz a parede n1-n2 já existente (mesmo par,
          // em qualquer ordem); o segundo é novo.
          segments: [
            { a: n2, b: n1 },
            { a: n2, b: n3 },
          ],
        },
      });

      expect(result.error).toBeUndefined();
      expect(result.document.walls).toHaveLength(2);
      expect(result.document.walls.filter((w) => w.a === n1 || w.b === n1)).toHaveLength(1);
    });

    it('rejeita com EMPTY_WALL quando todos os segmentos são duplicatas — não empilha entrada vazia', () => {
      const doc = createEmptyDocument();
      const n1 = 'n1' as NodeId;
      const n2 = 'n2' as NodeId;

      const withWall = applyCommand(doc, {
        type: 'CreateWall',
        payload: {
          nodes: [
            { id: n1, x: 0, y: 0 },
            { id: n2, x: 1000, y: 0 },
          ],
          segments: [{ a: n1, b: n2 }],
        },
      }).document;

      const result = applyCommand(withWall, {
        type: 'CreateWall',
        payload: { nodes: [], segments: [{ a: n2, b: n1 }] },
      });

      expect(result.error?.code).toBe('EMPTY_WALL');
      expect(result.document).toBe(withWall);
      expect(result.patchGroups).toEqual([]);
    });

    it('rejeita segments vazio sem tocar no documento', () => {
      const doc = createEmptyDocument();
      const result = applyCommand(doc, {
        type: 'CreateWall',
        payload: { nodes: [], segments: [] },
      });

      expect(result.error?.code).toBe('EMPTY_WALL');
      expect(result.document).toBe(doc);
    });

    it('rejeita segmento degenerado (a === b) sem tocar no documento', () => {
      const doc = createEmptyDocument();
      const n1 = 'n1' as NodeId;
      const result = applyCommand(doc, {
        type: 'CreateWall',
        payload: {
          nodes: [{ id: n1, x: 0, y: 0 }],
          segments: [{ a: n1, b: n1 }],
        },
      });

      expect(result.error?.code).toBe('DEGENERATE_WALL');
      expect(result.document).toBe(doc);
    });

    it('rejeita nó desconhecido sem tocar no documento', () => {
      const doc = createEmptyDocument();
      const n1 = 'n1' as NodeId;
      const result = applyCommand(doc, {
        type: 'CreateWall',
        payload: {
          nodes: [{ id: n1, x: 0, y: 0 }],
          segments: [{ a: n1, b: 'zzz' as NodeId }],
        },
      });

      expect(result.error?.code).toBe('NODE_NOT_FOUND');
      expect(result.document).toBe(doc);
    });
  });

  describe('DeleteWall', () => {
    it('remove a parede; undo devolve com o mesmo WallId', () => {
      const doc = createEmptyDocument();
      const n1 = 'n1' as NodeId;
      const n2 = 'n2' as NodeId;

      const withWall = applyCommand(doc, {
        type: 'CreateWall',
        payload: {
          nodes: [
            { id: n1, x: 0, y: 0 },
            { id: n2, x: 1000, y: 0 },
          ],
          segments: [{ a: n1, b: n2 }],
        },
      }).document;
      const wallId = withWall.walls[0]!.id;

      const store = new DocumentStore(withWall);
      store.dispatch({ type: 'DeleteWall', payload: { wallId } });

      expect(store.current.walls).toHaveLength(0);

      store.undo();

      expect(store.current.walls).toHaveLength(1);
      expect(store.current.walls[0]!.id).toBe(wallId);
    });

    it('rejeita id inexistente sem tocar no documento', () => {
      const doc = createEmptyDocument();
      const result = applyCommand(doc, {
        type: 'DeleteWall',
        payload: { wallId: 'zzz' as never },
      });

      expect(result.error?.code).toBe('WALL_NOT_FOUND');
      expect(result.document).toBe(doc);
    });
  });

  describe('DocumentStore', () => {
    it('undo e redo restauram documento', () => {
      const store = new DocumentStore();
      const nodeIds: NodeId[] = ['n1', 'n2', 'n3', 'n4'].map(
        (id) => id as NodeId,
      );

      store.dispatch({
        type: 'CreateRoom',
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
      });

      expect(store.current.rooms).toHaveLength(1);
      const roomId = store.current.rooms[0]!.id;

      // Undo
      store.undo();
      expect(store.current.rooms).toHaveLength(0);

      // Redo
      store.redo();
      expect(store.current.rooms).toHaveLength(1);
      expect(store.current.rooms[0]!.id).toBe(roomId);
    });

    it('invertibilidade: undo restaura documento ao estado original', () => {
      const store = new DocumentStore();
      const nodeIds: NodeId[] = ['n1', 'n2', 'n3', 'n4'].map(
        (id) => id as NodeId,
      );

      store.dispatch({
        type: 'CreateRoom',
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
      });

      expect(store.current.nodes).toHaveLength(4);
      expect(store.current.rooms).toHaveLength(1);

      store.undo();

      expect(store.current.nodes).toHaveLength(0);
      expect(store.current.rooms).toHaveLength(0);

      store.redo();

      expect(store.current.nodes).toHaveLength(4);
      expect(store.current.rooms).toHaveLength(1);
    });
  });

  describe('computeUsableArea', () => {
    it('soma apenas cômodos com includeInUsableArea=true', () => {
      const doc = createEmptyDocument();

      // Cria um cômodo com includeInUsableArea=true
      const nodeIds1: NodeId[] = ['n1', 'n2', 'n3', 'n4'].map(
        (id) => id as NodeId,
      );
      const r1 = applyCommand(doc, {
        type: 'CreateRoom',
        payload: {
          nodes: [
            { id: nodeIds1[0]!, x: 0, y: 0 },
            { id: nodeIds1[1]!, x: 3200, y: 0 },
            { id: nodeIds1[2]!, x: 3200, y: 2500 },
            { id: nodeIds1[3]!, x: 0, y: 2500 },
          ],
          loop: nodeIds1,
          name: 'Quarto',
          includeInUsableArea: true,
        },
      });

      // Cria outro cômodo com includeInUsableArea=false
      const nodeIds2: NodeId[] = ['n5', 'n6', 'n7', 'n8'].map(
        (id) => id as NodeId,
      );
      const r2 = applyCommand(r1.document, {
        type: 'CreateRoom',
        payload: {
          nodes: [
            { id: nodeIds2[0]!, x: 4000, y: 0 },
            { id: nodeIds2[1]!, x: 5000, y: 0 },
            { id: nodeIds2[2]!, x: 5000, y: 2000 },
            { id: nodeIds2[3]!, x: 4000, y: 2000 },
          ],
          loop: nodeIds2,
          name: 'Varanda',
          includeInUsableArea: false,
        },
      });

      // Área útil = só o quarto (8 m² = 8.000.000 mm²)
      expect(computeUsableArea(r2.document)).toBe(8_000_000);
    });
  });

  // ============================================================
  // Critério de encerramento 1: teste de integração
  // ============================================================
  it('sequência R, clique, 320 Enter, 250 Enter, 320 Enter, C', () => {
    // Simula o fluxo de desenho de um retângulo 3200x2500
    const store = new DocumentStore();

    // O fluxo é: clicar em (0,0), digitar 320 (→ 3200mm direita),
    // digitar 250 (→ 2500mm baixo), digitar 320 (→ 3200mm esquerda),
    // pressionar C para fechar.

    // Como a Ferramenta Cômodo ainda não existe, simulamos diretamente
    // com CreateRoom:
    const nodeIds: NodeId[] = ['n1', 'n2', 'n3', 'n4'].map(
      (id) => id as NodeId,
    );

    store.dispatch({
      type: 'CreateRoom',
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
    });

    const doc = store.current;
    expect(doc.nodes).toHaveLength(4);
    expect(doc.rooms).toHaveLength(1);

    const area = computeRoomArea(doc, doc.rooms[0]!.id);
    expect(area).toBe(8_000_000); // 8,00 m² em mm²

    const errors = validateDocumentErrors(doc);
    expect(errors).toEqual([]);
  });
});
describe('applyCreateRoom — rejeição de payload malformado', () => {
  const n = (id: string): NodeId => id as NodeId;
  const square = [
    { id: n('a'), x: 0, y: 0 },
    { id: n('b'), x: 3200, y: 0 },
    { id: n('c'), x: 3200, y: 2500 },
    { id: n('d'), x: 0, y: 2500 },
  ];

  it('rejeita loop com id repetido sem tocar no documento', () => {
    const doc = createEmptyDocument();
    const result = applyCommand(doc, {
      type: 'CreateRoom',
      payload: { nodes: square, loop: [n('a'), n('b'), n('b'), n('b')], name: '' },
    });

    expect(result.error?.code).toBe('DUPLICATE_LOOP_NODE');
    expect(result.document).toBe(doc);
    expect(result.patchGroups).toEqual([]);
  });

  it('rejeita nodes com id repetido', () => {
    const result = applyCommand(createEmptyDocument(), {
      type: 'CreateRoom',
      payload: {
        nodes: [
          { id: n('a'), x: 0, y: 0 },
          { id: n('a'), x: 3200, y: 0 },
          { id: n('c'), x: 3200, y: 2500 },
        ],
        loop: [n('a'), n('c'), n('a')],
        name: '',
      },
    });

    expect(result.error?.code).toBe('DUPLICATE_NODE_ID');
  });

  it('rejeita poligono degenerado (pontos colineares)', () => {
    const result = applyCommand(createEmptyDocument(), {
      type: 'CreateRoom',
      payload: {
        nodes: [
          { id: n('a'), x: 0, y: 0 },
          { id: n('b'), x: 1000, y: 0 },
          { id: n('c'), x: 2000, y: 0 },
        ],
        loop: [n('a'), n('b'), n('c')],
        name: '',
      },
    });

    expect(result.error?.code).toBe('DEGENERATE_POLYGON');
  });

  it('rejeita loop com menos de 3 nos', () => {
    const result = applyCommand(createEmptyDocument(), {
      type: 'CreateRoom',
      payload: { nodes: square.slice(0, 2), loop: [n('a'), n('b')], name: '' },
    });

    expect(result.error?.code).toBe('LOOP_TOO_SHORT');
  });

  it('rejeita loop que referencia no inexistente', () => {
    const result = applyCommand(createEmptyDocument(), {
      type: 'CreateRoom',
      payload: { nodes: square, loop: [n('a'), n('b'), n('zz')], name: '' },
    });

    expect(result.error?.code).toBe('UNKNOWN_LOOP_NODE');
    expect(result.error?.ids).toEqual(['zz']);
  });

  it('loop anti-horario e normalizado invertendo ids, preservando os 4 nos', () => {
    const result = applyCommand(createEmptyDocument(), {
      type: 'CreateRoom',
      payload: { nodes: square, loop: [n('d'), n('c'), n('b'), n('a')], name: '' },
    });

    expect(result.error).toBeUndefined();
    const room = result.document.rooms[0]!;
    expect(new Set(room.loop).size).toBe(4);
    expect(computeRoomArea(result.document, room.id)).toBe(8_000_000);
  });

  it('comando rejeitado nao consome entrada de historico', () => {
    const store = new DocumentStore();
    store.dispatch({
      type: 'CreateRoom',
      payload: { nodes: square, loop: [n('a'), n('b'), n('b'), n('b')], name: '' },
    });

    expect(store.canUndo).toBe(false);
    expect(store.current.rooms).toHaveLength(0);
    expect(store.lastError?.code).toBe('DUPLICATE_LOOP_NODE');
  });
});

describe('SetDocumentMeta', () => {
  it('SetDocumentMeta changes name', () => {
    const doc = createEmptyDocument();
    const result = applyCommand(doc, {
      type: 'SetDocumentMeta',
      payload: { name: 'New Plan' },
    });
    expect(result.document.meta.name).toBe('New Plan');
    expect(result.patchGroups).not.toEqual([]);
  });

  it('SetDocumentMeta changes displayUnit', () => {
    const doc = createEmptyDocument();
    const result = applyCommand(doc, {
      type: 'SetDocumentMeta',
      payload: { displayUnit: 'cm' },
    });
    expect(result.document.meta.displayUnit).toBe('cm');
    expect(result.patchGroups).not.toEqual([]);
  });

  it('SetDocumentMeta changes gridSize', () => {
    const doc = createEmptyDocument();
    const result = applyCommand(doc, {
      type: 'SetDocumentMeta',
      payload: { gridSize: 200 },
    });
    expect(result.document.meta.gridSize).toBe(200);
    expect(result.patchGroups).not.toEqual([]);
  });

  it('SetDocumentMeta with gridSize <= 0 is rejected', () => {
    const doc = createEmptyDocument();
    const result = applyCommand(doc, {
      type: 'SetDocumentMeta',
      payload: { gridSize: 0 },
    });
    expect(result.error?.code).toBe('INVALID_GRID_SIZE');
    expect(result.document).toBe(doc);
    expect(result.patchGroups).toEqual([]);
  });

  it('SetDocumentMeta with non-integer gridSize is rejected', () => {
    const doc = createEmptyDocument();
    const result = applyCommand(doc, {
      type: 'SetDocumentMeta',
      payload: { gridSize: 10.5 },
    });
    expect(result.error?.code).toBe('INVALID_GRID_SIZE');
    expect(result.document).toBe(doc);
    expect(result.patchGroups).toEqual([]);
  });

  it('SetDocumentMeta with no fields is a no-op (doesnt change document)', () => {
    const doc = createEmptyDocument();
    const result = applyCommand(doc, {
      type: 'SetDocumentMeta',
      payload: {},
    });
    expect(result.error).toBeUndefined();
    expect(result.document).toBe(doc);
    expect(result.patchGroups).toEqual([[]]);
  });

  it('SetDocumentMeta is invertible (undo restores original)', () => {
    const store = new DocumentStore();
    store.dispatch({
      type: 'SetDocumentMeta',
      payload: { name: 'My Plan', displayUnit: 'cm', gridSize: 200 },
    });
    expect(store.current.meta.name).toBe('My Plan');
    expect(store.current.meta.displayUnit).toBe('cm');
    expect(store.current.meta.gridSize).toBe(200);

    store.undo();
    const emptyDoc = createEmptyDocument();
    expect(store.current.meta.name).toBe(emptyDoc.meta.name);
    expect(store.current.meta.displayUnit).toBe(emptyDoc.meta.displayUnit);
    expect(store.current.meta.gridSize).toBe(emptyDoc.meta.gridSize);
  });
});
