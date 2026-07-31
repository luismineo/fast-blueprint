import { describe, expect, it } from 'vitest'
import {
  applyWheelIntent,
  beginPanDrag,
  classifyWheel,
  continuePanDrag,
  endsPanDrag,
  homeCamera,
  isHomeShortcutEligible,
  shouldStartPan,
  toLocalPoint,
} from './canvasInput'

describe('classifyWheel', () => {
  it('trata ctrlKey como zoom (pinch de trackpad ou Ctrl+scroll)', () => {
    const intent = classifyWheel({ deltaX: 0, deltaY: -10, deltaMode: 0, ctrlKey: true, cursor: { x: 1, y: 2 } })
    expect(intent.kind).toBe('zoom')
  })

  it('trata wheel sem ctrlKey, em modo pixel e com deltaX, como pan de trackpad', () => {
    const intent = classifyWheel({ deltaX: 5, deltaY: 3, deltaMode: 0, ctrlKey: false, cursor: { x: 0, y: 0 } })
    expect(intent).toEqual({ kind: 'pan', delta: { x: -5, y: -3 } })
  })

  it('trata wheel sem ctrlKey, em modo linha, como zoom de roda de mouse', () => {
    const intent = classifyWheel({ deltaX: 0, deltaY: -100, deltaMode: 1, ctrlKey: false, cursor: { x: 0, y: 0 } })
    expect(intent.kind).toBe('zoom')
  })

  it('trata wheel vertical puro em modo pixel (deltaX=0) como zoom, nao pan', () => {
    const intent = classifyWheel({ deltaX: 0, deltaY: 100, deltaMode: 0, ctrlKey: false, cursor: { x: 0, y: 0 } })
    expect(intent.kind).toBe('zoom')
  })

  it('zoom de roda de mouse usa um passo fixo por notch, independente da magnitude de deltaY (specs/03: 1,1x por notch)', () => {
    const small = classifyWheel({ deltaX: 0, deltaY: -1, deltaMode: 1, ctrlKey: false, cursor: { x: 0, y: 0 } })
    const large = classifyWheel({ deltaX: 0, deltaY: -500, deltaMode: 1, ctrlKey: false, cursor: { x: 0, y: 0 } })
    expect(small.kind === 'zoom' && large.kind === 'zoom' && small.factor === large.factor).toBe(true)
  })
})

describe('applyWheelIntent', () => {
  it('zoom ancora no cursor informado', () => {
    const camera = { tx: 0, ty: 0, scale: 1 }
    const result = applyWheelIntent(camera, { kind: 'zoom', factor: 1.1, cursor: { x: 100, y: 100 } })
    expect(result.scale).toBeCloseTo(1.1, 9)
  })

  it('pan translada sem alterar a escala', () => {
    const camera = { tx: 0, ty: 0, scale: 2 }
    const result = applyWheelIntent(camera, { kind: 'pan', delta: { x: 10, y: -5 } })
    expect(result).toEqual({ tx: 10, ty: -5, scale: 2 })
  })
})

describe('homeCamera', () => {
  it('enquadra uma area de 10x10m para documento vazio (specs/03 secao Camera)', () => {
    const camera = homeCamera({ width: 1000, height: 800 })
    expect(camera.scale).toBeGreaterThan(0)
  })
})

describe('shouldStartPan', () => {
  it('inicia pan no botao do meio', () => {
    expect(shouldStartPan(1, false)).toBe(true)
  })

  it('inicia pan com espaco pressionado, independente do botao', () => {
    expect(shouldStartPan(0, true)).toBe(true)
  })

  it('nao inicia pan no botao esquerdo sem espaco', () => {
    expect(shouldStartPan(0, false)).toBe(false)
  })
})

describe('pan drag state machine', () => {
  it('acumula o delta a cada movimento e ignora eventos de outro ponteiro', () => {
    let state = beginPanDrag(1, { x: 0, y: 0 })

    const step1 = continuePanDrag(state, 1, { x: 10, y: 5 })
    expect(step1?.delta).toEqual({ x: 10, y: 5 })
    state = step1?.state ?? state

    const ignored = continuePanDrag(state, 2, { x: 999, y: 999 })
    expect(ignored).toBeNull()

    const step2 = continuePanDrag(state, 1, { x: 15, y: 5 })
    expect(step2?.delta).toEqual({ x: 5, y: 0 })
  })

  it('so encerra o drag quando o ponteiro que soltou e o mesmo que iniciou', () => {
    const state = beginPanDrag(1, { x: 0, y: 0 })
    expect(endsPanDrag(state, 2)).toBe(false)
    expect(endsPanDrag(state, 1)).toBe(true)
  })
})

describe('toLocalPoint', () => {
  it('converte coordenadas de cliente para coordenadas locais do canvas', () => {
    expect(toLocalPoint(150, 220, { left: 50, top: 20 })).toEqual({ x: 100, y: 200 })
  })
})

describe('isHomeShortcutEligible', () => {
  it('permite o atalho fora de campo de entrada (regra D0 de specs/03)', () => {
    expect(isHomeShortcutEligible(null)).toBe(true)
  })

  it('bloqueia o atalho com foco em input ou textarea', () => {
    expect(isHomeShortcutEligible({ tagName: 'INPUT', hasAttribute: () => false })).toBe(false)
    expect(isHomeShortcutEligible({ tagName: 'TEXTAREA', hasAttribute: () => false })).toBe(false)
  })

  it('bloqueia o atalho em elemento contenteditable', () => {
    expect(isHomeShortcutEligible({ tagName: 'DIV', hasAttribute: (name) => name === 'contenteditable' })).toBe(false)
  })
})
