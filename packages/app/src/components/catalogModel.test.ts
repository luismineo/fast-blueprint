import { describe, expect, it } from 'vitest'
import { loadDefaultCatalog } from '@planta/catalog'
import { describeCatalog, pushRecent, toDraft } from './catalogModel'

const catalog = loadDefaultCatalog()

function itemsOf(query: string, recent: string[] = []): string[] {
  return describeCatalog(catalog, query, recent).groups.flatMap((group) =>
    group.items.map((entry) => entry.id),
  )
}

describe('modelo do painel de catálogo', () => {
  it('sem busca, agrupa o catálogo inteiro por categoria', () => {
    const model = describeCatalog(catalog, '', [])

    expect(model.groups.map((group) => group.category)).toEqual([
      'quarto',
      'sala',
      'cozinha',
      'banheiro',
      'servico',
      'escritorio',
      'circulacao',
    ])
    expect(model.groups.flatMap((group) => group.items)).toHaveLength(catalog.length)
    expect(model.empty).toBe(false)
  })

  it('busca filtra e mantém o agrupamento', () => {
    const model = describeCatalog(catalog, 'geladeira', [])

    expect(model.groups).toHaveLength(1)
    expect(model.groups[0]!.category).toBe('cozinha')
    expect(model.groups[0]!.items.map((entry) => entry.id)).toEqual([
      'fridge-frost-free',
      'fridge-duplex',
    ])
    expect(model.searching).toBe(true)
  })

  it('busca sem casamento marca vazio', () => {
    const model = describeCatalog(catalog, 'helicoptero', [])

    expect(model.empty).toBe(true)
    expect(model.groups).toEqual([])
  })

  it('busca ignora acento', () => {
    expect(itemsOf('servico')).toEqual(itemsOf('serviço'))
  })

  it('recentes aparecem sem busca, na ordem de uso', () => {
    const model = describeCatalog(catalog, '', ['sofa-3', 'bed-queen'])

    expect(model.recent.map((entry) => entry.id)).toEqual(['sofa-3', 'bed-queen'])
  })

  it('recentes somem durante a busca', () => {
    const model = describeCatalog(catalog, 'cama', ['sofa-3'])

    expect(model.recent).toEqual([])
  })

  it('recente de id que não existe mais é ignorado', () => {
    const model = describeCatalog(catalog, '', ['fantasma', 'bed-queen'])

    expect(model.recent.map((entry) => entry.id)).toEqual(['bed-queen'])
  })

  it('o cartão traz nome e dimensão em centímetros, sem unidade repetida', () => {
    const model = describeCatalog(catalog, 'cama queen', [])
    const entry = model.groups[0]!.items[0]!

    expect(entry.name).toBe('Cama queen')
    expect(entry.dimensions).toBe('158 × 198')
  })

  it('a miniatura respeita a proporção do móvel', () => {
    const model = describeCatalog(catalog, 'cama queen', [])
    const { thumbnail } = model.groups[0]!.items[0]!

    expect(thumbnail.height).toBe(28)
    expect(thumbnail.width / thumbnail.height).toBeCloseTo(1580 / 1980, 1)
  })

  it('miniatura de item muito estreito ainda é visível', () => {
    const model = describeCatalog(catalog, 'rack 1,80', [])
    const { thumbnail } = model.groups[0]!.items[0]!

    expect(thumbnail.width).toBe(28)
    expect(thumbnail.height).toBeGreaterThanOrEqual(3)
  })
})

describe('rascunho de inserção', () => {
  it('leva dimensão, circulação e catalogId', () => {
    const queen = catalog.find((item) => item.id === 'bed-queen')!

    expect(toDraft(queen)).toEqual({
      catalogId: 'bed-queen',
      name: 'Cama queen',
      width: 1580,
      depth: 1980,
      clearance: 600,
      outline: false,
    })
  })

  it('item de circulação nasce como gabarito', () => {
    const gabarito = catalog.find((item) => item.id === 'clearance-wheelchair')!

    expect(toDraft(gabarito)).toMatchObject({ outline: true, clearance: 0 })
  })
})

describe('lista de recentes', () => {
  it('o mais recente vai para o topo, sem repetir', () => {
    let recent = pushRecent([], 'a')
    recent = pushRecent(recent, 'b')
    recent = pushRecent(recent, 'a')

    expect(recent).toEqual(['a', 'b'])
  })

  it('guarda no máximo oito', () => {
    let recent: string[] = []
    for (let i = 0; i < 12; i += 1) recent = pushRecent(recent, `item${i}`)

    expect(recent).toHaveLength(8)
    expect(recent[0]).toBe('item11')
  })
})
