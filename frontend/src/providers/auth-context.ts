import { createContext } from 'react'

export type UserRole = 'student' | 'teacher' | 'admin'

export interface AuthUser {
  id: number
  tenantId: number
  email: string
  fullName: string
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * loading — сессия ещё восстанавливается: в этот момент нельзя ни пускать
 * в интерфейс, ни редиректить на логин, иначе будет выкидывать при каждом F5.
 */
export type AuthStatus = 'loading' | 'authenticated' | 'guest'

export interface AuthContextValue {
  user: AuthUser | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthCtx = createContext<AuthContextValue | null>(null)
