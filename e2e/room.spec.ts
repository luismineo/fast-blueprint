import { expect, test, type Page } from '@playwright/test'

/**
 * Sequência de aceitação do M1 (`specs/09-roadmap.md`), contra o build de
 * produção. É o único teste que exercita tool → store → renderer → DOM junto;
 * a suíte de unidade do M1 passava inteira com o desenho quebrado na tela.
 */
async function drawReferenceRoom(page: Page): Promise<void> {
  const canvas = await page.locator('canvas').boundingBox()
  if (!canvas) throw new Error('canvas sem bounding box')

  const ox = canvas.x + canvas.width * 0.35
  const oy = canvas.y + canvas.height * 0.35

  await page.mouse.move(ox, oy)
  await page.keyboard.press('r')
  await page.mouse.click(ox, oy)

  const segment = async (digits: string, dx: number, dy: number) => {
    await page.mouse.move(ox + dx, oy + dy)
    for (const digit of digits) await page.keyboard.press(digit)
    await page.keyboard.press('Enter')
  }

  await segment('320', 300, 15)
  await segment('250', 10, 300)
  await segment('320', -300, 10)

  await page.keyboard.press('c')
}

test('desenhar um comodo por teclado produz a area correta no painel', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err)))

  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()

  await drawReferenceRoom(page)

  await page.keyboard.type('Quarto')
  await page.keyboard.press('Enter')

  await expect(page.getByTestId('usable-area')).toHaveText('8,00 m²')
  await expect(page.getByTestId('room-count')).toHaveText('1')
  expect(errors).toEqual([])
})

test('undo depois de criar o comodo restaura o documento vazio', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()

  await drawReferenceRoom(page)
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('room-count')).toHaveText('1')

  await page.locator('canvas').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+z')

  await expect(page.getByTestId('room-count')).toHaveText('0')
  await expect(page.getByTestId('usable-area')).toHaveText('0,00 m²')
})
