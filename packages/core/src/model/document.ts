// ============================================================
// Fábrica de documento e helpers — spec 01 § Visão geral
// ============================================================

import type { PlanDocument, DocumentMeta, FurnitureId, NodeId, RoomId, WallId } from './types';
import { validateDocument } from './validation';

/**
 * Versão de schema que este build escreve.
 * Sobe apenas em mudança incompatível de documento (spec 05 § Migrações).
 * A tabela de compatibilidade schemaVersion → versão do app vive em
 * `specs/05-formato-de-arquivo.md` § Compatibilidade.
 */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Cria um documento vazio válido.
 * Grid default: 100 mm. Unidade default: metros.
 */
export function createEmptyDocument(): PlanDocument {
  const now = new Date().toISOString();
  const meta: DocumentMeta = {
    name: 'Sem título',
    createdAt: now,
    modifiedAt: now,
    displayUnit: 'm',
    gridSize: 100 as DocumentMeta['gridSize'],
  };

  const doc: PlanDocument = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    meta,
    nodes: [],
    rooms: [],
    walls: [],
    openings: [],
    furniture: [],
    underlay: null,
  };

  return doc;
}

/**
 * Gera um novo NodeId único.
 * Usa crypto.randomUUID() disponível em Node 19+ e browsers modernos.
 */
export function generateNodeId(): NodeId {
  return `n_${crypto.randomUUID()}` as NodeId;
}

/**
 * Gera um novo RoomId único.
 */
export function generateRoomId(): RoomId {
  return `r_${crypto.randomUUID()}` as RoomId;
}

/**
 * Gera um novo FurnitureId único.
 */
export function generateFurnitureId(): FurnitureId {
  return `f_${crypto.randomUUID()}` as FurnitureId;
}

export function generateWallId(): WallId {
  return `w_${crypto.randomUUID()}` as WallId;
}

/**
 * Gera o nome default para um novo cômodo.
 * "Cômodo N", onde N é o menor inteiro positivo tal que
 * "Cômodo N" não está em uso no documento atual.
 */
export function generateDefaultRoomName(existingNames: string[]): string {
  const used = new Set(existingNames);
  let n = 1;
  while (used.has(`Cômodo ${n}`)) {
    n++;
  }
  return `Cômodo ${n}`;
}

/**
 * Verifica se um documento é válido (zero issues de nível error).
 */
export function isValidDocument(doc: PlanDocument): boolean {
  return validateDocument(doc).every((i) => i.level !== 'error');
}