import { describe, expect, it } from 'vitest'
import { loadDefaultCatalog, normalizeTerm, searchCatalog } from './index'

const catalog = loadDefaultCatalog()

function ids(query: string): string[] {
  return searchCatalog(catalog, query).map((item) => item.id)
}

describe('busca no catálogo', () => {
  it('"geladeira" devolve os dois itens de geladeira', () => {
    expect(ids('geladeira')).toEqual(['fridge-frost-free', 'fridge-duplex'])
  })

  it('ignora acento nos dois sentidos', () => {
    expect(ids('servico')).toEqual(ids('serviço'))
    expect(ids('comoda')).toEqual(['dresser'])
    expect(ids('sofá')).toEqual(ids('sofa'))
  })

  it('ignora caixa', () => {
    expect(ids('GELADEIRA')).toEqual(ids('geladeira'))
  })

  it('"cama" devolve as seis camas', () => {
    expect(ids('cama')).toEqual([
      'bed-single',
      'bed-single-xl',
      'bed-double',
      'bed-queen',
      'bed-king',
      'bed-bunk',
    ])
  })

  it('casamento no início do nome vem antes de casamento em tag', () => {
    const result = ids('cama')

    // As cinco primeiras começam com "Cama"; o Beliche entra pela tag.
    expect(result[result.length - 1]).toBe('bed-bunk')
  })

  it('casamento no meio do nome vem antes de casamento em tag', () => {
    const result = ids('mesa')

    expect(result.indexOf('coffee-table')).toBeLessThan(result.indexOf('nightstand'))
  })

  it('casa contra a categoria', () => {
    expect(ids('banheiro')).toContain('toilet')
  })

  it('busca por medida não devolve nada', () => {
    expect(ids('160')).toEqual([])
  })

  it('consulta vazia devolve o catálogo inteiro, na ordem original', () => {
    expect(ids('')).toEqual(catalog.map((item) => item.id))
    expect(ids('   ')).toEqual(catalog.map((item) => item.id))
  })

  it('consulta sem casamento devolve lista vazia', () => {
    expect(ids('helicoptero')).toEqual([])
  })

  it('normalizeTerm tira acento, caixa e espaço nas pontas', () => {
    expect(normalizeTerm('  Área de Serviço  ')).toBe('area de servico')
  })
})
