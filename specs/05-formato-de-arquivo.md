# 05 — Formato de arquivo e persistência

## Formato

Extensão `.planta.json`. JSON puro, UTF-8, indentado com 2 espaços.

O arquivo é legível e editável em qualquer editor de texto, e diffa bem em Git. Isso é intencional: é um formato aberto, e um usuário deve conseguir versionar a planta do apartamento dele num repositório.

## Schema

```jsonc
{
  "schemaVersion": 1,
  "meta": {
    "name": "Apartamento 44m²",
    "createdAt": "2026-07-30T14:00:00.000Z",
    "modifiedAt": "2026-07-30T15:12:00.000Z",
    "displayUnit": "m",
    "gridSize": 100
  },
  "nodes": [
    { "id": "n1", "x": 0,    "y": 0 },
    { "id": "n2", "x": 3200, "y": 0 },
    { "id": "n3", "x": 3200, "y": 2500 },
    { "id": "n4", "x": 0,    "y": 2500 }
  ],
  "rooms": [
    {
      "id": "r1",
      "name": "Quarto L",
      "loop": ["n1", "n2", "n3", "n4"],
      "color": null,
      "includeInUsableArea": true
    }
  ],
  "walls": [],
  "openings": [],
  "furniture": [
    {
      "id": "f1",
      "catalogId": "bed-queen",
      "name": "Cama queen",
      "width": 1580,
      "depth": 1980,
      "center": { "x": 1600, "y": 1000 },
      "rotation": 0,
      "color": null,
      "locked": false,
      "clearance": 600
    }
  ],
  "underlay": null
}
```

## Regras

- Ids são strings opacas. Geradas como `nanoid(8)`. O leitor nunca deve inferir significado do id.
- Ordem dos arrays é significativa apenas para `furniture` (ordem de desenho).
- Campos com valor default podem ser omitidos na escrita. O leitor aplica defaults.
- Campos desconhecidos são preservados no round-trip sempre que possível, para tolerar arquivos de versões futuras.
- Números são inteiros, exceto `rotation` (float, graus) e `underlay.opacity`/`underlay.scale`.

## Validação

Schema declarado com Zod em `core/schema`. Um único ponto de verdade: os tipos TypeScript são inferidos do schema Zod, não declarados em paralelo.

```ts
export const PlanDocumentSchema = z.object({ ... })
export type PlanDocument = z.infer<typeof PlanDocumentSchema>
```

Na leitura: parse com Zod → aplica migrações → valida invariantes (`01-modelo-de-dominio.md`) → carrega.

Falha de parse mostra o erro de forma acionável, não um stack trace. `core/io` não produz esse texto — devolve um erro estruturado por código (ex.: `{ code: 'ORPHAN_NODE_REF', roomName }`); o app mapeia o código para a mensagem em `messages.ioErrors` (`07-ui-e-layout.md` § Textos de interface, § Erros de `core`).

Se as invariantes de nível `error` falharem mas o parse tiver passado, o app oferece reparo automático (remover referências órfãs, deduplicar nós) e mostra o que foi alterado.

## Migrações

```ts
type Migration = (doc: unknown) => unknown

const migrations: Record<number, Migration> = {
  1: identity,
}
```

Ao carregar, aplica sequencialmente todas as migrações de `schemaVersion` do arquivo até a versão atual.

Regras:

- Migração nunca perde informação sem avisar
- Migração é testada com um arquivo fixture real da versão antiga, versionado em `specs/fixtures/legacy/`
- `schemaVersion` sobe apenas em mudança incompatível. Adicionar campo opcional não sobe versão

## Compatibilidade

`meta.schemaVersion` é independente da versão do app (`adr/0004-versionamento.md` Decisão 4). A tabela abaixo rastreia qual foi a primeira versão do app a escrever cada `schemaVersion`, mantida a cada bump. É o que se consulta quando um usuário reporta que um arquivo não abre.

| schemaVersion | Primeira versão do app que escreveu |
|---|---|
| 1 | 0.1.0 |

## Persistência

### Desktop (Tauri)

Filesystem nativo via plugin `tauri-plugin-fs` e `tauri-plugin-dialog`. Grava direto no caminho conhecido. `Ctrl+S` salva sem diálogo após o primeiro salvamento.

### Browser

File System Access API quando disponível (Chromium): `showSaveFilePicker` devolve um handle persistível em IndexedDB, e `Ctrl+S` grava no mesmo arquivo sem novo diálogo.

Fallback (Firefox, Safari): download de blob no salvar, `<input type=file>` no abrir. O app avisa uma vez, discretamente, com a mensagem `firefoxDownloadNotice` (`07-ui-e-layout.md` § Textos de interface), que nesse navegador cada salvamento gera um novo download.

### Autosave

O documento atual é gravado em IndexedDB a cada 5 segundos após qualquer mudança, sob a chave `planta:autosave:current`. Guarda também os últimos 3 snapshots, rotacionados.

Ao abrir, se existe autosave mais recente que o último salvamento explícito, oferece restauração com a mensagem `unsavedChanges` mais os botões `restoreLabel`/`discardLabel` (`07-ui-e-layout.md` § Textos de interface).

Autosave não substitui salvar. Nunca grava por cima do arquivo do usuário.

### Documento recente

Lista dos últimos 8 arquivos abertos, em IndexedDB, com nome, caminho (desktop) ou handle (browser) e miniatura PNG de 240 px gerada no salvamento.

## Underlay

Imagem de referência é armazenada como data URI dentro do JSON quando menor que 2 MB, comprimida para JPEG qualidade 0,8 e no máximo 2400 px no maior lado antes de embutir.

Acima disso, o desktop guarda referência a caminho relativo e o browser recusa com mensagem pedindo uma imagem menor.

Embutir mantém o arquivo autocontido, que é mais importante que tamanho para um documento de planta.

## Export

| Formato | Conteúdo |
|---|---|
| PNG | Rasterização da cena. Escala 1×, 2×, 4× |
| SVG | Vetorial, camadas nomeadas por pass, texto como texto |
| JSON | O próprio documento (é o "salvar") |
| CSV | Tabela de cômodos: nome, área, perímetro; e tabela de móveis: nome, largura, profundidade, cômodo |

O CSV existe para quem quer levar as áreas para uma planilha de orçamento. É uma linha de código e resolve um caso real.

## Critérios de aceitação

- [ ] Round-trip: salvar e reabrir a fixture `apto-44m2` produz documento idêntico ao original, exceto os campos em `VOLATILE_META_FIELDS` (`packages/core/src/io/volatileMetaFields.ts`, `adr/0004-versionamento.md` Decisão 5)
- [ ] Arquivo com campo desconhecido em `meta` sobrevive ao round-trip com o campo intacto
- [ ] Arquivo com `loop` referenciando nó inexistente produz mensagem de erro nomeando o cômodo
- [ ] Arquivo sem `walls` e sem `openings` carrega com arrays vazios
- [ ] Autosave dispara no máximo uma vez a cada 5 s mesmo com mudanças contínuas
- [ ] Handle de arquivo persistido em IndexedDB permite `Ctrl+S` silencioso após recarregar a página no Chromium
- [ ] SVG exportado abre no Inkscape com texto selecionável
- [ ] Imagem de underlay de 5 MB é rejeitada no browser com mensagem clara
