import { expect, test } from '@playwright/test'

import { mockAuthenticatedSession } from './fixtures/auth'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page)
  })

  test('loads the dashboard page', async ({ page }) => {
    await page.goto('/')

    await expect(
      page.getByRole('region', { name: 'Демонстрация компонентов' }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Главная' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  test('shows 404 for unknown routes', async ({ page }) => {
    await page.goto('/nonexistent-page')

    await expect(page.getByText('404')).toBeVisible()
    await expect(page.getByText('Страница не найдена')).toBeVisible()
    await expect(page.getByRole('link', { name: 'На главную' })).toBeVisible()
  })

  test('navigates back from 404 to home', async ({ page }) => {
    await page.goto('/nonexistent-page')

    await page.getByRole('link', { name: 'На главную' }).click()

    await expect(page.getByText('React Hook Form + Zod')).toBeVisible()
  })
})
