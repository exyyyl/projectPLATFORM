import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { AuthPending } from '@/components/auth/auth-pending'
import { useAuth } from '@/hooks/use-auth'

export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <AuthPending />
  }

  if (status === 'guest') {
    // запоминаем, куда человек шёл, чтобы вернуть его туда после логина
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  return <Outlet />
}
