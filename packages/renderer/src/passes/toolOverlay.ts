import type { RenderContext } from '../renderContext'

/**
 * Pass 11: Traço em andamento da ferramenta ativa.
 * Desenha overlays declarativos fornecidos pela ferramenta: polilinha, linha fantasma, marcadores.
 */
export function toolOverlayPass(_ctx: RenderContext): void {
  // No M1, os overlays da Ferramenta Cômodo são desenhados diretamente pelo
  // HUD e pelo componente Svelte. Este pass é um stub — será populado quando
  // o sistema de OverlayPrimitive for implementado (M2).
}