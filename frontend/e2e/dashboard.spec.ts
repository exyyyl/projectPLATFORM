import { expect, test } from '@playwright/test'

test.describe('Dashboard', () => {
  test('renders all four demo cards', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('React Hook Form + Zod')).toBeVisible()
    await expect(page.getByText('TanStack Table')).toBeVisible()
    await expect(page.getByText('TipTap')).toBeVisible()
    await expect(page.getByText('react-pdf', { exact: true })).toBeVisible()
  })

  test('table shows sample data', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('Анна')).toBeVisible()
    await expect(page.getByText('anna@example.com')).toBeVisible()
    await expect(page.getByText('Иван')).toBeVisible()
    await expect(page.getByText('ivan@example.com')).toBeVisible()
  })

  test('rich text editor is interactive', async ({ page }) => {
    await page.goto('/')

    const editor = page.locator('.tiptap')
    await editor.click()
    await editor.fill('')
    await page.keyboard.type('Привет мир')

    await expect(editor).toContainText('Привет мир')
  })

  test('skip nav link exists for accessibility', async ({ page }) => {
    await page.goto('/')

    const skipLink = page.getByText('Перейти к содержимому')
    await expect(skipLink).toBeAttached()
  })
})
