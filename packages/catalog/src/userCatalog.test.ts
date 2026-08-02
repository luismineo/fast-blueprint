import { describe, expect, it } from 'vitest'
import {
  USER_CATALOG_KEY,
  loadDefaultCatalog,
  mergeCatalogs,
  parseUserCatalog,
  serializeUserCatalog,
  upsertUserItem,
  userItemFrom,
  type CatalogItem,
} from './index'

const BANCADA = userItemFrom({
  id: 'user_1',
  name: 'Bancada da varanda',
  category: 'sala',
  width: 2200,
  depth: 400,
  clearance: 0,
})

describe('catálogo do usuário', () => {
  it('a chave de armazenamento é a que a spec 06 nomeia', () => {
    expect(USER_CATALOG_KEY).toBe('planta:catalog:user')
  })

  it('item criado carrega a marca de usuário', () => {
    expect(BANCADA).toEqual({
      id: 'user_1',
      name: 'Bancada da varanda',
      category: 'sala',
      width: 2200,
      depth: 400,
      clearance: 0,
      source: 'user',
    })
  })

  it('serializa e volta igual', () => {
    const file = serializeUserCatalog([BANCADA])

    expect(file.version).toBe(1)
    expect(parseUserCatalog(file)).toEqual([BANCADA])
  })

  it('armazenamento vazio devolve lista vazia', () => {
    expect(parseUserCatalog(undefined)).toEqual([])
    expect(parseUserCatalog(null)).toEqual([])
  })

  it('conteúdo malformado é recusado, não reparado', () => {
    expect(() => parseUserCatalog({ version: 1, items: [{ id: 'x' }] })).toThrow()
    expect(() => parseUserCatalog('lixo')).toThrow()
    expect(() =>
      parseUserCatalog({ version: 1, items: [{ ...BANCADA, width: 0 }] }),
    ).toThrow()
  })

  it('salvar o mesmo id de novo substitui, sem duplicar', () => {
    const maior: CatalogItem = { ...BANCADA, width: 2400 }
    const items = upsertUserItem(upsertUserItem([], BANCADA), maior)

    expect(items).toEqual([maior])
  })

  it('salvar id diferente acrescenta', () => {
    const outro: CatalogItem = { ...BANCADA, id: 'user_2', name: 'Outra' }

    expect(upsertUserItem([BANCADA], outro)).toHaveLength(2)
  })

  /**
   * O caso que a spec 06 descreve: a cama queen real não bate com a de
   * catálogo, então salvar sob o mesmo id corrige a medida.
   */
  it('item de usuário sob o id do default sobrescreve a medida', () => {
    const minha = userItemFrom({
      id: 'bed-queen',
      name: 'Cama queen',
      category: 'quarto',
      width: 1600,
      depth: 2000,
      clearance: 600,
    })

    const merged = mergeCatalogs(loadDefaultCatalog(), [minha])
    const queen = merged.find((item) => item.id === 'bed-queen')

    expect(queen).toEqual(minha)
    expect(merged.filter((item) => item.id === 'bed-queen')).toHaveLength(1)
  })
})
