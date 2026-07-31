# CLAUDE.md — core

Domínio puro (`specs/08-arquitetura.md`). Zero import de `catalog`, `renderer`, `app` ou `desktop` — `pnpm depcruise` quebra o build se isso acontecer.

`src/io/volatileMetaFields.ts` é a lista central de campos voláteis do documento (`adr/0004-versionamento.md` Decisão 5), importada por qualquer teste de round-trip.

Ainda não tem `model/`, `geometry/`, `snap/`, `commands/`, `history/`, `document/` nem `format/` — chegam no M1 (`specs/09-roadmap.md`). Não adiante essas pastas antes do milestone que as pede.

Testes rodam em Node puro, sem `jsdom`.
