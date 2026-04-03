import { createContext, useContext } from 'react'

export type UserRole = 'admin' | 'manager' | 'waiter' | 'receptionist' | 'housekeeping'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  force_password_change: boolean
}

interface AuthContextValue {
  user: AuthUser | null
  setUser: (user: AuthUser | null) => void
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  setUser: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

// Pages each role can access — first entry is their home (redirect target)
export const ROLE_ALLOWED_PATHS: Record<UserRole, string[]> = {
  admin:        ['/dashboard', '/menu', '/orders', '/kds', '/billing', '/lodge', '/users', '/reports', '/settings', '/audit', '/housekeeping'],
  manager:      ['/dashboard', '/menu', '/orders', '/kds', '/billing', '/lodge', '/users', '/reports', '/audit', '/housekeeping'],
  waiter:       ['/dashboard', '/orders', '/kds'],
  receptionist: ['/dashboard', '/billing', '/lodge'],
  housekeeping: ['/housekeeping'],
}
