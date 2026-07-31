# CLAUDE.md — renderer

Canvas 2D. Lê estado, desenha pixels. Nunca muta documento. Só depende de `core`.

`render()` (`render.ts`) isola erro por pass: uma falha loga uma vez no console (dedupe por assinatura) e não interrompe os demais passes.

M0 só implementa `clear`, `grid` e `hud` (escala gráfica). Os passes de `roomFills` a `snapGuides` chegam com o domínio no M1 — não os antecipe aqui.

`RecordingTarget` (`target/`) é o alvo de teste dos passes, sem canvas real. `CanvasTarget` é o backend de produção; o backend SVG chega com o export (M4).

Nenhuma cor hexadecimal fora de `theme.ts` — regra de ESLint na raiz.
