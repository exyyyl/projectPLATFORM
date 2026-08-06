import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { AuthPending } from '@/components/auth/auth-pending'
import { useAuth } from '@/hooks/use-auth'

/**
 * Обратный ProtectedRoute: страницы только для неавторизованных. Держит
 * залогиненного пользователя подальше от формы входа — бэкенд на повторный
 * /auth/login при живой сессии отвечает 403 (GuestOnlyGuard).
 */
export function GuestRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <AuthPending />
  }

  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from ?? '/'} replace />
  }

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-background p-6"
    >
      <Outlet />
    </main>
  )
}
