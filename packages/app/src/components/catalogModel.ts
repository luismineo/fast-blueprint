import {
  CATALOG_CATEGORIES,
  clearanceOf,
  isOutlineItem,
  searchCatalog,
  type CatalogCategory,
  type CatalogItem,
} from '@planta/catalog'
import { formatDimensions, type FurnitureGlyph } from '@planta/core'
import type { FurnitureDraft } from '../tools/furnitureTool'

/**
 * Modelo do painel de catálogo (`06-catalogo-de-mobilia.md` § Painel).
 *
 * Toda derivação vive aqui: busca, agrupamento, recentes e a caixa da
 * miniatura. O componente lê strings e números prontos — `08-arquitetura.md`
 * proíbe cálculo em `.svelte`.
 */

const MAX_RECENT = 8
const THUMBNAIL_MAX_PX = 28
const THUMBNAIL_MIN_PX = 3

export interface CatalogEntry {
  readonly id: string
  readonly name: string
  /** `158 × 198`, sem unidade: o cartão mostra o `cm` uma vez só. */
  readonly dimensions: string
  readonly thumbnail: { readonly width: number; readonly height: number }
  readonly draft: FurnitureDraft
  readonly glyph?: FurnitureGlyph
}

export interface CatalogGroup {
  readonly category: CatalogCategory
  readonly items: readonly CatalogEntry[]
}

export interface CatalogPanelModel {
  readonly recent: readonly CatalogEntry[]
  readonly groups: readonly CatalogGroup[]
  readonly searching: boolean
  readonly empty: boolean
}

export function describeCatalog(
  items: readonly CatalogItem[],
  query: string,
  recentIds: readonly string[],
  glyphs: ReadonlyMap<string, FurnitureGlyph>,
): CatalogPanelModel {
  const matches = searchCatalog(items, query)
  const searching = query.trim() !== ''

  const groups: CatalogGroup[] = []
  for (const category of CATALOG_CATEGORIES) {
    const inCategory = matches.filter((item) => item.category === category)
    if (inCategory.length > 0) {
      groups.push({ category, items: inCategory.map((i) => toEntry(i, glyphs)) })
    }
  }

  return {
    recent: searching ? [] : recentEntries(items, recentIds, glyphs),
    groups,
    searching,
    empty: matches.length === 0,
  }
}

/** Ids usados, mais recente primeiro, sem repetição e limitado a 8. */
export function pushRecent(recentIds: readonly string[], id: string): string[] {
  return [id, ...recentIds.filter((candidate) => candidate !== id)].slice(0, MAX_RECENT)
}

export function toDraft(item: CatalogItem): FurnitureDraft {
  return {
    catalogId: item.id,
    name: item.name,
    width: item.width,
    depth: item.depth,
    clearance: clearanceOf(item),
    outline: isOutlineItem(item),
  }
}

function recentEntries(
  items: readonly CatalogItem[],
  recentIds: readonly string[],
  glyphs: ReadonlyMap<string, FurnitureGlyph>,
): CatalogEntry[] {
  const entries: CatalogEntry[] = []
  for (const id of recentIds) {
    const item = items.find((candidate) => candidate.id === id)
    if (item) entries.push(toEntry(item, glyphs))
  }
  return entries
}

function toEntry(item: CatalogItem, glyphs: ReadonlyMap<string, FurnitureGlyph>): CatalogEntry {
  const glyph = glyphs.get(item.id)
  return {
    id: item.id,
    name: item.name,
    dimensions: formatDimensions(item.width, item.depth),
    thumbnail: thumbnailBox(item.width, item.depth),
    draft: toDraft(item),
    glyph,
  }
}

/**
 * Caixa da miniatura em pixels, com a proporção do móvel.
 *
 * Gerada, não desenhada: mantém o catálogo puramente em dados e evita 55
 * arquivos SVG para manter em sincronia com as medidas
 * (`06-catalogo-de-mobilia.md` § Painel).
 */
function thumbnailBox(width: number, depth: number): { width: number; height: number } {
  const scale = THUMBNAIL_MAX_PX / Math.max(width, depth)
  return {
    width: Math.max(THUMBNAIL_MIN_PX, Math.round(width * scale)),
    height: Math.max(THUMBNAIL_MIN_PX, Math.round(depth * scale)),
  }
}
