import { describe, it, expect } from 'vitest'
import { resolveSnap, type SnapContext, type SnapNode } from './snap'
import type { NodeId } from '../model'

function ctx(overrides: Partial<SnapContext> = {}): SnapContext {
  return {
    nodes: [],
    edges: [],
    origin: null,
    gridSize: 100,
    scale: 1, // 1 px/mm → tolerâncias em mm = tolerâncias em px
    shift: false,
    alt: false,
    ...overrides,
  }
}

const n1: SnapNode = { id: 'n1' as NodeId, x: 0, y: 0 }
const n2: SnapNode = { id: 'n2' as NodeId, x: 1000, y: 0 }

describe('resolveSnap', () => {
  describe('Classe 1 — Âncora de nó', () => {
    it('snap a nó dentro da tolerância', () => {
      const result = resolveSnap(
        { x: 5, y: 3 },
        ctx({ nodes: [n1] }),
      )
      expect(result.merged).toBe(n1.id)
      expect(result.point.x).toBe(0)
      expect(result.point.y).toBe(0)
      expect(result.targets).toHaveLength(1)
      expect(result.targets[0]!.kind).toBe('node')
    })

    it('nó fora da tolerância não dispara', () => {
      const result = resolveSnap(
        { x: 50, y: 0 },
        ctx({ nodes: [n1] }),
      )
      expect(result.merged).toBeNull()
    })

    it('nó mais próximo vence', () => {
      const result = resolveSnap(
        { x: 5, y: 0 },
        ctx({ nodes: [n1, n2] }),
      )
      expect(result.merged).toBe(n1.id)
    })
  })

  describe('Classe 2 — Eixo', () => {
    it('eixo horizontal a partir da origem', () => {
      const result = resolveSnap(
        { x: 100, y: 5 }, // cursor ligeiramente acima da horizontal
        ctx({ origin: { x: 0, y: 0 } }),
      )
      // Deve projetar sobre o eixo X (y ≈ 0)
      expect(Math.abs(result.point.y)).toBeLessThan(1)
      expect(result.targets).toHaveLength(1)
      expect(result.targets[0]!.kind).toBe('axis')
    })

    it('eixo vertical a partir da origem', () => {
      const result = resolveSnap(
        { x: 5, y: 100 },
        ctx({ origin: { x: 0, y: 0 } }),
      )
      expect(Math.abs(result.point.x)).toBeLessThan(1)
      expect(result.targets[0]!.kind).toBe('axis')
    })

    it('sem origem, sem eixo', () => {
      const result = resolveSnap(
        { x: 100, y: 100 },
        ctx(),
      )
      expect(result.targets).toEqual([])
    })

    it('Shift inclui 45°', () => {
      const result = resolveSnap(
        { x: 100, y: 105 },
        ctx({ origin: { x: 0, y: 0 }, shift: true }),
      )
      // Deve projetar sobre 45° (x ≈ y)
      expect(result.targets[0]!.kind).toBe('axis')
    })

    it('fora da tolerância do eixo não dispara', () => {
      const result = resolveSnap(
        { x: 100, y: 100 }, // longe de qualquer eixo cardinal
        ctx({ origin: { x: 0, y: 0 } }),
      )
      // Não é eixo (está a 45°), mas com shift estaria
      // Sem shift, cai para grid
      expect(result.targets).toEqual([])
    })
  })

  describe('Classe 3 — Grid', () => {
    it('grid arredonda para múltiplo de gridSize', () => {
      const result = resolveSnap(
        { x: 98, y: 2 },  // a 2mm do grid (100,0), dentro da tolerância de 6mm
        ctx({ gridSize: 100 }),
      )
      expect(result.point.x).toBe(100)
      expect(result.point.y).toBe(0)
    })

    it('ponto no grid exato não muda', () => {
      const result = resolveSnap(
        { x: 100, y: 200 },
        ctx({ gridSize: 100 }),
      )
      expect(result.point.x).toBe(100)
      expect(result.point.y).toBe(200)
    })

    it('fora da tolerância do grid não dispara', () => {
      const result = resolveSnap(
        { x: 60, y: 60 }, // 60 > gridSize/2 = 50
        ctx({ gridSize: 100 }),
      )
      // Não dispara grid, volta o ponto original
      expect(result.point.x).toBe(60)
      expect(result.point.y).toBe(60)
    })

    it('grid com escala (tolerância em px→mm)', () => {
      // scale = 0.5 px/mm → tolerância de 6px = 12mm
      const result = resolveSnap(
        { x: 8, y: 0 },
        ctx({ gridSize: 100, scale: 0.5 }),
      )
      // grid mais próximo: (0,0), distância 8mm < 12mm
      expect(result.point.x).toBe(0)
      expect(result.point.y).toBe(0)
    })
  })

  describe('Modificadores', () => {
    it('Alt desliga tudo', () => {
      const result = resolveSnap(
        { x: 5, y: 3 },
        ctx({ nodes: [n1], origin: { x: 0, y: 0 }, alt: true }),
      )
      expect(result.point.x).toBe(5)
      expect(result.point.y).toBe(3)
      expect(result.merged).toBeNull()
      expect(result.targets).toEqual([])
    })

    it('nó tem prioridade sobre eixo', () => {
      // cursor perto de nó E alinhado com eixo
      const result = resolveSnap(
        { x: 5, y: 0 },
        ctx({ nodes: [n1], origin: { x: 0, y: 0 } }),
      )
      // Deve agarrar no nó (Classe 1), não no eixo
      expect(result.merged).toBe(n1.id)
    })
  })

  describe('Sem fallback', () => {
    it('ponto longe de tudo volta inalterado', () => {
      const result = resolveSnap(
        { x: 500, y: 500 },
        ctx(),
      )
      expect(result.point.x).toBe(500)
      expect(result.point.y).toBe(500)
      expect(result.merged).toBeNull()
    })
  })
})