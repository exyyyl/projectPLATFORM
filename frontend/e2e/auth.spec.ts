import { expect, test } from '@playwright/test'

import {
  demoUser,
  mockAuthenticatedSession,
  mockGuestSession,
} from './fixtures/auth'

test.describe('Auth', () => {
  test('redirects an unauthenticated visitor to the login page', async ({
    page,
  }) => {
    await mockGuestSession(page)
    await page.goto('/')

    await expect(page).toHaveURL(/\/login$/)
    await expect(
      page.getByRole('heading', { name: 'Авторизация' }),
    ).toBeVisible()
  })

  test('guards a deep link and returns to it after login', async ({ page }) => {
    await mockGuestSession(page)
    await page.goto('/news')

    await expect(page).toHaveURL(/\/login$/)

    await page.route('**/api/v1/auth/login', (route) =>
      route.fulfill({ json: { accessToken: 'e2e-access-token' } }),
    )
    await page.route('**/api/v1/users/me', (route) =>
      route.fulfill({ json: demoUser }),
    )

    await page.getByLabel('Электронная почта').fill('student@demo.local')
    await page.getByLabel('Пароль').fill('demo123')
    await page.getByRole('button', { name: 'Войти' }).click()

    await expect(page).toHaveURL(/\/news$/)
  })

  test('shows an error for wrong credentials', async ({ page }) => {
    await mockGuestSession(page)
    await page.route('**/api/v1/auth/login', (route) =>
      route.fulfill({ status: 401, json: { message: 'Invalid credentials' } }),
    )

    await page.goto('/login')

    await page.getByLabel('Электронная почта').fill('student@demo.local')
    await page.getByLabel('Пароль').fill('wrong-password')
    await page.getByRole('button', { name: 'Войти' }).click()

    await expect(page.getByRole('alert')).toHaveText('Неверная почта или пароль')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('logout returns the user to the login page', async ({ page }) => {
    await mockAuthenticatedSession(page)
    await page.route('**/api/v1/auth/logout', (route) =>
      route.fulfill({ json: { message: 'Logged out' } }),
    )

    await page.goto('/')

    await page.getByRole('button', { name: 'Выйти' }).click()

    await expect(page).toHaveURL(/\/login$/)
  })
})
