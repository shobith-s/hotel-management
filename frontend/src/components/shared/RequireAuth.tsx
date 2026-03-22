import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../api/client'
import { AuthContext, ROLE_ALLOWED_PATHS, type AuthUser } from '../../context/AuthContext'

export default function RequireAuth() {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return <AuthCheck />
}

function AuthCheck() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const location = useLocation()

  const { isLoading, isError } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => api.get('/auth/me').then((r) => {
      setUser(r.data)
      return r.data
    }),
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">sync</span>
      </div>
    )
  }

  if (isError) {
    localStorage.removeItem('token')
    return <Navigate to="/login" replace />
  }

  // Role-based route guard — redirect to role's home if accessing a forbidden page
  if (user) {
    const allowed = ROLE_ALLOWED_PATHS[user.role] ?? []
    const currentPath = '/' + location.pathname.split('/')[1]
    if (!allowed.includes(currentPath)) {
      return <Navigate to={allowed[0]} replace />
    }
  }

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <Outlet />
    </AuthContext.Provider>
  )
}
