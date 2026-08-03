import type { Page } from '@playwright/test'

export interface Origin {
  readonly x: number
  readonly y: number
}

/**
 * O canvas principal, distinto das miniaturas de glifo do painel de catálogo
 * (`06-catalogo-de-mobilia.md` § Painel) — `locator('canvas')` sozinho passa
 * a casar com múltiplos elementos assim que um item tem glifo.
 */
export function mainCanvas(page: Page) {
  return page.locator('canvas.canvas-fullscreen')
}

export async function canvasOrigin(page: Page): Promise<Origin> {
  const box = await mainCanvas(page).boundingBox()
  if (!box) throw new Error('canvas sem bounding box')
  return { x: box.x + box.width * 0.3, y: box.y + box.height * 0.35 }
}

/**
 * Desenha um cômodo 320 × 250 a partir de um deslocamento em pixels da origem,
 * pela sequência de aceitação da spec 03: `R`, clique, três medidas, `C`.
 */
export async function drawRoom(page: Page, origin: Origin, offsetPx: number): Promise<void> {
  const ox = origin.x + offsetPx
  const oy = origin.y

  await page.mouse.move(ox, oy)
  await page.keyboard.press('r')
  await page.mouse.click(ox, oy)

  const segment = async (digits: string, dx: number, dy: number) => {
    await page.mouse.move(ox + dx, oy + dy)
    for (const digit of digits) await page.keyboard.press(digit)
    await page.keyboard.press('Enter')
  }

  await segment('320', 200, 10)
  await segment('250', 8, 200)
  await segment('320', -200, 8)

  await page.keyboard.press('c')
  await page.keyboard.press('Enter')
}
