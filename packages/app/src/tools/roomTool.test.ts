import { describe, it, expect } from 'vitest'
import {
  initialRoomState,
  roomToolTransition,
  type RoomToolState,
} from './roomTool'
import type { NodeId } from '@planta/core'

const nid = (value: string): NodeId => value as NodeId

describe('roomTool', () => {
  describe('estado Idle', () => {
    it('pointerDown em (0,0) ancora', () => {
      const state = initialRoomState()
      const result = roomToolTransition(
        state,
        {
          type: 'pointerDown',
          point: { x: 0, y: 0 },
          snapResult: {
            point: { x: 0, y: 0 },
            targets: [],
            merged: null,
          },
        },
        { x: 0, y: 0 },
        null,
      )
      expect(result.state.kind).toBe('anchored')
      expect(result.nodeCount).toBe(1)
      expect(result.command).toBeNull()
    })
  })

  describe('estado Anchored', () => {
    it('digit + Enter confirma segmento e vai para Drawing', () => {
      const state: RoomToolState = {
        kind: 'anchored',
        anchor: { x: 0, y: 0 },
        anchors: [{ id: nid('n1'), x: 0, y: 0 }],
      }

      // Digita '3'
      const r1 = roomToolTransition(state, { type: 'digit', digit: '3' }, { x: 100, y: 0 }, null)
      expect(r1.state.kind).toBe('drawing')
      expect(r1.state.kind === 'drawing' && r1.state.inputValue).toBe('3')
      expect(r1.segmentLength).toBe(30) // 3cm = 30mm

      // Digita '2'
      const r2 = roomToolTransition(r1.state, { type: 'digit', digit: '2' }, { x: 100, y: 0 }, null)
      expect(r2.state.kind === 'drawing' && r2.state.inputValue).toBe('32')
      expect(r2.segmentLength).toBe(320) // 32cm = 320mm

      // Digita '0' e Enter
      const r3 = roomToolTransition(r2.state, { type: 'digit', digit: '0' }, { x: 100, y: 0 }, null)
      const r4 = roomToolTransition(r3.state, { type: 'enter' }, { x: 100, y: 0 }, null)

      expect(r4.state.kind).toBe('drawing')
      expect(r4.nodeCount).toBe(2)
      expect(r4.segmentLength).toBeGreaterThan(0)
    })

    it('Escape volta para Idle', () => {
      const state: RoomToolState = {
        kind: 'anchored',
        anchor: { x: 0, y: 0 },
        anchors: [{ id: nid('n1'), x: 0, y: 0 }],
      }
      const result = roomToolTransition(state, { type: 'escape' }, { x: 0, y: 0 }, null)
      expect(result.state.kind).toBe('idle')
    })
  })

  describe('estado Drawing', () => {
    it('sequência: 3 lados + C = comando CreateRoom com 4 nós fechados', () => {
      // Começa em anchored em (0,0)
      let state: RoomToolState = {
        kind: 'anchored',
        anchor: { x: 0, y: 0 },
        anchors: [{ id: nid('n1'), x: 0, y: 0 }],
      }

      // Confirma primeiro segmento: 320 cm para direita (0°)
      let r = roomToolTransition(state, { type: 'digit', digit: '3' }, { x: 100, y: 0 }, null)
      r = roomToolTransition(r.state, { type: 'digit', digit: '2' }, { x: 100, y: 0 }, null)
      r = roomToolTransition(r.state, { type: 'digit', digit: '0' }, { x: 100, y: 0 }, null)
      r = roomToolTransition(r.state, { type: 'enter' }, { x: 100, y: 0 }, null)

      expect(r.state.kind).toBe('drawing')
      expect(r.nodeCount).toBe(2)
      state = r.state

      // Segundo segmento: 250 cm para baixo (90°)
      r = roomToolTransition(state, { type: 'digit', digit: '2' }, { x: 0, y: 100 }, null)
      r = roomToolTransition(r.state, { type: 'digit', digit: '5' }, { x: 0, y: 100 }, null)
      r = roomToolTransition(r.state, { type: 'digit', digit: '0' }, { x: 0, y: 100 }, null)
      r = roomToolTransition(r.state, { type: 'enter' }, { x: 0, y: 100 }, null)

      expect(r.nodeCount).toBe(3)
      state = r.state

      // Terceiro segmento: 320 cm para esquerda (180°)
      r = roomToolTransition(state, { type: 'digit', digit: '3' }, { x: -100, y: 0 }, null)
      r = roomToolTransition(r.state, { type: 'digit', digit: '2' }, { x: -100, y: 0 }, null)
      r = roomToolTransition(r.state, { type: 'digit', digit: '0' }, { x: -100, y: 0 }, null)
      r = roomToolTransition(r.state, { type: 'enter' }, { x: -100, y: 0 }, null)

      expect(r.nodeCount).toBe(4)
      state = r.state

      // Fecha com C
      r = roomToolTransition(state, { type: 'c' }, { x: 0, y: 0 }, null)

      expect(r.state.kind).toBe('idle')
      expect(r.command).not.toBeNull()
      expect(r.command!.type).toBe('CreateRoom')
      expect(r.command!.payload.nodes).toHaveLength(4)
      expect(r.command!.payload.loop).toHaveLength(4)
    })

    it('Escape no Drawing com 1 segmento volta para Anchored', () => {
      const state: RoomToolState = {
        kind: 'drawing',
        anchor: { x: 0, y: 0 },
        anchors: [
          { id: nid('n1'), x: 0, y: 0 },
          { id: nid('n2'), x: 3200, y: 0 },
        ],
        confirmedNodes: [{ id: nid('n2'), x: 3200, y: 0 }],
      }
      const r = roomToolTransition(state, { type: 'escape' }, { x: 0, y: 0 }, null)
      expect(r.state.kind).toBe('anchored')
    })

    it('Escape com 2+ segmentos remove apenas o último', () => {
      const state: RoomToolState = {
        kind: 'drawing',
        anchor: { x: 0, y: 0 },
        anchors: [
          { id: nid('n1'), x: 0, y: 0 },
          { id: nid('n2'), x: 3200, y: 0 },
          { id: nid('n3'), x: 3200, y: 2500 },
        ],
        confirmedNodes: [
          { id: nid('n2'), x: 3200, y: 0 },
          { id: nid('n3'), x: 3200, y: 2500 },
        ],
      }
      const r = roomToolTransition(state, { type: 'escape' }, { x: 0, y: 0 }, null)
      expect(r.state.kind).toBe('drawing')
      if (r.state.kind === 'drawing') {
        expect(r.state.confirmedNodes).toHaveLength(1)
        expect(r.state.anchors).toHaveLength(2)
      }
    })

    it('C com < 3 nós é ignorado', () => {
      const state: RoomToolState = {
        kind: 'drawing',
        anchor: { x: 0, y: 0 },
        anchors: [
          { id: nid('n1'), x: 0, y: 0 },
          { id: nid('n2'), x: 3200, y: 0 },
        ],
        confirmedNodes: [{ id: nid('n2'), x: 3200, y: 0 }],
      }
      const r = roomToolTransition(state, { type: 'c' }, { x: 0, y: 0 }, null)
      expect(r.command).toBeNull()
      expect(r.state.kind).toBe('drawing')
    })
  })

  describe('Critério de encerramento 1: R, clique, 320 Enter, 250 Enter, 320 Enter, C', () => {
    it('produz um comando CreateRoom com 4 nós fechando o ciclo', () => {
      // Inicia em idle
      let state = initialRoomState()

      // R: já estamos na ferramenta (estado idle é o default)

      // Clique em (0,0)
      let r = roomToolTransition(
        state,
        {
          type: 'pointerDown',
          point: { x: 0, y: 0 },
          snapResult: { point: { x: 0, y: 0 }, targets: [], merged: null },
        },
        { x: 0, y: 0 },
        null,
      )
      expect(r.state.kind).toBe('anchored')
      state = r.state

      // 320 Enter (direita, cursor apontando para direita ≈ 0°)
      r = roomToolTransition(state, { type: 'digit', digit: '3' }, { x: 100, y: 0 }, null)
      r = roomToolTransition(r.state, { type: 'digit', digit: '2' }, { x: 100, y: 0 }, null)
      r = roomToolTransition(r.state, { type: 'digit', digit: '0' }, { x: 100, y: 0 }, null)
      r = roomToolTransition(r.state, { type: 'enter' }, { x: 100, y: 0 }, null)
      expect(r.state.kind).toBe('drawing')
      expect(r.nodeCount).toBe(2)
      state = r.state

      // 250 Enter (baixo, cursor ≈ 90°)
      r = roomToolTransition(state, { type: 'digit', digit: '2' }, { x: 0, y: 100 }, null)
      r = roomToolTransition(r.state, { type: 'digit', digit: '5' }, { x: 0, y: 100 }, null)
      r = roomToolTransition(r.state, { type: 'digit', digit: '0' }, { x: 0, y: 100 }, null)
      r = roomToolTransition(r.state, { type: 'enter' }, { x: 0, y: 100 }, null)
      expect(r.nodeCount).toBe(3)
      state = r.state

      // 320 Enter (esquerda, cursor ≈ 180°)
      r = roomToolTransition(state, { type: 'digit', digit: '3' }, { x: -100, y: 0 }, null)
      r = roomToolTransition(r.state, { type: 'digit', digit: '2' }, { x: -100, y: 0 }, null)
      r = roomToolTransition(r.state, { type: 'digit', digit: '0' }, { x: -100, y: 0 }, null)
      r = roomToolTransition(r.state, { type: 'enter' }, { x: -100, y: 0 }, null)
      expect(r.nodeCount).toBe(4)
      state = r.state

      // C (fecha)
      r = roomToolTransition(state, { type: 'c' }, { x: 0, y: 0 }, null)

      expect(r.command).not.toBeNull()
      expect(r.command!.type).toBe('CreateRoom')
      const payload = r.command!.payload

      // Verifica que temos 4 nós
      expect(payload.nodes).toHaveLength(4)
      expect(payload.loop).toHaveLength(4)

      // Verifica que o primeiro nó (anchor) é aproximadamente (0,0)
      const anchor = payload.nodes[0]!
      expect(Math.abs(anchor.x)).toBeLessThan(100)
      expect(Math.abs(anchor.y)).toBeLessThan(100)

      // Verifica que a ferramenta voltou para idle
      expect(r.state.kind).toBe('idle')
    })
  })
})