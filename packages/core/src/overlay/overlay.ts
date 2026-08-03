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
  | 'midpoint'
  | 'axisGuide'
  | 'alignmentGuide'
  | 'edgeHighlight'
  | 'closeTarget'
  | 'marquee'
  | 'measure'
  | 'measureLabel';

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

/**
 * Primitiva de glifo de mobília, em coordenadas normalizadas [0,1]².
 *
 * `rect` e `circle` são açúcar sintático — o renderer os expande para `line`s
 * e `arc` respectivamente. Toda primitiva vira polilinha/segmento no pass de
 * mobília; `DrawTarget` não ganha primitiva nova.
 *
 * Coordenada de glifo é fração, não milímetro de domínio — float aqui não é o
 * bug que a regra permanente descreve (`adr/0006-glifos-de-mobilia.md` § 1).
 */
export type GlyphPrimitive =
  | {
      readonly kind: 'line';
      readonly x1: number;
      readonly y1: number;
      readonly x2: number;
      readonly y2: number;
    }
  | {
      readonly kind: 'rect';
      readonly x: number;
      readonly y: number;
      readonly w: number;
      readonly h: number;
    }
  | {
      readonly kind: 'circle';
      readonly cx: number;
      readonly cy: number;
      readonly r: number;
    }
  | {
      readonly kind: 'arc';
      readonly cx: number;
      readonly cy: number;
      readonly r: number;
      readonly startAngle: number;
      readonly endAngle: number;
      /**
       * Fecha o arco com um segmento reto do último ponto ao primeiro.
       *
       * `true` para bacia/roda/botão (arco pensado como forma fechada).
       * `false` para arco de verdade — a folha de uma porta não tem segmento
       * ligando a ponta do arco de volta ao eixo.
       */
      readonly closed: boolean;
    };

/**
 * Glifo de mobília: geometria declarativa normalizada que o renderer desenha
 * sobre o retângulo do móvel (`adr/0006-glifos-de-mobilia.md`).
 *
 * Vive em `core` porque `renderer` e `catalog` precisam do tipo e a direção de
 * dependência de `08-arquitetura.md` só admite `core` como lugar comum.
 * Os **valores** ficam em `catalog/data/glyphs.json`.
 */
export interface FurnitureGlyph {
  readonly id: string;
  readonly primitives: readonly GlyphPrimitive[];
}
