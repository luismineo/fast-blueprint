export interface Camera {
  readonly tx: number
  readonly ty: number
  readonly scale: number
}

export interface Point {
  readonly x: number
  readonly y: number
}

export interface Size {
  readonly width: number
  readonly height: number
}

export interface Rect extends Point, Size {}

export const CAMERA_LIMITS = {
  minScale: 0.05,
  maxScale: 20,
} as const

export function worldToScreen(camera: Camera, world: Point): Point {
  return {
    x: world.x * camera.scale + camera.tx,
    y: world.y * camera.scale + camera.ty,
  }
}

export function worldToScreenX(camera: Camera, x: number): number {
  return x * camera.scale + camera.tx
}

export function worldToScreenY(camera: Camera, y: number): number {
  return y * camera.scale + camera.ty
}

export function screenToWorld(camera: Camera, screen: Point): Point {
  return {
    x: (screen.x - camera.tx) / camera.scale,
    y: (screen.y - camera.ty) / camera.scale,
  }
}

export function zoomAt(camera: Camera, cursor: Point, factor: number): Camera {
  const worldPoint = screenToWorld(camera, cursor)
  const scale = clamp(camera.scale * factor, CAMERA_LIMITS.minScale, CAMERA_LIMITS.maxScale)
  return {
    scale,
    tx: cursor.x - worldPoint.x * scale,
    ty: cursor.y - worldPoint.y * scale,
  }
}

export function panBy(camera: Camera, deltaScreen: Point): Camera {
  return {
    scale: camera.scale,
    tx: camera.tx + deltaScreen.x,
    ty: camera.ty + deltaScreen.y,
  }
}

export function frameRect(rect: Rect, viewport: Size, marginRatio = 0.1): Camera {
  const paddedWidth = rect.width * (1 + marginRatio * 2)
  const paddedHeight = rect.height * (1 + marginRatio * 2)
  const scaleX = viewport.width / paddedWidth
  const scaleY = viewport.height / paddedHeight
  const scale = clamp(Math.min(scaleX, scaleY), CAMERA_LIMITS.minScale, CAMERA_LIMITS.maxScale)
  const centerX = rect.x + rect.width / 2
  const centerY = rect.y + rect.height / 2
  return {
    scale,
    tx: viewport.width / 2 - centerX * scale,
    ty: viewport.height / 2 - centerY * scale,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
