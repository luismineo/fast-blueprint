import { z } from 'zod/v4';
import type { FurnitureGlyph } from '@planta/core';
import glyphData from '../data/glyphs.json';

const glyphPrimitiveSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('line'),
    x1: z.number().min(0).max(1),
    y1: z.number().min(0).max(1),
    x2: z.number().min(0).max(1),
    y2: z.number().min(0).max(1),
  }),
  z.object({
    kind: z.literal('rect'),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  }),
  z.object({
    kind: z.literal('circle'),
    cx: z.number().min(0).max(1),
    cy: z.number().min(0).max(1),
    r: z.number().min(0).max(1),
  }),
  z.object({
    kind: z.literal('arc'),
    cx: z.number().min(0).max(1),
    cy: z.number().min(0).max(1),
    r: z.number().min(0).max(1),
    startAngle: z.number(),
    endAngle: z.number(),
    closed: z.boolean(),
  }),
]);

const furnitureGlyphSchema = z.object({
  id: z.string().min(1),
  primitives: z.array(glyphPrimitiveSchema).min(1).max(48),
});

const glyphFileSchema = z.object({
  version: z.number().int().positive(),
  glyphs: z.array(furnitureGlyphSchema),
});

let cached: readonly FurnitureGlyph[] | null = null;

export function loadGlyphs(): readonly FurnitureGlyph[] {
  if (cached) return cached;
  cached = glyphFileSchema.parse(glyphData).glyphs;
  return cached;
}