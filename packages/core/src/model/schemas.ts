import { z } from 'zod/v4';
import type { NodeId, RoomId, WallId, OpeningId, FurnitureId, HexColor } from './types';

// ============================================================
// Schemas Zod para cada entidade — spec 01 § Entidades
// ============================================================

// Branded types são strings em runtime; o Zod valida a forma,
// o branding é preocupação de tipo em tempo de compilação.
// Usamos z.string() puro e fazemos o cast via unknown para
// satisfazer o type-system do zod v4.
const nodeIdSchema = z.string() as unknown as z.ZodSchema<NodeId>;
const roomIdSchema = z.string() as unknown as z.ZodSchema<RoomId>;
const wallIdSchema = z.string() as unknown as z.ZodSchema<WallId>;
const openingIdSchema = z.string() as unknown as z.ZodSchema<OpeningId>;
const furnitureIdSchema = z.string() as unknown as z.ZodSchema<FurnitureId>;

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, { message: 'HexColor deve ter formato #RRGGBB' }) as unknown as z.ZodSchema<HexColor>;

export const nodeSchema = z.object({
  id: nodeIdSchema,
  x: z.number().int(),
  y: z.number().int(),
});

export const roomSchema = z.object({
  id: roomIdSchema,
  name: z.string(),
  loop: z.array(nodeIdSchema),
  color: hexColorSchema.nullable(),
  includeInUsableArea: z.boolean(),
});

export const wallSchema = z.object({
  id: wallIdSchema,
  a: nodeIdSchema,
  b: nodeIdSchema,
});

export const edgeRefSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('room'), roomId: roomIdSchema, index: z.number().int().min(0) }),
  z.object({ kind: z.literal('wall'), wallId: wallIdSchema }),
]);

export const openingSchema = z.object({
  id: openingIdSchema,
  edge: edgeRefSchema,
  kind: z.enum(['door', 'sliding-door', 'window', 'passage']),
  offset: z.number().int().min(0),
  width: z.number().int().min(0),
  swing: z.enum(['left', 'right', 'none']),
});

export const furnitureItemSchema = z.object({
  id: furnitureIdSchema,
  catalogId: z.string().nullable(),
  name: z.string(),
  width: z.number().int(),
  depth: z.number().int(),
  center: z.object({ x: z.number().int(), y: z.number().int() }),
  rotation: z.number().int().min(0).max(359),
  color: hexColorSchema.nullable(),
  locked: z.boolean(),
  clearance: z.number().int().min(0),
  // Opcional, e ausente significa false: acrescentá-lo não subiu
  // schemaVersion (`05-formato-de-arquivo.md` § Migrações).
  outline: z.boolean().optional(),
});

export const underlaySchema = z.object({
  imageRef: z.string(),
  origin: z.object({ x: z.number().int(), y: z.number().int() }),
  scale: z.number().positive(),
  rotation: z.number().int().min(0).max(359),
  opacity: z.number().min(0).max(1),
  locked: z.boolean(),
});

export const documentMetaSchema = z.object({
  name: z.string(),
  createdAt: z.string(),
  modifiedAt: z.string(),
  displayUnit: z.enum(['m', 'cm']),
  gridSize: z.number().int().min(1),
});

export const planDocumentSchema = z.object({
  schemaVersion: z.number().int().positive(),
  meta: documentMetaSchema,
  nodes: z.array(nodeSchema),
  rooms: z.array(roomSchema),
  walls: z.array(wallSchema),
  openings: z.array(openingSchema),
  furniture: z.array(furnitureItemSchema),
  underlay: underlaySchema.nullable(),
});