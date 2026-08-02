import defaultData from '../data/default.json'
import { catalogFileSchema, type CatalogItem } from './schema'

/**
 * Catálogo default, validado contra o schema na carga
 * (`specs/06-catalogo-de-mobilia.md` § Critérios de aceitação).
 *
 * A validação acontece uma vez, na primeira chamada. Um arquivo default
 * malformado é erro de build, não estado que o app deva contornar em runtime:
 * ele viaja no bundle e não muda entre execuções.
 */
let cached: readonly CatalogItem[] | null = null

export function loadDefaultCatalog(): readonly CatalogItem[] {
  if (cached) return cached
  cached = catalogFileSchema.parse(defaultData).items
  return cached
}

/**
 * Catálogo efetivo: default mais itens do usuário.
 *
 * Item de usuário com `id` colidindo com o default **vence** — é o que permite
 * sobrescrever uma medida do catálogo padrão que não bate com o móvel real
 * (spec 06 § Catálogo do usuário). A posição do item substituído é preservada,
 * para o painel não reordenar sozinho quando o usuário corrige uma medida.
 */
export function mergeCatalogs(
  base: readonly CatalogItem[],
  user: readonly CatalogItem[],
): CatalogItem[] {
  const overrides = new Map<string, CatalogItem>()
  for (const item of user) overrides.set(item.id, item)

  const merged = base.map((item) => overrides.get(item.id) ?? item)
  const known = new Set(base.map((item) => item.id))

  for (const item of user) {
    if (!known.has(item.id)) merged.push(item)
  }

  return merged
}

export function findCatalogItem(
  items: readonly CatalogItem[],
  id: string,
): CatalogItem | null {
  return items.find((item) => item.id === id) ?? null
}
