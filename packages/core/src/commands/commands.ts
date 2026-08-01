// ============================================================
// Comandos de domínio — spec 08 § Comandos v1
// ============================================================

import { type Patch, produceWithPatches, enablePatches } from 'immer';
import type { PlanDocument, NodeId, RoomId, Node, Room } from '../model';
import { generateRoomId, generateDefaultRoomName } from '../model';
import { isClockwise, polygonArea } from '../geometry';

// Habilita suporte a patches no Immer (precisa ser chamado uma vez)
enablePatches();

// ============================================================
// Tipos de comando
// ============================================================

export type Command =
  | CreateRoomCommand
  | DeleteRoomCommand
  | RenameRoomCommand
  | MoveNodeCommand
  | BatchCommand;

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

export interface MoveNodeCommand {
  type: 'MoveNode';
  transient?: boolean;
  payload: MoveNodePayload;
}

export interface MoveNodePayload {
  nodeId: NodeId;
  x: number;
  y: number;
}

export interface BatchCommand {
  type: 'Batch';
  transient?: boolean;
  payload: BatchPayload;
}

export interface BatchPayload {
  label: string;
  commands: Command[];
}

// ============================================================
// Resultado
// ============================================================

export type CommandErrorCode =
  | 'LOOP_TOO_SHORT'
  | 'DUPLICATE_NODE_ID'
  | 'DUPLICATE_LOOP_NODE'
  | 'UNKNOWN_LOOP_NODE'
  | 'DEGENERATE_POLYGON'
  | 'ROOM_NOT_FOUND'
  | 'NODE_NOT_FOUND'
  | 'NODE_COLLISION'
  | 'NON_INTEGER_COORDINATE';

export interface CommandError {
  code: CommandErrorCode;
  ids: string[];
}

/**
 * Resultado de um comando, com os patches agrupados **por comando**.
 *
 * A unidade de inversão é o grupo, não o patch (spec 08 § Histórico). Os
 * inversos que o Immer devolve para um comando já vêm na ordem em que
 * precisam ser aplicados; reordená-los dentro do grupo corrompe qualquer
 * comando que tenha `add` ou `remove`. Um comando simples devolve um grupo;
 * um `Batch` devolve um por comando interno; um comando rejeitado, nenhum.
 */
export interface CommandResult {
  document: PlanDocument;
  patchGroups: Patch[][];
  inversePatchGroups: Patch[][];
  label: string;
  error?: CommandError;
}

function rejected(
  doc: PlanDocument,
  label: string,
  error: CommandError,
): CommandResult {
  return { document: doc, patchGroups: [], inversePatchGroups: [], label, error };
}

function applied(
  document: PlanDocument,
  patches: Patch[],
  inversePatches: Patch[],
  label: string,
): CommandResult {
  return {
    document,
    patchGroups: [patches],
    inversePatchGroups: [inversePatches],
    label,
  };
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
    case 'MoveNode':
      return applyMoveNode(doc, cmd.payload);
    case 'Batch':
      return applyBatch(doc, cmd.payload);
  }
}

// ============================================================
// Batch
// ============================================================

/**
 * Aplica os comandos em ordem e produz **um** item de histórico, com um grupo
 * de patches por comando interno (spec 08 § Comandos do M2).
 *
 * Rejeição de qualquer comando interno rejeita o lote inteiro: um lote
 * parcialmente aplicado é exatamente o "documento em estado parcial" que a
 * spec 08 § Tratamento de erro proíbe.
 */
function applyBatch(doc: PlanDocument, payload: BatchPayload): CommandResult {
  const patchGroups: Patch[][] = [];
  const inversePatchGroups: Patch[][] = [];
  let current = doc;

  for (const inner of payload.commands) {
    const result = applyCommand(current, inner);
    if (result.error) return rejected(doc, payload.label, result.error);

    current = result.document;
    patchGroups.push(...result.patchGroups);
    inversePatchGroups.push(...result.inversePatchGroups);
  }

  return { document: current, patchGroups, inversePatchGroups, label: payload.label };
}

// ============================================================
// MoveNode
// ============================================================

function applyMoveNode(
  doc: PlanDocument,
  payload: MoveNodePayload,
): CommandResult {
  const label = 'Mover nó';
  const rejection = validateMoveNode(doc, payload);
  if (rejection) return rejected(doc, label, rejection);

  const [nextDoc, patches, inversePatches] = produceWithPatches(doc, (draft) => {
    const node = draft.nodes.find((n) => n.id === payload.nodeId);
    if (!node) return;
    node.x = payload.x as Node['x'];
    node.y = payload.y as Node['y'];
  });

  return applied(nextDoc, patches, inversePatches, label);
}

/**
 * Um destino já ocupado é rejeitado, não fundido.
 *
 * Fundir aqui faria `MoveNode` mudar a contagem de nós do documento sem que
 * quem chamou pedisse isso — e a fusão tem comando próprio, com o inverso
 * correspondente. Reparo silencioso é o que transforma payload errado em
 * documento plausível (spec 08 § Tratamento de erro).
 */
function validateMoveNode(
  doc: PlanDocument,
  payload: MoveNodePayload,
): CommandError | null {
  if (!Number.isInteger(payload.x) || !Number.isInteger(payload.y)) {
    return { code: 'NON_INTEGER_COORDINATE', ids: [payload.nodeId] };
  }

  const node = doc.nodes.find((n) => n.id === payload.nodeId);
  if (!node) {
    return { code: 'NODE_NOT_FOUND', ids: [payload.nodeId] };
  }

  const occupant = doc.nodes.find(
    (n) => n.id !== payload.nodeId && n.x === payload.x && n.y === payload.y,
  );
  if (occupant) {
    return { code: 'NODE_COLLISION', ids: [payload.nodeId, occupant.id] };
  }

  return null;
}

// ============================================================
// CreateRoom
// ============================================================

function applyCreateRoom(
  doc: PlanDocument,
  payload: CreateRoomPayload,
): CommandResult {
  const label = `Criar ${payload.name || 'cômodo'}`;
  const rejection = validateCreateRoom(doc, payload);
  if (rejection) return rejected(doc, label, rejection);

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

    // Normaliza orientação para horário invertendo os ids, não os pontos:
    // reencontrar o id pela coordenada colapsaria nós coincidentes num só.
    const points = resolvedLoop.map((id) => {
      const node = draft.nodes.find((n) => n.id === id)!;
      return { x: node.x, y: node.y };
    });
    const finalLoop = isClockwise(points) ? resolvedLoop : [...resolvedLoop].reverse();

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

  return applied(nextDoc, patches, inversePatches, label);
}

/**
 * Rejeita payloads malformados antes de tocar no documento.
 *
 * Rejeitar em vez de reparar é deliberado (spec 08 § Tratamento de erro).
 * Um loop com ids repetidos é ambíguo — pode ser quatro vértices distintos
 * ou erro de quem chamou — e re-gerar ids inventaria nós coincidentes,
 * violando E6. Reparo silencioso é o que transforma payload errado em
 * documento plausível: foi assim que um cômodo virou uma linha reta.
 */
function validateCreateRoom(
  doc: PlanDocument,
  payload: CreateRoomPayload,
): CommandError | null {
  if (payload.loop.length < 3) {
    return { code: 'LOOP_TOO_SHORT', ids: [...payload.loop] };
  }

  const payloadIds = payload.nodes.map((n) => n.id);
  const duplicatePayloadIds = findDuplicates(payloadIds);
  if (duplicatePayloadIds.length > 0) {
    return { code: 'DUPLICATE_NODE_ID', ids: duplicatePayloadIds };
  }

  const duplicateLoopIds = findDuplicates(payload.loop);
  if (duplicateLoopIds.length > 0) {
    return { code: 'DUPLICATE_LOOP_NODE', ids: duplicateLoopIds };
  }

  const known = new Set<string>([...payloadIds, ...doc.nodes.map((n) => n.id)]);
  const unknown = payload.loop.filter((id) => !known.has(id));
  if (unknown.length > 0) {
    return { code: 'UNKNOWN_LOOP_NODE', ids: unknown };
  }

  const coordOf = new Map<string, { x: number; y: number }>();
  for (const node of doc.nodes) coordOf.set(node.id, { x: node.x, y: node.y });
  for (const node of payload.nodes) coordOf.set(node.id, { x: node.x, y: node.y });

  const points = payload.loop.map((id) => coordOf.get(id)!);
  if (polygonArea(points) === 0) {
    return { code: 'DEGENERATE_POLYGON', ids: [...payload.loop] };
  }

  return null;
}

function findDuplicates(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return [...duplicates];
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
    return rejected(doc, 'Excluir cômodo', {
      code: 'ROOM_NOT_FOUND',
      ids: [payload.roomId],
    });
  }

  const [nextDoc, patches, inversePatches] = produceWithPatches(doc, (draft) => {
    const idx = draft.rooms.findIndex((r) => r.id === payload.roomId);
    if (idx !== -1) {
      draft.rooms.splice(idx, 1);
    }
    // Nós órfãos são removidos pelo GC ao salvar — invariante W5
  });

  return applied(nextDoc, patches, inversePatches, `Excluir ${room.name}`);
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
    return rejected(doc, 'Renomear cômodo', {
      code: 'ROOM_NOT_FOUND',
      ids: [payload.roomId],
    });
  }

  const [nextDoc, patches, inversePatches] = produceWithPatches(doc, (draft) => {
    const r = draft.rooms.find((r) => r.id === payload.roomId);
    if (r) {
      r.name = payload.name;
    }
  });

  return applied(
    nextDoc,
    patches,
    inversePatches,
    `Renomear ${room.name} → ${payload.name}`,
  );
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