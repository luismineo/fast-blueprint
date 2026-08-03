import { z } from 'zod/v4'

/**
 * Schema do catálogo de mobília (`specs/06-catalogo-de-mobilia.md` § Estrutura).
 *
 * Mesmo mecanismo Zod do documento, e pelo mesmo motivo: o catálogo é dado que
 * chega de arquivo — o default do bundle, ou o do usuário vindo do IndexedDB e
 * de import de JSON — e dado que chega de fora é validado antes de entrar.
 */

/** Determinam agrupamento no painel e nada mais (spec 06 § Categorias). */
export const CATALOG_CATEGORIES = [
  'quarto',
  'sala',
  'cozinha',
  'banheiro',
  'servico',
  'escritorio',
  'circulacao',
] as const

export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number]

export const catalogItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(CATALOG_CATEGORIES),
  /** mm, eixo local X — dimensão paralela à parede em que o móvel encosta. */
  width: z.number().int().positive(),
  /** mm, eixo local Y — cresce da parede para dentro do cômodo. */
  depth: z.number().int().positive(),
  /** mm. Não usado no render 2D; existe para futuro e para referência. */
  height: z.number().int().positive().optional(),
  /** mm de circulação sugerida. Ausente é 0. */
  clearance: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
  /** Id do glifo em glyphs.json. Ausente = sem glifo (retângulo). */
  glyph: z.string().min(1).optional(),
  /** Presente só em item criado pelo usuário (spec 06 § Catálogo do usuário). */
  source: z.literal('user').optional(),
})

export type CatalogItem = z.infer<typeof catalogItemSchema>

export const catalogFileSchema = z.object({
  version: z.number().int().positive(),
  items: z.array(catalogItemSchema),
})

export type CatalogFile = z.infer<typeof catalogFileSchema>

/** Circulação sugerida do item, com o default da spec 06 aplicado. */
export function clearanceOf(item: CatalogItem): number {
  return item.clearance ?? 0
}

/**
 * Item sem massa física: os gabaritos de `circulacao`.
 *
 * É daqui que sai `FurnitureItem.outline` na inserção — a categoria não
 * sobrevive ao documento, e o renderer não conhece este pacote
 * (`01-modelo-de-dominio.md` § FurnitureItem).
 */
export function isOutlineItem(item: CatalogItem): boolean {
  return item.category === 'circulacao'
}
