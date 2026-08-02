import { describe, expect, it } from 'vitest'
import {
  CATALOG_CATEGORIES,
  clearanceOf,
  findCatalogItem,
  isOutlineItem,
  loadDefaultCatalog,
  mergeCatalogs,
  type CatalogItem,
} from './index'

const catalog = loadDefaultCatalog()

describe('catálogo default', () => {
  it('carrega e valida contra o schema Zod', () => {
    expect(catalog.length).toBeGreaterThan(0)
  })

  it('não tem id duplicado', () => {
    const ids = catalog.map((item) => item.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('todo item tem width e depth maiores que zero', () => {
    for (const item of catalog) {
      expect(item.width, item.id).toBeGreaterThan(0)
      expect(item.depth, item.id).toBeGreaterThan(0)
    }
  })

  it('toda categoria da spec 06 tem pelo menos um item', () => {
    for (const category of CATALOG_CATEGORIES) {
      expect(
        catalog.some((item) => item.category === category),
        category,
      ).toBe(true)
    }
  })

  it('nenhum item do default é marcado como do usuário', () => {
    expect(catalog.every((item) => item.source === undefined)).toBe(true)
  })

  it('só a categoria circulacao é gabarito sem massa', () => {
    for (const item of catalog) {
      expect(isOutlineItem(item), item.id).toBe(item.category === 'circulacao')
    }
  })

  it('circulação sugerida ausente vale zero', () => {
    const gabarito = findCatalogItem(catalog, 'clearance-person')!

    expect(gabarito.clearance).toBeUndefined()
    expect(clearanceOf(gabarito)).toBe(0)
  })

  it('a cama queen tem as medidas de mercado da spec', () => {
    expect(findCatalogItem(catalog, 'bed-queen')).toMatchObject({
      name: 'Cama queen',
      category: 'quarto',
      width: 1580,
      depth: 1980,
      clearance: 600,
    })
  })

  it('devolve null para id desconhecido', () => {
    expect(findCatalogItem(catalog, 'cama-voadora')).toBeNull()
  })

  it('a segunda carga devolve a mesma lista, sem revalidar', () => {
    expect(loadDefaultCatalog()).toBe(catalog)
  })
})

describe('merge com o catálogo do usuário', () => {
  const userQueen: CatalogItem = {
    id: 'bed-queen',
    name: 'Cama queen (a minha)',
    category: 'quarto',
    width: 1600,
    depth: 2000,
    source: 'user',
  }

  const userOwn: CatalogItem = {
    id: 'user-1',
    name: 'Bancada da varanda',
    category: 'sala',
    width: 2200,
    depth: 400,
    source: 'user',
  }

  it('item de usuário com id colidindo sobrescreve o default', () => {
    const merged = mergeCatalogs(catalog, [userQueen])

    expect(findCatalogItem(merged, 'bed-queen')).toEqual(userQueen)
    expect(merged).toHaveLength(catalog.length)
  })

  it('mantém a posição do item sobrescrito', () => {
    const merged = mergeCatalogs(catalog, [userQueen])
    const before = catalog.findIndex((item) => item.id === 'bed-queen')

    expect(merged.findIndex((item) => item.id === 'bed-queen')).toBe(before)
  })

  it('item de usuário sem colisão entra no fim', () => {
    const merged = mergeCatalogs(catalog, [userOwn])

    expect(merged).toHaveLength(catalog.length + 1)
    expect(merged[merged.length - 1]).toEqual(userOwn)
  })

  it('não altera a lista original', () => {
    const merged = mergeCatalogs(catalog, [userQueen, userOwn])

    expect(merged).not.toBe(catalog)
    expect(findCatalogItem(catalog, 'bed-queen')?.width).toBe(1580)
  })
})
