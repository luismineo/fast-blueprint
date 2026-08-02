import { catalogFileSchema, type CatalogCategory, type CatalogFile, type CatalogItem } from './schema'

/**
 * Catálogo do usuário (`specs/06-catalogo-de-mobilia.md` § Catálogo do usuário).
 *
 * Este módulo só conhece dado: montar o item, serializar e validar na leitura.
 * Onde ele é guardado — IndexedDB, sob esta chave — é responsabilidade de
 * `app/persistence`, que é onde a spec 08 põe armazenamento. É o que mantém
 * `catalog` testável em Node puro.
 */

export const USER_CATALOG_KEY = 'planta:catalog:user'

const USER_CATALOG_VERSION = 1

export interface UserItemInput {
  readonly id: string
  readonly name: string
  readonly category: CatalogCategory
  readonly width: number
  readonly depth: number
  readonly clearance: number
}

/**
 * Item de usuário a partir de um móvel do documento.
 *
 * O id vem de fora porque quem salva decide se está criando um item novo ou
 * sobrescrevendo um do default — um id colidente vence na resolução, que é
 * como se corrige uma medida do catálogo padrão que não bate com o móvel real.
 */
export function userItemFrom(input: UserItemInput): CatalogItem {
  return {
    id: input.id,
    name: input.name,
    category: input.category,
    width: input.width,
    depth: input.depth,
    clearance: input.clearance,
    source: 'user',
  }
}

export function serializeUserCatalog(items: readonly CatalogItem[]): CatalogFile {
  return { version: USER_CATALOG_VERSION, items: [...items] }
}

/**
 * Valida o que voltou do armazenamento antes de deixar entrar.
 *
 * Lança quando o conteúdo não casa com o schema. Quem lê decide o que fazer
 * com a falha; a mensagem acionável para o usuário é assunto da spec 05
 * § Validação, no M4.
 */
export function parseUserCatalog(raw: unknown): CatalogItem[] {
  if (raw === undefined || raw === null) return []
  return catalogFileSchema.parse(raw).items
}

/** Substitui o item de mesmo id, ou acrescenta no fim. */
export function upsertUserItem(
  items: readonly CatalogItem[],
  item: CatalogItem,
): CatalogItem[] {
  const known = items.some((candidate) => candidate.id === item.id)
  return known
    ? items.map((candidate) => (candidate.id === item.id ? item : candidate))
    : [...items, item]
}
