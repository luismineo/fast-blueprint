import type { RenderContext } from '../renderContext'

/**
 * Pass 7: portas e janelas, com arco de abertura.
 *
 * No-op até o M6: `doc.openings` está sempre vazio, porque nenhum comando cria
 * `Opening` (`09-roadmap.md`). O pass existe na lista para que ela bata com a
 * de `04-renderizacao.md` § Passes de desenho — a ordem de desenho entre
 * abertura, parede e mobília é decisão da spec, e ela não deve ser
 * renegociada quando o M6 chegar.
 */
export function openingsPass(_ctx: RenderContext): void {}
