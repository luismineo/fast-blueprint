import type { RenderContext } from '../renderContext'

/**
 * Pass 10: Guias de snap (marcadores e linhas de eixo).
 * No M1: desenha um marcador quadrado em nós sob o cursor (preview).
 * A ferramenta ativa fornece os overlays visuais; o renderer as desenha.
 * Este pass é um stub — os guias reais são desenhados via toolOverlay.
 */
export function snapGuidesPass(_ctx: RenderContext): void {
  // No M1, as guias de snap são parte do overlay da ferramenta ativa.
  // Este pass existe para manter a ordem de passes definida em 04-renderizacao.md
  // e será implementado quando o M2 trouxer ponto médio, aresta, extensão e alinhamento.
}