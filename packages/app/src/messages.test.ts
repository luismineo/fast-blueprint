import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { messages } from './messages'

const SRC = dirname(fileURLToPath(import.meta.url))

function sourceFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path))
      continue
    }
    if (entry.endsWith('.test.ts')) continue
    if (entry.endsWith('.ts') || entry.endsWith('.svelte')) found.push(path)
  }
  return found
}

/** Chaves de `messages`, com as aninhadas em notação de ponto. */
function definedKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]

  const keys: string[] = []
  for (const [name, nested] of Object.entries(value)) {
    keys.push(...definedKeys(nested, prefix === '' ? name : `${prefix}.${name}`))
  }
  return keys
}

function referencedKeys(): Set<string> {
  const pattern = /\bmessages\.([A-Za-z0-9_.]+)/g
  const found = new Set<string>()

  for (const file of sourceFiles(SRC)) {
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(pattern)) {
      found.add(match[1]!)
    }
  }

  return found
}

/**
 * Critério de `07-ui-e-layout.md`: nenhuma chave órfã nos dois sentidos.
 *
 * Uma chave definida e nunca usada é texto morto que ninguém percebe apodrecer;
 * uma chave usada e não definida é `undefined` renderizado na tela.
 */
describe('messages.ts', () => {
  it('toda chave definida é referenciada por algum arquivo de origem', () => {
    const referenced = referencedKeys()
    const unused = definedKeys(messages).filter((key) => !referenced.has(key))

    expect(unused).toEqual([])
  })

  it('toda chave referenciada existe em messages.ts', () => {
    const defined = new Set(definedKeys(messages))
    const missing = [...referencedKeys()].filter((key) => !defined.has(key))

    expect(missing).toEqual([])
  })

  it('encontra os arquivos de origem que deveria varrer', () => {
    const files = sourceFiles(SRC)

    expect(files.some((file) => file.endsWith('App.svelte'))).toBe(true)
    expect(files.some((file) => file.endsWith('PropertiesPanel.svelte'))).toBe(true)
  })
})
