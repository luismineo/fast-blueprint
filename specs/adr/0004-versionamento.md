# ADR-0004 — Versionamento

**Status:** Proposta
**Data:** 2026-07-30

Numeração: 0003 está reservada para o modelo de snap, decidido na correção pós-auditoria.

## Contexto

As specs definem três versões — `meta.schemaVersion` (spec 05), `version` do catálogo (spec 06) e os milestones do roadmap (spec 09) — e nenhuma delas é a versão do aplicativo.

Três artefatos vão exigir esse número: `package.json`, `desktop/src-tauri/tauri.conf.json` e `Cargo.toml`. O menu "Sobre" da spec 07 precisa exibi-lo, e o CI de release do M5 precisa marcá-lo por tag.

Sem fonte única, os três divergem na primeira release feita com pressa, e o instalador passa a anunciar uma versão diferente da que o app mostra.

## Decisão 1 — Fonte única na raiz

A versão do produto vive no campo `version` do `package.json` da raiz. Nada mais é fonte da verdade.

`tauri.conf.json` e `Cargo.toml` recebem o valor por um script `pnpm version:sync`. O CI roda `pnpm version:check`, que **falha** se algum dos três divergir.

Verificar em vez de propagar silenciosamente é deliberado: um passo de codegen que conserta a divergência sozinho esconde o momento em que alguém editou o lugar errado.

Os pacotes do workspace são `"private": true` e não carregam versão própria. Ninguém consome `@planta/core` separadamente; versão independente por pacote seria cerimônia sem consumidor.

Tags de git marcam release (`v0.1.0`), não definem versão. O app precisa exibir algo rodando de árvore suja em desenvolvimento, e o Tauri precisa de um literal em configuração no momento do build — `git describe` não serve para nenhum dos dois.

## Decisão 2 — Esquema `0.M.P` até a 1.0

Antes da 1.0, **M é o último milestone concluído** de `specs/09-roadmap.md`.

| Estado | Versão |
|---|---|
| Scaffold, nada funcional | `0.0.0` |
| M1 concluído | `0.1.0` |
| M1 mais correções | `0.1.1`, `0.1.2` |
| M3 concluído | `0.3.0` |
| M5 concluído, critérios da release atendidos | `1.0.0` |

A versão passa a ser legível sem consultar nada: `0.3.0` significa que os milestones até M3 estão dentro. Num projeto tocado em sessões espaçadas, isso vale mais que a pureza do esquema.

Não há sufixo de pré-release antes da 1.0. Identificador de pré-release existe para candidatos de uma versão específica; antes do M1 não há do que ser candidato. `0.0.0` já comunica "não use isto".

## Decisão 3 — Significado depois da 1.0

Semver aplicado a um aplicativo de usuário final precisa de contrato explícito, porque o contrato original do semver é sobre API para consumidores e aqui não há consumidor de API. O contrato de compatibilidade deste produto é o arquivo `.planta.json`.

| Posição | Bump quando |
|---|---|
| MAJOR | O formato de arquivo muda de forma incompatível, isto é, `schemaVersion` sobe |
| MINOR | Capacidade nova visível ao usuário |
| PATCH | Correção, sem capacidade nova |

## Decisão 4 — `schemaVersion` permanece independente

`meta.schemaVersion` é inteiro, sobe apenas em mudança incompatível de documento, e **não** acompanha a versão do app. Um app `0.4.0` e um `1.2.0` podem escrever `schemaVersion` 1.

A relação entre os dois é rastreada por uma tabela de compatibilidade em `specs/05-formato-de-arquivo.md` § Compatibilidade, mantida a cada bump. Este ADR não repete a tabela — `specs/05` é a dona, por ser a spec do formato de arquivo; este documento é a dona da regra que a gerou.

Essa tabela é o que se consulta quando um usuário reporta que um arquivo não abre. Sem ela, a informação existe apenas no histórico do git.

A `version` do catálogo (spec 06) segue a mesma regra e é igualmente independente.

## Decisão 5 — Carimbo no documento

Ao salvar, o app grava `meta.appVersion` com a versão que escreveu o arquivo.

Nunca é lido para decidir comportamento — migração é função exclusiva de `schemaVersion`. Serve para diagnóstico: saber qual versão produziu um arquivo problemático.

**Consequência sobre testes.** `meta.appVersion` e `meta.modifiedAt` mudam a cada salvamento. O critério de round-trip de `specs/05-formato-de-arquivo.md` precisa ser reformulado para "idêntico exceto metadados voláteis", com a lista de voláteis escrita em um só lugar (`packages/core/src/io/volatileMetaFields.ts`) e importada pelos testes:

```ts
export const VOLATILE_META_FIELDS = ['modifiedAt', 'appVersion'] as const
```

Sem essa lista centralizada, cada teste inventa a sua e a cobertura vira ficção.

## Decisão 6 — Sem CHANGELOG antes da 1.0

Changelog mantido à mão em projeto pré-1.0 apodrece na terceira semana. Até a 1.0, o histórico é o git, e a exigência recai sobre a mensagem de commit: imperativo, em português, uma tarefa por commit, conforme `CLAUDE.md`.

`CHANGELOG.md` passa a existir na 1.0, gerado a partir dos commits no momento da tag.

## Consequências

**Positivas.** Um número, um lugar, verificado em CI. Versão legível contra o roadmap. Compatibilidade de arquivo separada da compatibilidade de aplicativo, que é a distinção que realmente importa aqui.

**Negativas.** O esquema `0.M.P` amarra versão a roadmap, então reordenar milestones fica desconfortável. Aceitável: o roadmap é da spec 09 e mudá-lo já é decisão consciente.

**Neutras.** Após a 1.0, o significado de MAJOR muda de "milestone" para "quebra de formato". A transição acontece uma vez e está documentada aqui.
