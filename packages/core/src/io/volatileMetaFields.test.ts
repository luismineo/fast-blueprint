import { describe, expect, it } from 'vitest'
import { VOLATILE_META_FIELDS } from './volatileMetaFields'

describe('VOLATILE_META_FIELDS', () => {
  it('lista os campos excluidos do criterio de round-trip (adr/0004-versionamento.md Decisao 5)', () => {
    expect(VOLATILE_META_FIELDS).toEqual(['modifiedAt', 'appVersion'])
  })
})
