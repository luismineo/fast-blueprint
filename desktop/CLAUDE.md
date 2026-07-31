# CLAUDE.md — desktop

Tauri 2. Shell nativo, menu, filesystem — chega no M5 (`specs/09-roadmap.md`). Rust mínimo, nenhuma lógica de domínio (`specs/08-arquitetura.md`).

`src-tauri/Cargo.toml` e `tauri.conf.json` hoje existem só para os scripts `version:sync`/`version:check` terem o que ler e escrever (`adr/0004-versionamento.md`). O binário atual é um stub sem a dependência `tauri` de verdade — ela entra junto do shell real no M5, não antes.

Não é um pacote pnpm (é Rust) e não entra em `pnpm-workspace.yaml`.
