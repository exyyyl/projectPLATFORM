import type { Page } from '@playwright/test'

export const demoUser = {
  id: 1,
  tenantId: 1,
  email: 'student@demo.local',
  fullName: 'Анна Викторова',
  role: 'student',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

/**
 * e2e гоняются против одного лишь dev-сервера Vite, без backend. Поэтому
 * ответы auth-эндпоинтов подменяются здесь — иначе ProtectedRoute уведёт
 * любой тест на /login.
 */
export async function mockAuthenticatedSession(page: Page) {
  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({ json: { accessToken: 'e2e-access-token' } }),
  )
  await page.route('**/api/v1/users/me', (route) =>
    route.fulfill({ json: demoUser }),
  )
  await page.route('**/api/health', (route) =>
    route.fulfill({ json: { status: 'ok', timestamp: '2026-01-01T00:00:00Z' } }),
  )
}

/** Сессии нет: refresh отдаёт 401, как это делает backend без валидной куки. */
export async function mockGuestSession(page: Page) {
  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({ status: 401, json: { message: 'Unauthorized' } }),
  )
  await page.route('**/api/health', (route) =>
    route.fulfill({ json: { status: 'ok', timestamp: '2026-01-01T00:00:00Z' } }),
  )
}
