import type { Point } from '../geometry';

/**
 * Papel semântico de uma primitiva de overlay.
 *
 * A primitiva nunca carrega cor, espessura ou fonte: o renderer mapeia papel
 * para token de tema (`renderer/theme.ts`). Ver `03-ferramentas-e-interacao.md`
 * § Modelo mental para a justificativa.
 */
export type OverlayRole =
  | 'draft'
  | 'ghost'
  | 'snapNode'
  | 'axisGuide'
  | 'closeTarget';

/**
 * Geometria declarativa que uma ferramenta quer desenhar sobre a cena.
 *
 * Toda coordenada é em **milímetros de mundo**; a conversão para pixels é
 * responsabilidade do renderer. Sem dependência de canvas.
 */
export type OverlayPrimitive =
  | {
      readonly kind: 'polyline';
      readonly role: OverlayRole;
      readonly points: readonly Point[];
      readonly closed: boolean;
    }
  | {
      readonly kind: 'segment';
      readonly role: OverlayRole;
      readonly a: Point;
      readonly b: Point;
    }
  | {
      readonly kind: 'marker';
      readonly role: OverlayRole;
      readonly position: Point;
    }
  | {
      readonly kind: 'label';
      readonly role: OverlayRole;
      readonly position: Point;
      readonly text: string;
    };
