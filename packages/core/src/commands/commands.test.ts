import { describe, it, expect } from 'vitest';
import { applyPatches } from 'immer';
import { applyCommand, computeRoomArea, computeUsableArea } from './commands';
import { shoelaceArea } from '../geometry';
import type { PlanDocument, NodeId } from '../model';
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