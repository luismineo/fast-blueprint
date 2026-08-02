import type { CatalogItem } from './schema'

/**
 * Busca do painel de catálogo (`specs/06-catalogo-de-mobilia.md` § Busca).
 *
 * Casa contra `name`, `tags` e `category`, sem acento e sem caixa. Ordena por:
 * casamento no início do nome, casamento em qualquer posição do nome,
 * casamento em tag ou categoria.
 *
 * Busca é textual, não dimensional: procurar "160" não devolve nada, e é
 * proposital — quem procura por medida usa o campo de dimensão do painel de
 * propriedades depois de inserir.
 */

const NAME_START = 0
const NAME_ANYWHERE = 1
const TAG_OR_CATEGORY = 2
const NO_MATCH = 3

/** Sem acento e sem caixa. `NFD` separa o diacrítico, que então é descartado. */
export function normalizeTerm(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

export function searchCatalog(
  items: readonly CatalogItem[],
  query: string,
): CatalogItem[] {
  const term = normalizeTerm(query)
  if (term === '') return [...items]

  const ranked: { item: CatalogItem; rank: number; position: number }[] = []

  items.forEach((item, position) => {
    const rank = rankOf(item, term)
    if (rank !== NO_MATCH) ranked.push({ item, rank, position })
  })

  // Empate mantém a ordem do catálogo, que é curada por categoria.
  ranked.sort((a, b) => a.rank - b.rank || a.position - b.position)

  return ranked.map((entry) => entry.item)
}

function rankOf(item: CatalogItem, term: string): number {
  const name = normalizeTerm(item.name)
  if (name.startsWith(term)) return NAME_START
  if (name.includes(term)) return NAME_ANYWHERE

  if (normalizeTerm(item.category).includes(term)) return TAG_OR_CATEGORY
  for (const tag of item.tags ?? []) {
    if (normalizeTerm(tag).includes(term)) return TAG_OR_CATEGORY
  }

  return NO_MATCH
}
