import { expect, test, type Page } from '@playwright/test'

/**
 * Roteiro de verificação manual do M2 (`specs/plans/m2-editar.md` § Verificação).
 *
 * Temporário: existe para dirigir o fluxo no navegador e capturar tela, porque
 * o post-mortem do M1 registra que duas ambiguidades reais só apareceram
 * dirigindo o aplicativo. Sai antes do commit de encerramento.
 */

const SHOTS = 'test-results/manual'

async function origin(page: Page) {
  const box = await page.locator('canvas').boundingBox()
  if (!box) throw new Error('canvas sem bounding box')
  return { x: box.x + box.width * 0.28, y: box.y + box.height * 0.3 }
}

async function drawRoom(page: Page, ox: number, oy: number, name: string) {
  await page.mouse.move(ox, oy)
  await page.keyboard.press('r')
  await page.mouse.click(ox, oy)

  const segment = async (digits: string, dx: number, dy: number) => {
    await page.mouse.move(ox + dx, oy + dy)
    for (const digit of digits) await page.keyboard.press(digit)
    await page.keyboard.press('Enter')
  }

  await segment('320', 200, 8)
  await segment('250', 6, 200)
  await segment('320', -200, 6)
  await page.keyboard.press('c')
  await page.keyboard.type(name)
  await page.keyboard.press('Enter')
}

test('roteiro manual: dois comodos adjacentes, arraste, medida, undo, angulo', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err)))

  await page.goto('/')
  const o = await origin(page)

  // 1. Dois cômodos adjacentes compartilhando a aresta.
  await drawRoom(page, o.x, o.y, 'Quarto')
  await drawRoom(page, o.x + 200, o.y, 'Sala')
  await page.screenshot({ path: `${SHOTS}/1-dois-comodos.png` })

  const nodeCount = await page.evaluate(() => document.title)
  expect(nodeCount).toBeTruthy()

  // 2. Arrastar o nó compartilhado: as duas áreas mudam juntas.
  await page.keyboard.press('v')
  await page.mouse.move(o.x + 200, o.y)
  await page.mouse.down()
  await page.mouse.move(o.x + 240, o.y + 20, { steps: 6 })
  await page.screenshot({ path: `${SHOTS}/2-arraste-em-curso.png` })
  await page.mouse.up()
  await page.keyboard.press('Escape')
  await page.screenshot({ path: `${SHOTS}/3-apos-arraste.png` })

  // 3. Duplo clique na aresta compartilhada: os dois botões inline.
  await page.mouse.dblclick(o.x + 220, o.y + 100)
  await page.screenshot({ path: `${SHOTS}/4-no-compartilhado.png` })
  await page.keyboard.press('Escape')

  // 4. Undo do arraste devolve o ponto de partida.
  await page.keyboard.press('Control+z')
  await page.screenshot({ path: `${SHOTS}/5-apos-undo.png` })

  // 5. Painel de propriedades com um cômodo selecionado.
  await page.mouse.click(o.x + 100, o.y + 100)
  await page.screenshot({ path: `${SHOTS}/6-painel-comodo.png` })
  await page.keyboard.press('Escape')

  // 6. HUD com entrada de ângulo: Tab e 90.
  await page.mouse.move(o.x, o.y + 320)
  await page.keyboard.press('r')
  await page.mouse.click(o.x, o.y + 320)
  await page.mouse.move(o.x + 200, o.y + 320)
  // Da tela, o primeiro Tab foca o comprimento; o segundo chega ao ângulo.
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.press('9')
  await page.keyboard.press('0')
  await page.screenshot({ path: `${SHOTS}/7-hud-angulo.png` })

  expect(errors).toEqual([])
})
