import { describe, expect, it } from 'vitest'
import { obbCorners } from '@planta/core'
import { resizeFrom, rotateBy, rotationToward, type FurnitureGeometry } from './furnitureDrag'

const START: FurnitureGeometry = {
  center: { x: 1000, y: 1000 },
  width: 1000,
  depth: 600,
  rotation: 0,
}

describe('resizeFrom', () => {
  it('arrastar um canto mantém o canto oposto fixo', () => {
    // Canto 2 (frente-direita) de (1500, 1300) para (2000, 1600).
    const next = resizeFrom(START, 2, { x: 2000, y: 1600 }, false)
    const corners = obbCorners(next.center, next.width, next.depth, next.rotation)

    expect(corners[0]).toEqual({ x: 500, y: 700 })
    expect(next.width).toBe(1500)
    expect(next.depth).toBe(900)
  })

  it('funciona igual com o móvel girado', () => {
    const rotated: FurnitureGeometry = { ...START, rotation: 90 }
    const before = obbCorners(rotated.center, rotated.width, rotated.depth, rotated.rotation)

    const next = resizeFrom(rotated, 2, { x: 1000, y: 2000 }, false)
    const after = obbCorners(next.center, next.width, next.depth, next.rotation)

    expect(after[0]).toEqual(before[0])
    expect(next.rotation).toBe(90)
  })

  it('Shift mantém a proporção', () => {
    const next = resizeFrom(START, 2, { x: 2000, y: 1200 }, true)

    expect(next.width / next.depth).toBeCloseTo(START.width / START.depth, 6)
  })

  it('não encolhe abaixo de 10 cm', () => {
    const next = resizeFrom(START, 2, { x: 501, y: 701 }, false)

    expect(next.width).toBe(100)
    expect(next.depth).toBe(100)
  })

  it('devolve dimensões inteiras', () => {
    const next = resizeFrom({ ...START, rotation: 37 }, 1, { x: 1734, y: 623 }, false)

    expect(Number.isInteger(next.width)).toBe(true)
    expect(Number.isInteger(next.depth)).toBe(true)
    expect(Number.isInteger(next.center.x)).toBe(true)
    expect(Number.isInteger(next.center.y)).toBe(true)
  })

  it('cada canto mantém o seu oposto', () => {
    for (let corner = 0; corner < 4; corner += 1) {
      const before = obbCorners(START.center, START.width, START.depth, START.rotation)
      const opposite = before[(corner + 2) % 4]!

      const next = resizeFrom(START, corner, { x: 2500, y: 2500 }, false)
      const after = obbCorners(next.center, next.width, next.depth, next.rotation)

      expect(after[(corner + 2) % 4], `canto ${corner}`).toEqual(opposite)
    }
  })
})

describe('rotationToward', () => {
  it('a face frontal aponta para o cursor', () => {
    // Cursor abaixo do centro: a frente (+depth local) já aponta para baixo.
    expect(rotationToward({ x: 0, y: 0 }, { x: 0, y: 500 }, false)).toBe(0)
    expect(rotationToward({ x: 0, y: 0 }, { x: 500, y: 0 }, false)).toBe(270)
    expect(rotationToward({ x: 0, y: 0 }, { x: 0, y: -500 }, false)).toBe(180)
    expect(rotationToward({ x: 0, y: 0 }, { x: -500, y: 0 }, false)).toBe(90)
  })

  it('Shift trava em múltiplos de 15°', () => {
    const free = rotationToward({ x: 0, y: 0 }, { x: -100, y: 480 }, false)
    const locked = rotationToward({ x: 0, y: 0 }, { x: -100, y: 480 }, true)

    expect(free).toBe(12)
    expect(locked).toBe(15)
  })

  it('devolve grau inteiro sempre', () => {
    for (let angle = 0; angle < 360; angle += 7) {
      const radians = (angle * Math.PI) / 180
      const cursor = { x: Math.cos(radians) * 731, y: Math.sin(radians) * 731 }

      expect(Number.isInteger(rotationToward({ x: 0, y: 0 }, cursor, false))).toBe(true)
    }
  })

  it('cursor sobre o centro não define direção', () => {
    expect(rotationToward({ x: 10, y: 10 }, { x: 10, y: 10 }, false)).toBeNull()
  })
})

describe('rotateBy', () => {
  it('normaliza para 0–359 nos dois sentidos', () => {
    expect(rotateBy(350, 90)).toBe(80)
    expect(rotateBy(10, -90)).toBe(280)
    expect(rotateBy(0, -15)).toBe(345)
    expect(rotateBy(270, 90)).toBe(0)
  })
})
