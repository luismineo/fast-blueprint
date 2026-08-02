import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

/**
 * Critério de `07-ui-e-layout.md`: o lint falha com literal de texto visível ao
 * usuário em componente `.svelte`, exceto glifo estrutural e saída de
 * `core/format`.
 *
 * O teste roda o ESLint de verdade, com a configuração do repositório: uma
 * regra que nunca dispara e uma regra desconectada da configuração são
 * indistinguíveis de fora.
 */
async function lint(source: string): Promise<string[]> {
  const eslint = new ESLint({ cwd: ROOT })
  const [result] = await eslint.lintText(source, {
    filePath: resolve(ROOT, 'packages/app/src/components/Amostra.svelte'),
  })

  return (result?.messages ?? [])
    .filter((message) => message.ruleId === 'planta/no-literal-text')
    .map((message) => message.message)
}

describe('regra no-literal-text', () => {
  it('acusa texto literal no template', async () => {
    const found = await lint('<button>Salvar</button>\n')

    expect(found).toHaveLength(1)
    expect(found[0]).toContain('Salvar')
  })

  it('aceita texto vindo de messages', async () => {
    const source = [
      '<script lang="ts">',
      "  import { messages } from '../messages'",
      '</script>',
      '',
      '<button>{messages.panelDelete}</button>',
      '',
    ].join('\n')

    expect(await lint(source)).toEqual([])
  })

  it('aceita glifo estrutural', async () => {
    const source = [
      '<script lang="ts">',
      '  const { a, b } = $props()',
      '</script>',
      '',
      '<span>{a} · {b}</span>',
      '<span>{a} × {b}</span>',
      '<span>{a} → {b}</span>',
      '',
    ].join('\n')

    expect(await lint(source)).toEqual([])
  })

  it('aceita número e pontuação sem letra', async () => {
    expect(await lint('<span>0 %</span>\n')).toEqual([])
  })

  it('não confunde CSS com texto de interface', async () => {
    const source = ['<div class="x"></div>', '', '<style>', '  .x { color: red; }', '</style>', ''].join(
      '\n',
    )

    expect(await lint(source)).toEqual([])
  })

  it('não confunde código do script com texto de interface', async () => {
    const source = [
      '<script lang="ts">',
      "  const rotulo = 'texto que vive no script'",
      '</script>',
      '',
      '<span>{rotulo}</span>',
      '',
    ].join('\n')

    expect(await lint(source)).toEqual([])
  })

  it('acusa texto solto ao lado de interpolação', async () => {
    const source = [
      '<script lang="ts">',
      '  const { area } = $props()',
      '</script>',
      '',
      '<span>Área útil: {area}</span>',
      '',
    ].join('\n')

    expect(await lint(source)).toHaveLength(1)
  })
})
