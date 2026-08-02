import { expect, test } from '@playwright/test'
import { canvasOrigin, drawRoom } from './helpers'

/**
 * Fluxo de edição do M2 (`specs/09-roadmap.md`), contra o build de produção.
 *
 * "Pronto quando: dá para corrigir um erro de medida sem redesenhar o cômodo,
 * e mover uma parede compartilhada atualiza os dois cômodos."
 */

test('arrastar uma parede compartilhada atualiza os dois comodos', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err)))

  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()

  const origin = await canvasOrigin(page)
  await drawRoom(page, origin, 0)
  await expect(page.getByTestId('room-count')).toHaveText('1')

  const before = await page.getByTestId('usable-area').textContent()

  // Ferramenta Selecionar, clique num canto e arrasta.
  await page.keyboard.press('v')
  await page.mouse.move(origin.x, origin.y)
  await page.mouse.down()
  await page.mouse.move(origin.x - 40, origin.y - 30, { steps: 5 })
  await page.mouse.up()

  // O painel mostra o resumo do documento só quando não há seleção
  // (`07-ui-e-layout.md` § Painel): `Esc` limpa e traz a área útil de volta.
  await page.keyboard.press('Escape')
  const after = await page.getByTestId('usable-area').textContent()
  expect(after).not.toBe(before)

  // Um arraste inteiro é uma entrada de undo.
  await page.keyboard.press('Control+z')
  await expect(page.getByTestId('usable-area')).toHaveText(before ?? '')

  expect(errors).toEqual([])
})

test('corrigir a medida de uma aresta sem redesenhar o comodo', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()

  const origin = await canvasOrigin(page)
  await drawRoom(page, origin, 0)
  await expect(page.getByTestId('usable-area')).toHaveText('8,00 m²')

  // Seleciona a aresta de topo pelo painel e digita outra medida.
  await page.keyboard.press('v')
  await page.mouse.click(origin.x + 100, origin.y)

  const field = page.getByTestId('edge-length')
  await expect(field).toBeVisible()
  await field.fill('400')
  await field.press('Enter')

  // 9,00 m², não 10,00: `SetEdgeLength` move o **nó final** da aresta ao longo
  // da direção dela (`08-arquitetura.md` § Comandos do M2). O canto superior
  // direito vai de 3200 para 4000 e o inferior fica onde estava, então o
  // retângulo vira um trapézio de (0+... ) — área (3200+4000)/2 × 2500.
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('usable-area')).toHaveText('9,00 m²')
})

test('duplo clique numa aresta abre o campo de comprimento', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()

  const origin = await canvasOrigin(page)
  await drawRoom(page, origin, 0)

  await page.keyboard.press('v')
  await page.mouse.dblclick(origin.x + 100, origin.y)

  // `PointerEvent.detail` é 0 em `pointerdown`; só o evento `dblclick` traz a
  // contagem. Ler a contagem do lugar errado deixava este fluxo inalcançável.
  const inline = page.getByLabel('Comprimento da aresta em centímetros')
  await expect(inline).toBeVisible()
  await expect(inline).toHaveValue('320')
})

test('duplo clique no interior de um comodo abre a edicao de nome', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()

  const origin = await canvasOrigin(page)
  await drawRoom(page, origin, 0)

  await page.keyboard.press('v')
  await page.mouse.dblclick(origin.x + 100, origin.y + 100)

  await expect(page.getByLabel('Nome do cômodo')).toBeVisible()
})

test('selecionar um comodo e excluir com Delete', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()

  const origin = await canvasOrigin(page)
  await drawRoom(page, origin, 0)
  await expect(page.getByTestId('room-count')).toHaveText('1')

  await page.keyboard.press('v')
  await page.mouse.click(origin.x + 100, origin.y + 100)
  await page.keyboard.press('Delete')

  await expect(page.getByTestId('room-count')).toHaveText('0')

  await page.keyboard.press('Control+z')
  await expect(page.getByTestId('room-count')).toHaveText('1')
})
