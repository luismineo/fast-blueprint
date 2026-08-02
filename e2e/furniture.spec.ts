import { expect, test } from '@playwright/test'
import { canvasOrigin, drawRoom } from './helpers'

/**
 * Fluxo de mobiliar do M3 (`specs/09-roadmap.md`), contra o build de produção.
 *
 * "Pronto quando: dá para responder 'cabe uma cama queen com 60 cm de
 * circulação dos dois lados no Quarto L?' em menos de um minuto."
 */

test('inserir um movel do catalogo aparece no canvas', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err)))

  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()

  const origin = await canvasOrigin(page)
  await drawRoom(page, origin, 0)

  await page.getByTestId('catalog-search').fill('queen')
  await page.getByTestId('catalog-item-bed-queen').click()
  await page.mouse.click(origin.x + 100, origin.y + 100)

  // Item inserido nasce selecionado, com a ferramenta de volta em Selecionar.
  await expect(page.getByTestId('furniture-name')).toHaveValue('Cama queen')
  await expect(page.getByTestId('furniture-clearance')).toHaveValue('60')

  await page.keyboard.press('Escape')
  await expect(page.getByTestId('furniture-count')).toHaveText('1')

  expect(errors).toEqual([])
})

test('a taxa de ocupacao responde se a cama cabe no quarto', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()

  const origin = await canvasOrigin(page)
  await drawRoom(page, origin, 0)

  await page.getByTestId('catalog-search').fill('queen')
  await page.getByTestId('catalog-item-bed-queen').click()

  // Perto da parede de cima: o snap encosta a cama nela, e só encostada ela
  // cabe inteira num quarto de 2,50 m de fundo.
  await page.mouse.click(origin.x + 100, origin.y + 65)
  await page.keyboard.press('Escape')

  // Seleciona o cômodo por um canto que a cama não cobre.
  await page.mouse.click(origin.x + 40, origin.y + 140)
  await expect(page.getByTestId('room-occupancy')).toHaveText('39%')
})

/**
 * O risco levantado no plano: o snap põe dois cantos exatamente sobre a
 * aresta, e o ray casting é assimétrico na fronteira. Sem tratamento, a mesma
 * cama encostada em cima ficaria contida e encostada embaixo acusaria "fora do
 * cômodo".
 *
 * Uma página por parede: acumular móveis entre as verificações produziria
 * aviso de colisão e esconderia o que se quer medir.
 */
const WALLS: [string, number, number, string][] = [
  ['de cima', 100, 20, '0'],
  ['de baixo', 100, 145, '180'],
  ['da esquerda', 25, 80, '270'],
  ['da direita', 185, 80, '90'],
]

for (const [label, dx, dy, rotation] of WALLS) {
  test(`a cama encostada na parede ${label} fica contida, sem aviso`, async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('canvas')).toBeVisible()

    const origin = await canvasOrigin(page)
    await drawRoom(page, origin, 0)

    await page.getByTestId('catalog-search').fill('solteiro')
    await page.getByTestId('catalog-item-bed-single').click()
    await page.mouse.click(origin.x + dx, origin.y + dy)

    // A rotação acompanha a parede: o fundo encosta nela.
    await expect(page.getByLabel('Rotação')).toHaveValue(rotation)

    await page.keyboard.press('Escape')
    await expect(page.getByTestId('furniture-count')).toHaveText('1')
    await expect(page.getByTestId('warnings')).toBeHidden()
  })
}

test('Q e E giram o movel selecionado, e Ctrl+Z desfaz', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()

  const origin = await canvasOrigin(page)
  await drawRoom(page, origin, 0)

  await page.getByTestId('catalog-search').fill('criado')
  await page.getByTestId('catalog-item-nightstand').click()
  await page.mouse.click(origin.x + 100, origin.y + 100)

  const rotation = page.getByLabel('Rotação')
  await expect(rotation).toHaveValue('0')

  await page.keyboard.press('e')
  await expect(rotation).toHaveValue('90')

  await page.keyboard.press('q')
  await expect(rotation).toHaveValue('0')

  await page.keyboard.press('Control+z')
  await expect(rotation).toHaveValue('90')
})

test('excluir o movel com Delete e desfazer', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()

  const origin = await canvasOrigin(page)
  await drawRoom(page, origin, 0)

  await page.getByTestId('catalog-search').fill('criado')
  await page.getByTestId('catalog-item-nightstand').click()
  await page.mouse.click(origin.x + 100, origin.y + 100)

  await page.keyboard.press('Delete')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('furniture-count')).toHaveText('0')

  await page.keyboard.press('Control+z')
  await expect(page.getByTestId('furniture-count')).toHaveText('1')
})

test('a barra de ferramentas troca de ferramenta e Home nao enquadra com foco nela', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()

  await page.getByTestId('tool-furniture').click()
  await expect(page.getByTestId('tool-furniture')).toHaveAttribute('aria-pressed', 'true')

  await page.getByTestId('tool-select').click()
  await expect(page.getByTestId('tool-select')).toHaveAttribute('aria-pressed', 'true')

  // Parede e Medir aparecem indisponíveis, mas continuam alcançáveis por
  // teclado: o padrão ARIA toolbar usa `aria-disabled`, não `disabled`.
  await expect(page.getByTestId('tool-wall')).toHaveAttribute('aria-disabled', 'true')
  await expect(page.getByTestId('tool-measure')).toHaveAttribute('aria-disabled', 'true')

  // Com foco na barra, `End` move o foco em vez de acionar atalho global.
  await page.getByTestId('tool-select').focus()
  await page.keyboard.press('End')
  await expect(page.getByTestId('tool-measure')).toBeFocused()

  await page.keyboard.press('Home')
  await expect(page.getByTestId('tool-select')).toBeFocused()
})

test('movel salvo no catalogo do usuario sobrevive a recarga', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()

  const origin = await canvasOrigin(page)
  await drawRoom(page, origin, 0)

  await page.getByTestId('catalog-search').fill('criado')
  await page.getByTestId('catalog-item-nightstand').click()
  await page.mouse.click(origin.x + 100, origin.y + 100)

  const nome = page.getByTestId('furniture-name')
  await nome.fill('Criado do vô')
  await nome.press('Enter')

  await page.getByTestId('save-to-catalog').click()
  await page.getByTestId('confirm-save-item').click()

  // A gravação é assíncrona e disparada sem espera: recarregar antes de a
  // transação fechar perderia o item. Espera o registro existir em vez de
  // dormir um tempo arbitrário.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<string>((resolve) => {
            const open = indexedDB.open('planta', 1)
            open.onsuccess = () => {
              const db = open.result
              if (!db.objectStoreNames.contains('catalog')) return resolve('')
              const get = db
                .transaction('catalog', 'readonly')
                .objectStore('catalog')
                .get('planta:catalog:user')
              get.onsuccess = () => resolve(JSON.stringify(get.result ?? ''))
              get.onerror = () => resolve('')
            }
            open.onerror = () => resolve('')
          }),
      ),
    )
    .toContain('Criado do vô')

  // Recarrega: o item precisa vir do IndexedDB, não da memória da sessão.
  await page.reload()
  await expect(page.locator('canvas')).toBeVisible()

  // Busca sem acento acha o item com acento (spec 06 § Busca).
  await page.getByTestId('catalog-search').fill('criado do vo')
  await expect(page.locator('aside.side-panel')).toContainText('Criado do vô')
})

test('Ctrl+B recolhe e devolve o painel direito', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()

  await expect(page.getByTestId('catalog-search')).toBeVisible()

  await page.keyboard.press('Control+b')
  await expect(page.getByTestId('catalog-search')).toBeHidden()

  await page.keyboard.press('Control+b')
  await expect(page.getByTestId('catalog-search')).toBeVisible()
})
