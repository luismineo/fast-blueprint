import type { Point } from '@planta/core'

/** Estado geométrico de um móvel — o que `TransformFurniture` carrega. */
export interface FurnitureGeometry {
  readonly center: Point
  readonly width: number
  readonly depth: number
  readonly rotation: number
}

/**
 * Menor dimensão alcançável arrastando um handle de canto.
 *
 * Abaixo de 10 cm o retângulo deixa de representar móvel e vira um handle
 * difícil de agarrar de volta. Quem precisa de menos digita no painel.
 */
const MIN_SIZE_MM = 100

const ROTATION_SNAP_DEG = 15

/**
 * Novo estado ao arrastar o canto `corner` até o cursor, com o canto oposto
 * fixo.
 *
 * O cálculo acontece no referencial local do móvel: a diagonal do cursor até o
 * canto fixo, girada de volta, **é** a largura e a profundidade novas. Girar o
 * cursor em vez de girar o retângulo é o que faz o redimensionamento funcionar
 * igual em qualquer rotação.
 */
export function resizeFrom(
  start: FurnitureGeometry,
  corner: number,
  cursor: Point,
  keepRatio: boolean,
): FurnitureGeometry {
  const radians = (start.rotation * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  const signX = corner === 1 || corner === 2 ? 1 : -1
  const signY = corner === 2 || corner === 3 ? 1 : -1

  const fixedLocalX = (-signX * start.width) / 2
  const fixedLocalY = (-signY * start.depth) / 2
  const fixed: Point = {
    x: start.center.x + fixedLocalX * cos - fixedLocalY * sin,
    y: start.center.y + fixedLocalX * sin + fixedLocalY * cos,
  }

  const dx = cursor.x - fixed.x
  const dy = cursor.y - fixed.y
  let width = Math.abs(dx * cos + dy * sin)
  let depth = Math.abs(-dx * sin + dy * cos)

  if (keepRatio) {
    const scale = Math.max(width / start.width, depth / start.depth)
    width = start.width * scale
    depth = start.depth * scale
  }

  width = Math.max(MIN_SIZE_MM, Math.round(width))
  depth = Math.max(MIN_SIZE_MM, Math.round(depth))

  const halfX = (signX * width) / 2
  const halfY = (signY * depth) / 2

  return {
    center: {
      x: Math.round(fixed.x + halfX * cos - halfY * sin),
      y: Math.round(fixed.y + halfX * sin + halfY * cos),
    },
    width,
    depth,
    rotation: start.rotation,
  }
}

/**
 * Rotação em que a face frontal aponta para o cursor.
 *
 * O handle de rotação vive além da face frontal, então arrastar leva a frente
 * junto — é o gesto que o usuário vê. Com `Shift`, trava em múltiplos de 15°
 * (`03-ferramentas-e-interacao.md` § Modificadores).
 */
export function rotationToward(
  center: Point,
  cursor: Point,
  shift: boolean,
): number | null {
  const dx = cursor.x - center.x
  const dy = cursor.y - center.y
  if (dx === 0 && dy === 0) return null

  const degrees = (Math.atan2(-dx, dy) * 180) / Math.PI
  const step = shift ? ROTATION_SNAP_DEG : 1
  const snapped = Math.round(degrees / step) * step

  return ((Math.round(snapped) % 360) + 360) % 360
}

/** Rotação somada a um passo, normalizada para 0–359. */
export function rotateBy(rotation: number, deltaDeg: number): number {
  return (((rotation + deltaDeg) % 360) + 360) % 360
}
