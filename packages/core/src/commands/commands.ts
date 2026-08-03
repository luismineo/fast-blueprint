// ============================================================
// Comandos de domínio — spec 08 § Comandos v1
// ============================================================

import { type Patch, produceWithPatches, enablePatches } from 'immer';
import type {
  PlanDocument,
  NodeId,
  RoomId,
  WallId,
  Node,
  Room,
  EdgeRef,
  FurnitureId,
  FurnitureItem,
  HexColor,
  DocumentMeta,
} from '../model';
import {
  generateNodeId,
  generateRoomId,
  generateWallId,
  generateFurnitureId,
  generateDefaultRoomName,
  isDocumentColor,
} from '../model';
import {
  containment,
  isClockwise,
  obbCorners,
  polygonArea,
  type Point,
} from '../geometry';

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
  | MergeNodesCommand
  | SplitNodeCommand
  | SetEdgeLengthCommand
  | SetRoomColorCommand
  | SetRoomUsableCommand
  | AddFurnitureCommand
  | MoveFurnitureCommand
  | TransformFurnitureCommand
  | UpdateFurnitureCommand
  | DeleteFurnitureCommand
  | CreateWallCommand
  | DeleteWallCommand
  | BatchCommand
  | SetDocumentMetaCommand;

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

export interface MergeNodesCommand {
  type: 'MergeNodes';
  transient?: boolean;
  payload: MergeNodesPayload;
}

export interface MergeNodesPayload {
  keep: NodeId;
  remove: NodeId;
}

export interface SplitNodeCommand {
  type: 'SplitNode';
  transient?: boolean;
  payload: SplitNodePayload;
}

export interface SplitNodePayload {
  nodeId: NodeId;
  roomId: RoomId;
  to: { x: number; y: number };
  newNodeId?: NodeId;
}

export interface SetEdgeLengthCommand {
  type: 'SetEdgeLength';
  transient?: boolean;
  payload: SetEdgeLengthPayload;
}

export interface SetEdgeLengthPayload {
  edge: EdgeRef;
  length: number;
  mode: 'moveTogether' | 'detach';
  newNodeId?: NodeId;
}

export interface SetRoomColorCommand {
  type: 'SetRoomColor';
  transient?: boolean;
  payload: SetRoomColorPayload;
}

export interface SetRoomColorPayload {
  roomId: RoomId;
  color: HexColor | null;
}

export interface SetRoomUsableCommand {
  type: 'SetRoomUsable';
  transient?: boolean;
  payload: SetRoomUsablePayload;
}

export interface SetRoomUsablePayload {
  roomId: RoomId;
  includeInUsableArea: boolean;
}

export interface AddFurnitureCommand {
  type: 'AddFurniture';
  transient?: boolean;
  payload: AddFurniturePayload;
}

/**
 * Dimensões **resolvidas**, nunca um id de catálogo.
 *
 * `core` não conhece o pacote `catalog`, e a direção de dependência da spec 08
 * não admite que conheça. `catalogId` viaja junto só como rastreabilidade — é
 * o que faz "editar a dimensão do móvel não altera o catálogo" valer por
 * construção.
 */
export interface AddFurniturePayload {
  furnitureId?: FurnitureId;
  catalogId: string | null;
  name: string;
  width: number;
  depth: number;
  center: { x: number; y: number };
  rotation: number;
  clearance: number;
  color?: HexColor | null;
  locked?: boolean;
  outline?: boolean;
}

export interface MoveFurnitureCommand {
  type: 'MoveFurniture';
  transient?: boolean;
  payload: MoveFurniturePayload;
}

export interface MoveFurniturePayload {
  furnitureId: FurnitureId;
  center: { x: number; y: number };
}

export interface TransformFurnitureCommand {
  type: 'TransformFurniture';
  transient?: boolean;
  payload: TransformFurniturePayload;
}

/**
 * Rotação e redimensionamento numa operação só.
 *
 * Carrega `center` porque redimensionar por handle de canto mantém o canto
 * oposto fixo, o que move o centro; separar as duas faria o retângulo pular a
 * cada frame do arraste.
 */
export interface TransformFurniturePayload {
  furnitureId: FurnitureId;
  width: number;
  depth: number;
  rotation: number;
  center: { x: number; y: number };
}

export interface UpdateFurnitureCommand {
  type: 'UpdateFurniture';
  transient?: boolean;
  payload: UpdateFurniturePayload;
}

export interface UpdateFurniturePayload {
  furnitureId: FurnitureId;
  name?: string;
  color?: HexColor | null;
  clearance?: number;
  locked?: boolean;
}

export interface DeleteFurnitureCommand {
  type: 'DeleteFurniture';
  transient?: boolean;
  payload: DeleteFurniturePayload;
}

export interface DeleteFurniturePayload {
  furnitureId: FurnitureId;
}

export interface CreateWallCommand {
  type: 'CreateWall';
  transient?: boolean;
  payload: CreateWallPayload;
}

export interface CreateWallPayload {
  nodes: { id: NodeId; x: number; y: number }[];
  segments: { a: NodeId; b: NodeId; wallId?: WallId }[];
}

export interface DeleteWallCommand {
  type: 'DeleteWall';
  transient?: boolean;
  payload: DeleteWallPayload;
}

export interface DeleteWallPayload {
  wallId: WallId;
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

export interface SetDocumentMetaCommand {
  type: 'SetDocumentMeta';
  transient?: boolean;
  payload: SetDocumentMetaPayload;
}

export interface SetDocumentMetaPayload {
  name?: string;
  displayUnit?: 'm' | 'cm';
  gridSize?: number;
}

// ============================================================
// Resultado
// ============================================================

export type CommandErrorCode =
  | 'LOOP_TOO_SHORT'
  | 'DUPLICATE_NODE_ID'
  | 'DUPLICATE_LOOP_NODE'
  | 'COINCIDENT_LOOP_NODE'
  | 'UNKNOWN_LOOP_NODE'
  | 'DEGENERATE_POLYGON'
  | 'ROOM_NOT_FOUND'
  | 'NODE_NOT_FOUND'
  | 'NODE_COLLISION'
  | 'NON_INTEGER_COORDINATE'
  | 'SAME_NODE'
  | 'NODE_NOT_SHARED'
  | 'DEGENERATE_WALL'
  | 'EDGE_NOT_FOUND'
  | 'INVALID_LENGTH'
  | 'UNKNOWN_COLOR'
  | 'FURNITURE_NOT_FOUND'
  | 'FURNITURE_LOCKED'
  | 'INVALID_DIMENSION'
  | 'INVALID_ROTATION'
  | 'EMPTY_WALL'
  | 'WALL_NOT_FOUND'
  | 'INVALID_GRID_SIZE';

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
    case 'MergeNodes':
      return applyMergeNodes(doc, cmd.payload);
    case 'SplitNode':
      return applySplitNode(doc, cmd.payload);
    case 'SetEdgeLength':
      return applySetEdgeLength(doc, cmd.payload);
    case 'SetRoomColor':
      return applySetRoomColor(doc, cmd.payload);
    case 'SetRoomUsable':
      return applySetRoomUsable(doc, cmd.payload);
    case 'AddFurniture':
      return applyAddFurniture(doc, cmd.payload);
    case 'MoveFurniture':
      return applyMoveFurniture(doc, cmd.payload);
    case 'TransformFurniture':
      return applyTransformFurniture(doc, cmd.payload);
    case 'UpdateFurniture':
      return applyUpdateFurniture(doc, cmd.payload);
    case 'DeleteFurniture':
      return applyDeleteFurniture(doc, cmd.payload);
    case 'CreateWall':
      return applyCreateWall(doc, cmd.payload);
    case 'DeleteWall':
      return applyDeleteWall(doc, cmd.payload);
    case 'Batch':
      return applyBatch(doc, cmd.payload);
    case 'SetDocumentMeta':
      return applySetDocumentMeta(doc, cmd.payload);
  }
}

// ============================================================
// Mobília — spec 08 § Comandos do M3
// ============================================================

function applyAddFurniture(
  doc: PlanDocument,
  payload: AddFurniturePayload,
): CommandResult {
  const label = `Inserir ${payload.name}`;

  const rejection =
    checkDimensions(payload.width, payload.depth, payload.clearance) ??
    checkRotation(payload.rotation) ??
    checkCenter(payload.center) ??
    checkColor(payload.color ?? null);
  if (rejection) return rejected(doc, label, rejection);

  const item: FurnitureItem = {
    id: payload.furnitureId ?? generateFurnitureId(),
    catalogId: payload.catalogId,
    name: payload.name,
    width: payload.width as FurnitureItem['width'],
    depth: payload.depth as FurnitureItem['depth'],
    center: payload.center as FurnitureItem['center'],
    rotation: payload.rotation as FurnitureItem['rotation'],
    color: payload.color ?? null,
    locked: payload.locked ?? false,
    clearance: payload.clearance as FurnitureItem['clearance'],
  };

  if (payload.outline === true) item.outline = true;

  const [nextDoc, patches, inversePatches] = produceWithPatches(doc, (draft) => {
    // Fim do array: `furniture` é o único cuja ordem é significativa, e ela é
    // a ordem de desenho (spec 05 § Regras).
    draft.furniture.push(item);
  });

  return applied(nextDoc, patches, inversePatches, label);
}

function applyMoveFurniture(
  doc: PlanDocument,
  payload: MoveFurniturePayload,
): CommandResult {
  const label = 'Mover móvel';

  const item = doc.furniture.find((candidate) => candidate.id === payload.furnitureId);
  if (!item) {
    return rejected(doc, label, {
      code: 'FURNITURE_NOT_FOUND',
      ids: [payload.furnitureId],
    });
  }
  if (item.locked) {
    return rejected(doc, label, { code: 'FURNITURE_LOCKED', ids: [item.id] });
  }

  const rejection = checkCenter(payload.center);
  if (rejection) return rejected(doc, label, rejection);

  const [nextDoc, patches, inversePatches] = produceWithPatches(doc, (draft) => {
    const target = draft.furniture.find((candidate) => candidate.id === payload.furnitureId);
    if (target) target.center = payload.center as FurnitureItem['center'];
  });

  return applied(nextDoc, patches, inversePatches, label);
}

function applyTransformFurniture(
  doc: PlanDocument,
  payload: TransformFurniturePayload,
): CommandResult {
  const label = 'Transformar móvel';

  const item = doc.furniture.find((candidate) => candidate.id === payload.furnitureId);
  if (!item) {
    return rejected(doc, label, {
      code: 'FURNITURE_NOT_FOUND',
      ids: [payload.furnitureId],
    });
  }
  if (item.locked) {
    return rejected(doc, label, { code: 'FURNITURE_LOCKED', ids: [item.id] });
  }

  const rejection =
    checkDimensions(payload.width, payload.depth, 0) ??
    checkRotation(payload.rotation) ??
    checkCenter(payload.center);
  if (rejection) return rejected(doc, label, rejection);

  const [nextDoc, patches, inversePatches] = produceWithPatches(doc, (draft) => {
    const target = draft.furniture.find((candidate) => candidate.id === payload.furnitureId);
    if (!target) return;
    target.width = payload.width as FurnitureItem['width'];
    target.depth = payload.depth as FurnitureItem['depth'];
    target.rotation = payload.rotation as FurnitureItem['rotation'];
    target.center = payload.center as FurnitureItem['center'];
  });

  return applied(nextDoc, patches, inversePatches, label);
}

/**
 * Campos não geométricos.
 *
 * **Não** é bloqueado por `locked`: é por aqui que se destrava, e uma trava que
 * impedisse a própria remoção seria irreversível.
 */
function applyUpdateFurniture(
  doc: PlanDocument,
  payload: UpdateFurniturePayload,
): CommandResult {
  const label = 'Editar móvel';

  const item = doc.furniture.find((candidate) => candidate.id === payload.furnitureId);
  if (!item) {
    return rejected(doc, label, {
      code: 'FURNITURE_NOT_FOUND',
      ids: [payload.furnitureId],
    });
  }

  if (payload.clearance !== undefined) {
    if (!Number.isInteger(payload.clearance) || payload.clearance < 0) {
      return rejected(doc, label, { code: 'INVALID_DIMENSION', ids: [item.id] });
    }
  }

  const colorRejection =
    payload.color === undefined ? null : checkColor(payload.color, item.id);
  if (colorRejection) return rejected(doc, label, colorRejection);

  const [nextDoc, patches, inversePatches] = produceWithPatches(doc, (draft) => {
    const target = draft.furniture.find((candidate) => candidate.id === payload.furnitureId);
    if (!target) return;
    if (payload.name !== undefined) target.name = payload.name;
    if (payload.color !== undefined) target.color = payload.color;
    if (payload.clearance !== undefined) {
      target.clearance = payload.clearance as FurnitureItem['clearance'];
    }
    if (payload.locked !== undefined) target.locked = payload.locked;
  });

  return applied(nextDoc, patches, inversePatches, label);
}

/**
 * Excluir vale mesmo com o móvel travado.
 *
 * A trava existe contra arraste acidental; excluir é ação explícita e
 * desfazível, e exigir destravar antes só acrescentaria um passo
 * (`03-ferramentas-e-interacao.md` § Mobília).
 */
function applyDeleteFurniture(
  doc: PlanDocument,
  payload: DeleteFurniturePayload,
): CommandResult {
  const item = doc.furniture.find((candidate) => candidate.id === payload.furnitureId);
  if (!item) {
    return rejected(doc, 'Excluir móvel', {
      code: 'FURNITURE_NOT_FOUND',
      ids: [payload.furnitureId],
    });
  }

  const [nextDoc, patches, inversePatches] = produceWithPatches(doc, (draft) => {
    const index = draft.furniture.findIndex(
      (candidate) => candidate.id === payload.furnitureId,
    );
    if (index !== -1) draft.furniture.splice(index, 1);
  });

  return applied(nextDoc, patches, inversePatches, `Excluir ${item.name}`);
}

function checkDimensions(
  width: number,
  depth: number,
  clearance: number,
): CommandError | null {
  const positiveInteger = (value: number): boolean => Number.isInteger(value) && value > 0;
  if (!positiveInteger(width) || !positiveInteger(depth)) {
    return { code: 'INVALID_DIMENSION', ids: [] };
  }
  if (!Number.isInteger(clearance) || clearance < 0) {
    return { code: 'INVALID_DIMENSION', ids: [] };
  }
  return null;
}

function checkRotation(rotation: number): CommandError | null {
  if (!Number.isInteger(rotation) || rotation < 0 || rotation > 359) {
    return { code: 'INVALID_ROTATION', ids: [] };
  }
  return null;
}

function checkCenter(center: { x: number; y: number }): CommandError | null {
  if (!Number.isInteger(center.x) || !Number.isInteger(center.y)) {
    return { code: 'NON_INTEGER_COORDINATE', ids: [] };
  }
  return null;
}

function checkColor(color: HexColor | null, id = ''): CommandError | null {
  if (color !== null && !isDocumentColor(color)) {
    return { code: 'UNKNOWN_COLOR', ids: id === '' ? [] : [id] };
  }
  return null;
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
// Documento
// ============================================================

function applySetDocumentMeta(
  doc: PlanDocument,
  payload: SetDocumentMetaPayload,
): CommandResult {
  const label = 'Alterar propriedades do documento';

  if (
    payload.name === undefined &&
    payload.displayUnit === undefined &&
    payload.gridSize === undefined
  ) {
    return applied(doc, [], [], label);
  }

  if (payload.gridSize !== undefined) {
    if (!Number.isInteger(payload.gridSize) || payload.gridSize <= 0) {
      return rejected(doc, label, { code: 'INVALID_GRID_SIZE', ids: [] });
    }
  }

  const [nextDoc, patches, inversePatches] = produceWithPatches(doc, (draft) => {
    if (payload.name !== undefined) draft.meta.name = payload.name;
    if (payload.displayUnit !== undefined) draft.meta.displayUnit = payload.displayUnit;
    if (payload.gridSize !== undefined) draft.meta.gridSize = payload.gridSize as DocumentMeta['gridSize'];
  });

  return applied(nextDoc, patches, inversePatches, label);
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
// MergeNodes
// ============================================================

function applyMergeNodes(
  doc: PlanDocument,
  payload: MergeNodesPayload,
): CommandResult {
  const label = 'Fundir nós';
  const rejection = validateMergeNodes(doc, payload);
  if (rejection) return rejected(doc, label, rejection);

  const [nextDoc, patches, inversePatches] = produceWithPatches(doc, (draft) => {
    for (const room of draft.rooms) {
      room.loop = dropRepeats(repoint(room.loop, payload));
    }
    for (const wall of draft.walls) {
      if (wall.a === payload.remove) wall.a = payload.keep;
      if (wall.b === payload.remove) wall.b = payload.keep;
    }
    const index = draft.nodes.findIndex((node) => node.id === payload.remove);
    if (index !== -1) draft.nodes.splice(index, 1);
  });

  return applied(nextDoc, patches, inversePatches, label);
}

function repoint(loop: readonly NodeId[], payload: MergeNodesPayload): NodeId[] {
  return loop.map((id) => (id === payload.remove ? payload.keep : id));
}

/**
 * Um ciclo não repete nó (E4). Fundir dois vértices do mesmo cômodo produz a
 * repetição; a segunda ocorrência sai e o polígono perde um lado.
 */
function dropRepeats(loop: readonly NodeId[]): NodeId[] {
  const seen = new Set<NodeId>();
  const result: NodeId[] = [];
  for (const id of loop) {
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

function validateMergeNodes(
  doc: PlanDocument,
  payload: MergeNodesPayload,
): CommandError | null {
  if (payload.keep === payload.remove) {
    return { code: 'SAME_NODE', ids: [payload.keep] };
  }

  const missing = [payload.keep, payload.remove].filter(
    (id) => !doc.nodes.some((node) => node.id === id),
  );
  if (missing.length > 0) {
    return { code: 'NODE_NOT_FOUND', ids: missing };
  }

  for (const room of doc.rooms) {
    if (dropRepeats(repoint(room.loop, payload)).length < 3) {
      return { code: 'LOOP_TOO_SHORT', ids: [room.id] };
    }
  }

  for (const wall of doc.walls) {
    const a = wall.a === payload.remove ? payload.keep : wall.a;
    const b = wall.b === payload.remove ? payload.keep : wall.b;
    if (a === b) {
      return { code: 'DEGENERATE_WALL', ids: [wall.id] };
    }
  }

  return null;
}

// ============================================================
// SplitNode
// ============================================================

/**
 * Desconecta um nó de um cômodo, dando a ele uma cópia própria já na posição
 * final.
 *
 * O destino faz parte do payload porque desconectar e reposicionar são a mesma
 * operação: uma cópia sobre o original seriam dois nós com coordenadas
 * idênticas, e E6 é invariante de nível `error` (spec 01 § Invariantes). Quem
 * arrasta emite este comando no primeiro `pointermove` com deslocamento
 * diferente de zero, nunca no `pointerdown`.
 */
function applySplitNode(
  doc: PlanDocument,
  payload: SplitNodePayload,
): CommandResult {
  const label = 'Desconectar nó';
  const rejection = validateSplitNode(doc, payload);
  if (rejection) return rejected(doc, label, rejection);

  const copyId = payload.newNodeId ?? generateNodeId();

  const [nextDoc, patches, inversePatches] = produceWithPatches(doc, (draft) => {
    draft.nodes.push({
      id: copyId,
      x: payload.to.x as Node['x'],
      y: payload.to.y as Node['y'],
    });
    const room = draft.rooms.find((candidate) => candidate.id === payload.roomId);
    if (!room) return;
    room.loop = room.loop.map((id) => (id === payload.nodeId ? copyId : id));
  });

  return applied(nextDoc, patches, inversePatches, label);
}

function validateSplitNode(
  doc: PlanDocument,
  payload: SplitNodePayload,
): CommandError | null {
  if (!Number.isInteger(payload.to.x) || !Number.isInteger(payload.to.y)) {
    return { code: 'NON_INTEGER_COORDINATE', ids: [payload.nodeId] };
  }

  if (!doc.nodes.some((node) => node.id === payload.nodeId)) {
    return { code: 'NODE_NOT_FOUND', ids: [payload.nodeId] };
  }

  const room = doc.rooms.find((candidate) => candidate.id === payload.roomId);
  if (!room) {
    return { code: 'ROOM_NOT_FOUND', ids: [payload.roomId] };
  }

  if (!room.loop.includes(payload.nodeId)) {
    return { code: 'UNKNOWN_LOOP_NODE', ids: [payload.nodeId] };
  }

  if (!isShared(doc, payload.nodeId, payload.roomId)) {
    return { code: 'NODE_NOT_SHARED', ids: [payload.nodeId] };
  }

  const occupant = doc.nodes.find(
    (node) => node.x === payload.to.x && node.y === payload.to.y,
  );
  if (occupant) {
    return { code: 'NODE_COLLISION', ids: [payload.nodeId, occupant.id] };
  }

  return null;
}

/**
 * Desconectar um nó que ninguém mais referencia deixaria um órfão e teria o
 * mesmo efeito de `MoveNode`. Quem arrasta já precisa saber se o nó é
 * compartilhado — é o que decide se o diálogo de nó compartilhado aparece —
 * então rejeitar aqui não custa uma consulta extra a ninguém.
 */
function isShared(doc: PlanDocument, nodeId: NodeId, roomId: RoomId): boolean {
  for (const room of doc.rooms) {
    if (room.id !== roomId && room.loop.includes(nodeId)) return true;
  }
  for (const wall of doc.walls) {
    if (wall.a === nodeId || wall.b === nodeId) return true;
  }
  return false;
}

// ============================================================
// SetRoomColor e SetRoomUsable
// ============================================================

function applySetRoomColor(
  doc: PlanDocument,
  payload: SetRoomColorPayload,
): CommandResult {
  const label = 'Trocar cor';
  const room = doc.rooms.find((candidate) => candidate.id === payload.roomId);
  if (!room) {
    return rejected(doc, label, { code: 'ROOM_NOT_FOUND', ids: [payload.roomId] });
  }
  if (payload.color !== null && !isDocumentColor(payload.color)) {
    return rejected(doc, label, { code: 'UNKNOWN_COLOR', ids: [payload.roomId] });
  }

  const [nextDoc, patches, inversePatches] = produceWithPatches(doc, (draft) => {
    const target = draft.rooms.find((candidate) => candidate.id === payload.roomId);
    if (target) target.color = payload.color;
  });

  return applied(nextDoc, patches, inversePatches, label);
}

function applySetRoomUsable(
  doc: PlanDocument,
  payload: SetRoomUsablePayload,
): CommandResult {
  const label = 'Contar na área útil';
  const room = doc.rooms.find((candidate) => candidate.id === payload.roomId);
  if (!room) {
    return rejected(doc, label, { code: 'ROOM_NOT_FOUND', ids: [payload.roomId] });
  }

  const [nextDoc, patches, inversePatches] = produceWithPatches(doc, (draft) => {
    const target = draft.rooms.find((candidate) => candidate.id === payload.roomId);
    if (target) target.includeInUsableArea = payload.includeInUsableArea;
  });

  return applied(nextDoc, patches, inversePatches, label);
}

// ============================================================
// SetEdgeLength
// ============================================================

interface ResolvedEdge {
  startId: NodeId;
  endId: NodeId;
  roomId: RoomId | null;
}

/**
 * Move o nó final da aresta ao longo da direção dela até que ela tenha o
 * comprimento pedido.
 *
 * O nó final é o segundo na ordem do ciclo, que é normalizado para horário na
 * criação: isso torna a direção determinística e independente de onde o clique
 * caiu. `mode` só tem efeito quando esse nó é compartilhado — em `'detach'` o
 * cômodo editado ganha uma cópia própria, em `'moveTogether'` os dois se movem.
 * Aresta de parede avulsa não tem cômodo de onde desconectar, então ali `mode`
 * é ignorado.
 */
function applySetEdgeLength(
  doc: PlanDocument,
  payload: SetEdgeLengthPayload,
): CommandResult {
  const label = 'Editar comprimento';

  const edge = resolveEdgeRef(doc, payload.edge);
  if (!edge) return rejected(doc, label, { code: 'EDGE_NOT_FOUND', ids: [] });

  if (!(payload.length > 0)) {
    return rejected(doc, label, { code: 'INVALID_LENGTH', ids: [edge.endId] });
  }

  const start = doc.nodes.find((node) => node.id === edge.startId);
  const end = doc.nodes.find((node) => node.id === edge.endId);
  if (!start || !end) {
    return rejected(doc, label, { code: 'EDGE_NOT_FOUND', ids: [] });
  }

  const current = Math.hypot(end.x - start.x, end.y - start.y);
  if (current === 0) {
    return rejected(doc, label, { code: 'EDGE_NOT_FOUND', ids: [edge.endId] });
  }

  const to = {
    x: Math.round(start.x + ((end.x - start.x) / current) * payload.length),
    y: Math.round(start.y + ((end.y - start.y) / current) * payload.length),
  };

  const detaches =
    payload.mode === 'detach' &&
    edge.roomId !== null &&
    isShared(doc, edge.endId, edge.roomId);

  const inner: Command = detaches
    ? {
        type: 'SplitNode',
        payload: {
          nodeId: edge.endId,
          roomId: edge.roomId!,
          to,
          newNodeId: payload.newNodeId,
        },
      }
    : { type: 'MoveNode', payload: { nodeId: edge.endId, x: to.x, y: to.y } };

  const result = applyCommand(doc, inner);
  if (result.error) return rejected(doc, label, result.error);

  return { ...result, label };
}

function resolveEdgeRef(doc: PlanDocument, edge: EdgeRef): ResolvedEdge | null {
  if (edge.kind === 'wall') {
    const wall = doc.walls.find((candidate) => candidate.id === edge.wallId);
    if (!wall) return null;
    return { startId: wall.a, endId: wall.b, roomId: null };
  }

  const room = doc.rooms.find((candidate) => candidate.id === edge.roomId);
  if (!room) return null;
  if (!Number.isInteger(edge.index)) return null;
  if (edge.index < 0 || edge.index >= room.loop.length) return null;

  return {
    startId: room.loop[edge.index]!,
    endId: room.loop[(edge.index + 1) % room.loop.length]!,
    roomId: room.id,
  };
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

  // Ids distintos não bastam: o merge por coordenada resolve dois ids para o
  // mesmo nó, e o loop resultante repetiria um vértice (E4). Acontece quando o
  // traço volta exatamente sobre um nó já confirmado — a entrada numérica
  // alcança isso sem passar por nenhum snap.
  const coincident = findDuplicates(points.map((point) => `${point.x},${point.y}`));
  if (coincident.length > 0) {
    return { code: 'COINCIDENT_LOOP_NODE', ids: [...payload.loop] };
  }

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
// CreateWall e DeleteWall — spec 08 § Comandos do M3.5
// ============================================================

interface CreateWallPlan {
  readonly newNodes: { id: NodeId; x: number; y: number }[];
  readonly newWalls: { id: WallId; a: NodeId; b: NodeId }[];
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/**
 * Resolve nós e paredes que `CreateWall` de fato criaria, sem mutar nada.
 *
 * Reusada por `validateCreateWall` (para saber se sobra algo depois de
 * omitir segmento duplicado) e por `applyCreateWall` (para aplicar
 * exatamente o que foi validado, sem recalcular dentro do produce e arriscar
 * as duas contas divergirem).
 */
function planCreateWall(doc: PlanDocument, payload: CreateWallPayload): CreateWallPlan {
  const nodeIdMap = new Map<string, NodeId>();
  const newNodes: { id: NodeId; x: number; y: number }[] = [];
  const position = new Map<NodeId, { x: number; y: number }>();
  for (const node of doc.nodes) position.set(node.id, { x: node.x, y: node.y });

  for (const n of payload.nodes) {
    let existingId: NodeId | null = null;
    for (const [id, pos] of position) {
      if (pos.x === n.x && pos.y === n.y) {
        existingId = id;
        break;
      }
    }
    if (existingId) {
      nodeIdMap.set(n.id, existingId);
    } else {
      nodeIdMap.set(n.id, n.id);
      position.set(n.id, { x: n.x, y: n.y });
      newNodes.push({ id: n.id, x: n.x, y: n.y });
    }
  }

  const existingPairs = new Set<string>();
  for (const wall of doc.walls) existingPairs.add(pairKey(wall.a, wall.b));

  const newWalls: { id: WallId; a: NodeId; b: NodeId }[] = [];
  for (const seg of payload.segments) {
    const a = nodeIdMap.get(seg.a) ?? seg.a;
    const b = nodeIdMap.get(seg.b) ?? seg.b;

    if (a === b) continue;
    if (!position.has(a) || !position.has(b)) continue;
    if (existingPairs.has(pairKey(a, b))) continue;

    newWalls.push({ id: seg.wallId ?? generateWallId(), a, b });
    existingPairs.add(pairKey(a, b));
  }

  return { newNodes, newWalls };
}

function applyCreateWall(
  doc: PlanDocument,
  payload: CreateWallPayload,
): CommandResult {
  const label = 'Desenhar parede';
  const rejection = validateCreateWall(doc, payload);
  if (rejection) return rejected(doc, label, rejection);

  const plan = planCreateWall(doc, payload);

  // Um segmento que reproduz parede já existente é omitido, e o resto do
  // comando é aplicado (08-arquitetura.md § Comandos do M3.5). Se a omissão
  // não deixa nenhuma parede nova, "aplicar o resto" seria empilhar uma
  // entrada de histórico vazia — rejeita como se `segments` tivesse chegado
  // vazio.
  if (plan.newWalls.length === 0) {
    return rejected(doc, label, { code: 'EMPTY_WALL', ids: [] });
  }

  const [nextDoc, patches, inversePatches] = produceWithPatches(doc, (draft) => {
    for (const n of plan.newNodes) {
      draft.nodes.push({ id: n.id, x: n.x as Node['x'], y: n.y as Node['y'] });
    }
    for (const wall of plan.newWalls) {
      draft.walls.push({ id: wall.id, a: wall.a, b: wall.b });
    }
  });

  return applied(nextDoc, patches, inversePatches, label);
}

function validateCreateWall(
  doc: PlanDocument,
  payload: CreateWallPayload,
): CommandError | null {
  if (payload.segments.length === 0) {
    return { code: 'EMPTY_WALL', ids: [] };
  }

  const payloadIds = payload.nodes.map((n) => n.id);
  for (const n of payload.nodes) {
    if (!Number.isInteger(n.x) || !Number.isInteger(n.y)) {
      return { code: 'NON_INTEGER_COORDINATE', ids: [n.id] };
    }
  }

  const known = new Set<string>([...payloadIds, ...doc.nodes.map((n) => n.id)]);
  for (const seg of payload.segments) {
    if (!known.has(seg.a)) return { code: 'NODE_NOT_FOUND', ids: [seg.a] };
    if (!known.has(seg.b)) return { code: 'NODE_NOT_FOUND', ids: [seg.b] };
    if (seg.a === seg.b) return { code: 'DEGENERATE_WALL', ids: [seg.a] };
  }

  return null;
}

function applyDeleteWall(
  doc: PlanDocument,
  payload: DeleteWallPayload,
): CommandResult {
  const wall = doc.walls.find((candidate) => candidate.id === payload.wallId);
  if (!wall) {
    return rejected(doc, 'Excluir parede', {
      code: 'WALL_NOT_FOUND',
      ids: [payload.wallId],
    });
  }

  const [nextDoc, patches, inversePatches] = produceWithPatches(doc, (draft) => {
    const idx = draft.walls.findIndex((candidate) => candidate.id === payload.wallId);
    if (idx !== -1) draft.walls.splice(idx, 1);
  });

  return applied(nextDoc, patches, inversePatches, 'Excluir parede');
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

/** Móveis contidos num cômodo, excluídos os gabaritos de circulação. */
export function furnitureInRoom(doc: PlanDocument, roomId: RoomId): FurnitureItem[] {
  const points = roomPolygon(doc, roomId);
  if (!points) return [];

  return doc.furniture.filter((item) => {
    if (item.outline === true) return false;
    const corners = obbCorners(item.center, item.width, item.depth, item.rotation);
    return containment(corners, points) === 'inside';
  });
}

/**
 * Área ocupada por mobília num cômodo, em mm²
 * (`01-modelo-de-dominio.md` § Grandezas derivadas).
 *
 * Soma `width × depth` dos móveis **contidos**. Um móvel parcialmente fora já
 * tem aviso próprio (W3), e somar a área inteira dele faria a taxa passar de
 * 100% sem o cômodo estar cheio.
 */
export function computeFurnitureArea(doc: PlanDocument, roomId: RoomId): number {
  let total = 0;
  for (const item of furnitureInRoom(doc, roomId)) {
    total += item.width * item.depth;
  }
  return total;
}

/** Área ocupada dividida pela área do cômodo. Zero quando o cômodo não resolve. */
export function computeOccupancy(doc: PlanDocument, roomId: RoomId): number {
  const area = computeRoomArea(doc, roomId);
  if (area === 0) return 0;
  return computeFurnitureArea(doc, roomId) / area;
}

function roomPolygon(doc: PlanDocument, roomId: RoomId): Point[] | null {
  const room = doc.rooms.find((candidate) => candidate.id === roomId);
  if (!room) return null;

  const points: Point[] = [];
  for (const nodeId of room.loop) {
    const node = doc.nodes.find((candidate) => candidate.id === nodeId);
    if (!node) return null;
    points.push({ x: node.x, y: node.y });
  }
  return points;
}