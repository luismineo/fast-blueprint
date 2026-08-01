// ============================================================
// Tipos de domínio — spec 01-modelo-de-dominio.md
// ============================================================

/**
 * Marca para milímetros — inteiro, sem ponto flutuante.
 * Toda coordenada e comprimento interno é Millimeters.
 */
export type Millimeters = number & { readonly __brand: 'mm' };

/**
 * Marca para graus (0–359).
 */
export type Degrees = number & { readonly __brand: 'deg' };

/** ID de nó (vértice compartilhado). */
export type NodeId = string & { readonly __brand: 'NodeId' };

/** ID de cômodo. */
export type RoomId = string & { readonly __brand: 'RoomId' };

/** ID de parede avulsa. */
export type WallId = string & { readonly __brand: 'WallId' };

/** ID de abertura. */
export type OpeningId = string & { readonly __brand: 'OpeningId' };

/** ID de móvel. */
export type FurnitureId = string & { readonly __brand: 'FurnitureId' };

/** Cor hexadecimal (ex: "#FF0000"). */
export type HexColor = string & { readonly __brand: 'HexColor' };

// ============================================================
// Entidades — spec 01 § Entidades
// ============================================================

export interface Node {
  id: NodeId;
  x: Millimeters;
  y: Millimeters;
}

export interface Room {
  id: RoomId;
  name: string;
  loop: NodeId[];
  color: HexColor | null;
  includeInUsableArea: boolean;
}

export interface Wall {
  id: WallId;
  a: NodeId;
  b: NodeId;
}

export type EdgeRef =
  | { kind: 'room'; roomId: RoomId; index: number }
  | { kind: 'wall'; wallId: WallId };

export interface Opening {
  id: OpeningId;
  edge: EdgeRef;
  kind: 'door' | 'sliding-door' | 'window' | 'passage';
  offset: Millimeters;
  width: Millimeters;
  swing: 'left' | 'right' | 'none';
}

export interface FurnitureItem {
  id: FurnitureId;
  catalogId: string | null;
  name: string;
  width: Millimeters;
  depth: Millimeters;
  center: { x: Millimeters; y: Millimeters };
  rotation: Degrees;
  color: HexColor | null;
  locked: boolean;
  clearance: Millimeters;
}

export interface Underlay {
  imageRef: string;
  origin: { x: Millimeters; y: Millimeters };
  scale: number;
  rotation: Degrees;
  opacity: number;
  locked: boolean;
}

export interface DocumentMeta {
  schemaVersion: number;
  name: string;
  createdAt: string;
  modifiedAt: string;
  displayUnit: 'm' | 'cm';
  gridSize: Millimeters;
}

// ============================================================
// Documento — spec 01 § Visão geral
// ============================================================

export interface PlanDocument {
  nodes: Node[];
  rooms: Room[];
  walls: Wall[];
  openings: Opening[];
  furniture: FurnitureItem[];
  underlay: Underlay | null;
  meta: DocumentMeta;
}