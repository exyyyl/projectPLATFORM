import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { apiFetch, refreshAccessToken } from '@/lib/api'
import { clearAccessToken, setAccessToken } from '@/lib/auth'
import { AuthCtx } from './auth-context'
import type { AuthStatus, AuthUser } from './auth-context'

/**
 * Локальный обход авторизации, чтобы работать над интерфейсом без поднятой БД.
 *
 * Включается только флагом VITE_AUTH_BYPASS=true в frontend/.env.local И только
 * в dev-режиме. Vite подставляет `import.meta.env.DEV` как литерал `false` при
 * сборке, поэтому в проде вся ветка становится мёртвым кодом и вырезается —
 * включить обход в собранном приложении нельзя даже переменной окружения.
 */
const AUTH_BYPASS =
  import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS === 'true'

const bypassUser: AuthUser = {
  id: 0,
  tenantId: 1,
  email: 'dev@local',
  fullName: 'Локальный Разработчик',
  role: 'student',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

if (AUTH_BYPASS) {
  console.warn(
    '[auth] VITE_AUTH_BYPASS=true — вход отключён, интерфейс открыт без авторизации. Только для локальной разработки.',
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  // при обходе сессия считается готовой сразу, без запроса и без экрана ожидания
  const [user, setUser] = useState<AuthUser | null>(
    AUTH_BYPASS ? bypassUser : null,
  )
  const [status, setStatus] = useState<AuthStatus>(
    AUTH_BYPASS ? 'authenticated' : 'loading',
  )

  // При старте приложения access-токена в памяти нет, но refresh-кука может
  // быть жива — пробуем поднять сессию по ней.
  useEffect(() => {
    if (AUTH_BYPASS) return

    let active = true

    async function restoreSession() {
      try {
        await refreshAccessToken()
        const profile = await apiFetch<AuthUser>('/v1/users/me', {
          skipRefresh: true,
        })
        if (!active) return
        setUser(profile)
        setStatus('authenticated')
      } catch {
        if (!active) return
        clearAccessToken()
        setUser(null)
        setStatus('guest')
      }
    }

    void restoreSession()

    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken } = await apiFetch<{ accessToken: string }>(
      '/v1/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipRefresh: true,
      },
    )
    setAccessToken(accessToken)

    const profile = await apiFetch<AuthUser>('/v1/users/me')
    setUser(profile)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiFetch('/v1/auth/logout', { method: 'POST', skipRefresh: true })
    } finally {
      // локальную сессию гасим в любом случае, даже если запрос не дошёл
      clearAccessToken()
      setUser(null)
      setStatus('guest')
      queryClient.clear()
    }
  }, [queryClient])

  const value = useMemo(
    () => ({ user, status, login, logout }),
    [user, status, login, logout],
  )

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
