// ============================================================
// Comandos de domínio — spec 08 § Comandos v1
// ============================================================

import { type Patch, produceWithPatches, enablePatches } from 'immer';
import type { PlanDocument, NodeId, RoomId, Node, Room } from '../model';
import { generateNodeId, generateRoomId, generateDefaultRoomName } from '../model';
import { orientLoop, polygonArea } from '../geometry';

// Habilita suporte a patches no Immer (precisa ser chamado uma vez)
enablePatches();

// ============================================================
// Tipos de comando
// ============================================================

export type Command =
  | CreateRoomCommand
  | DeleteRoomCommand
  | RenameRoomCommand;

export interface CreateRoomCommand {
  type: 'CreateRoom';
  transient?: boolean;
  payload: CreateRoomPayload;
}

export interface CreateRoomPayload {
  nodes: { id: NodeId; x: number; y: number }[];
  loop: NodeId[];
  name: string;
  includeInUsableArea?: boolean;
  color?: string | null;
  roomId?: RoomId;
}

export interface DeleteRoomCommand {
  type: 'DeleteRoom';
  transient?: boolean;
  payload: DeleteRoomPayload;
}

export interface DeleteRoomPayload {
  roomId: RoomId;
}

export interface RenameRoomCommand {
  type: 'RenameRoom';
  transient?: boolean;
  payload: RenameRoomPayload;
}

export interface RenameRoomPayload {
  roomId: RoomId;
  name: string;
}

// ============================================================
// Resultado
// ============================================================

export interface CommandResult {
  document: PlanDocument;
  patches: Patch[];
  inversePatches: Patch[];
  label: string;
}

// ============================================================
// applyCommand
// ============================================================

export function applyCommand(
  doc: PlanDocument,
  cmd: Command,
): CommandResult {
  switch (cmd.type) {
    case 'CreateRoom':
      return applyCreateRoom(doc, cmd.payload);
    case 'DeleteRoom':
      return applyDeleteRoom(doc, cmd.payload);
    case 'RenameRoom':
      return applyRenameRoom(doc, cmd.payload);
  }
}

// ============================================================
// CreateRoom
// ============================================================

function applyCreateRoom(
  doc: PlanDocument,
  payload: CreateRoomPayload,
): CommandResult {
  const [nextDoc, patches, inversePatches] = produceWithPatches(doc, (draft) => {
    // Merge de nós: se já existe nó com as mesmas coordenadas, reusa (E6)
    const nodeIdMap = new Map<string, NodeId>(); // requested id → actual id

    for (const n of payload.nodes) {
      // Procura nó existente com mesma coordenada
      const existing = draft.nodes.find(
        (existing) => existing.x === n.x && existing.y === n.y,
      );
      if (existing) {
        nodeIdMap.set(n.id, existing.id);
      } else {
        draft.nodes.push({
          id: n.id,
          x: n.x as Node['x'],
          y: n.y as Node['y'],
        });
        nodeIdMap.set(n.id, n.id);
      }
    }

    // Resolve loop com ids mapeados
    const resolvedLoop = payload.loop.map((id) => nodeIdMap.get(id) ?? id);

    // Normaliza orientação para horário
    const points = resolvedLoop.map((id) => {
      const node = draft.nodes.find((n) => n.id === id)!;
      return { x: node.x, y: node.y };
    });
    const orientedLoop = orientLoop(points);
    const finalLoop = orientedLoop.map((p) => {
      const node = draft.nodes.find((n) => n.x === p.x && n.y === p.y)!;
      return node.id;
    });

    const roomId = payload.roomId ?? generateRoomId();
    const defaultName = generateDefaultRoomName(
      draft.rooms.map((r) => r.name),
    );

    const room: Room = {
      id: roomId,
      name: payload.name || defaultName,
      loop: finalLoop as Room['loop'],
      color: (payload.color ?? null) as Room['color'],
      includeInUsableArea: payload.includeInUsableArea ?? true,
    };

    draft.rooms.push(room);
  });

  return {
    document: nextDoc,
    patches,
    inversePatches,
    label: `Criar ${payload.name || 'cômodo'}`,
  };
}

// ============================================================
// DeleteRoom
// ============================================================

function applyDeleteRoom(
  doc: PlanDocument,
  payload: DeleteRoomPayload,
): CommandResult {
  const room = doc.rooms.find((r) => r.id === payload.roomId);
  if (!room) {
    return { document: doc, patches: [], inversePatches: [], label: 'Excluir cômodo' };
  }

  const [nextDoc, patches, inversePatches] = produceWithPatches(doc, (draft) => {
    const idx = draft.rooms.findIndex((r) => r.id === payload.roomId);
    if (idx !== -1) {
      draft.rooms.splice(idx, 1);
    }
    // Nós órfãos são removidos pelo GC ao salvar — invariante W5
  });

  return {
    document: nextDoc,
    patches,
    inversePatches,
    label: `Excluir ${room.name}`,
  };
}

// ============================================================
// RenameRoom
// ============================================================

function applyRenameRoom(
  doc: PlanDocument,
  payload: RenameRoomPayload,
): CommandResult {
  const room = doc.rooms.find((r) => r.id === payload.roomId);
  if (!room) {
    return { document: doc, patches: [], inversePatches: [], label: 'Renomear cômodo' };
  }

  const [nextDoc, patches, inversePatches] = produceWithPatches(doc, (draft) => {
    const r = draft.rooms.find((r) => r.id === payload.roomId);
    if (r) {
      r.name = payload.name;
    }
  });

  return {
    document: nextDoc,
    patches,
    inversePatches,
    label: `Renomear ${room.name} → ${payload.name}`,
  };
}

// ============================================================
// Seletores de área (memoizados na camada app/)
// ============================================================

/**
 * Calcula a área de um cômodo em mm².
 * Resolve o loop a partir do documento e aplica shoelace.
 */
export function computeRoomArea(
  doc: PlanDocument,
  roomId: RoomId,
): number {
  const room = doc.rooms.find((r) => r.id === roomId);
  if (!room) return 0;

  const points: { x: number; y: number }[] = [];
  for (const nodeId of room.loop) {
    const node = doc.nodes.find((n) => n.id === nodeId);
    if (!node) return 0;
    points.push({ x: node.x, y: node.y });
  }

  return polygonArea(points);
}

/**
 * Soma das áreas dos cômodos com includeInUsableArea = true.
 */
export function computeUsableArea(doc: PlanDocument): number {
  let total = 0;
  for (const room of doc.rooms) {
    if (room.includeInUsableArea) {
      total += computeRoomArea(doc, room.id);
    }
  }
  return total;
}