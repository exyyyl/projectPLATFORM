import { expect, test } from '@playwright/test'

test.describe('Sample Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.getByRole('button', { name: 'Отправить' }).click()

    await expect(page.getByText('Введите корректный email')).toBeVisible()
    await expect(page.getByText('Минимум 2 символа')).toBeVisible()
  })

  test('shows email error for invalid email', async ({ page }) => {
    await page.getByPlaceholder('Email').fill('not-an-email')
    await page.getByPlaceholder('Имя').fill('Тест')
    await page.getByRole('button', { name: 'Отправить' }).click()

    await expect(page.getByText('Введите корректный email')).toBeVisible()
    await expect(page.getByText('Минимум 2 символа')).not.toBeVisible()
  })

  test('submits valid form and shows toast', async ({ page }) => {
    await page.getByPlaceholder('Email').fill('test@example.com')
    await page.getByPlaceholder('Имя').fill('Тест')
    await page.getByRole('button', { name: 'Отправить' }).click()

    await expect(page.getByText('Форма отправлена: Тест')).toBeVisible()

    await expect(page.getByPlaceholder('Email')).toHaveValue('')
    await expect(page.getByPlaceholder('Имя')).toHaveValue('')
  })
})
