import { expect, test } from '@playwright/test'

import { mockAuthenticatedSession } from './fixtures/auth'

test.describe('Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page)
  })

  test('switches between light and dark modes', async ({ page }) => {
    await page.goto('/')

    const darkBtn = page.getByRole('button', { name: 'Тёмная' })
    const lightBtn = page.getByRole('button', { name: 'Светлая' })

    await darkBtn.click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    await lightBtn.click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('persists theme choice across page reload', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Тёмная' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('system mode follows prefers-color-scheme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')

    await page.getByRole('button', { name: 'Системная' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    await page.emulateMedia({ colorScheme: 'light' })
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })
})
