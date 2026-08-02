/**
 * Proíbe literal de texto visível ao usuário em componente `.svelte`
 * (`specs/07-ui-e-layout.md` § Acessibilidade).
 *
 * `messages.ts` é a fonte da verdade de todo texto de interface. Um literal no
 * componente escapa da varredura de chave órfã, do teste de tom e da tradução
 * futura — e apodrece calado quando o comportamento muda.
 *
 * Regra local em vez de plugin: o `eslint-plugin-svelte` que o repositório já
 * usa não tem regra de bare string, e a spec deixa o plugin "a definir na
 * implementação". Uma dependência nova para 40 linhas não se paga.
 *
 * Exceções da spec, ambas cobertas por "não tem letra":
 * - glifo estrutural sem significado lexical (`·`, `→`, `×`);
 * - saída de `core/format`, que chega por interpolação e não por literal.
 */

const LETTER = /\p{L}/u

const SKIPPED_ANCESTORS = new Set(['SvelteStyleElement', 'SvelteScriptElement'])

export const noLiteralText = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Texto visível ao usuário vem de messages.ts, nunca de literal no componente',
    },
    schema: [],
    messages: {
      literal:
        'Texto literal em componente: mova para messages.ts (specs/07-ui-e-layout.md § Textos de interface). Encontrado: {{text}}',
    },
  },

  create(context) {
    return {
      SvelteText(node) {
        const text = String(node.value ?? '').trim()
        if (text === '' || !LETTER.test(text)) return
        if (insideSkipped(node)) return

        context.report({
          node,
          messageId: 'literal',
          data: { text: text.length > 40 ? `${text.slice(0, 40)}…` : text },
        })
      },
    }
  },
}

function insideSkipped(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (SKIPPED_ANCESTORS.has(current.type)) return true
  }
  return false
}

export default {
  rules: { 'no-literal-text': noLiteralText },
}
