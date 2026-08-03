import { expect, test } from '@playwright/test'
import { mainCanvas } from './helpers'

test('app carrega e o canvas fica visivel (specs/10-testes.md secao E2E, item 1)', async ({ page }) => {
  await page.goto('/')
  await expect(mainCanvas(page)).toBeVisible()
})
