import { frameRect, panBy, zoomAt, type Camera, type Point, type Size } from '@planta/renderer'

export const CAMERA_INPUT_CONFIG = {
  wheelZoomStep: 1.1,
  trackpadZoomDivisor: 100,
  emptyDocumentFrame: { x: -5000, y: -5000, width: 10000, height: 10000 },
  emptyDocumentMargin: 0.1,
  panButton: 1,
} as const

export interface WheelInput {
  readonly deltaX: number
  readonly deltaY: number
  readonly deltaMode: number
  readonly ctrlKey: boolean
  readonly cursor: Point
}

export type WheelIntent =
  | { readonly kind: 'zoom'; readonly factor: number; readonly cursor: Point }
  | { readonly kind: 'pan'; readonly delta: Point }

export function classifyWheel(input: WheelInput): WheelIntent {
  if (input.ctrlKey) {
    return { kind: 'zoom', factor: pinchZoomFactor(input.deltaY), cursor: input.cursor }
  }

  const isTrackpadPan = input.deltaMode === 0 && input.deltaX !== 0
  if (isTrackpadPan) {
    return { kind: 'pan', delta: { x: -input.deltaX, y: -input.deltaY } }
  }

  return {
    kind: 'zoom',
    factor: input.deltaY < 0 ? CAMERA_INPUT_CONFIG.wheelZoomStep : 1 / CAMERA_INPUT_CONFIG.wheelZoomStep,
    cursor: input.cursor,
  }
}

export function applyWheelIntent(camera: Camera, intent: WheelIntent): Camera {
  return intent.kind === 'zoom' ? zoomAt(camera, intent.cursor, intent.factor) : panBy(camera, intent.delta)
}

export function homeCamera(viewport: Size): Camera {
  return frameRect(CAMERA_INPUT_CONFIG.emptyDocumentFrame, viewport, CAMERA_INPUT_CONFIG.emptyDocumentMargin)
}

export function toLocalPoint(clientX: number, clientY: number, origin: { readonly left: number; readonly top: number }): Point {
  return { x: clientX - origin.left, y: clientY - origin.top }
}

export function shouldStartPan(button: number, spacePressed: boolean): boolean {
  return button === CAMERA_INPUT_CONFIG.panButton || spacePressed
}

export interface PanDragState {
  readonly pointerId: number
  readonly origin: Point
}

export function beginPanDrag(pointerId: number, point: Point): PanDragState {
  return { pointerId, origin: point }
}

export interface PanDragStep {
  readonly state: PanDragState
  readonly delta: Point
}

export function continuePanDrag(state: PanDragState, pointerId: number, point: Point): PanDragStep | null {
  if (state.pointerId !== pointerId) return null
  return {
    state: { pointerId, origin: point },
    delta: { x: point.x - state.origin.x, y: point.y - state.origin.y },
  }
}

export function endsPanDrag(state: PanDragState, pointerId: number): boolean {
  return state.pointerId === pointerId
}

interface FocusLike {
  readonly tagName: string
  hasAttribute(name: string): boolean
}

export function isHomeShortcutEligible(activeElement: FocusLike | null): boolean {
  if (!activeElement) return true
  if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') return false
  return !activeElement.hasAttribute('contenteditable')
}

function pinchZoomFactor(deltaY: number): number {
  return Math.pow(CAMERA_INPUT_CONFIG.wheelZoomStep, -deltaY / CAMERA_INPUT_CONFIG.trackpadZoomDivisor)
}
