# CLAUDE.md — renderer

Canvas 2D. Lê estado, desenha pixels. Nunca muta documento. Só depende de `core`.

`render()` (`render.ts`) isola erro por pass: uma falha loga uma vez no console (dedupe por assinatura) e não interrompe os demais passes. Também aplica a transformação de câmera (`setWorldTransform`) antes de passes de geometria e reseta (`resetTransform`) antes de passes de UI — o pass em si nunca gerencia transformação, só desenha em mm (mundo) ou px (tela) conforme seu `space` (`04-renderizacao.md` § Câmera).

M0 só implementa `clear`, `grid` e `hud` (escala gráfica). Os passes de `roomFills` a `snapGuides` chegam com o domínio no M1 — não os antecipe aqui.

`RecordingTarget` (`target/`) é o alvo de teste dos passes, sem canvas real. `CanvasTarget` é o backend de produção; o backend SVG chega com o export (M4).

Nenhuma cor hexadecimal fora de `theme.ts` — regra de ESLint na raiz.
