import { expect, test } from '@playwright/test'

test('app carrega e o canvas fica visivel (specs/10-testes.md secao E2E, item 1)', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()
})
