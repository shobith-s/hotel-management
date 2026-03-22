import { Navigate, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../api/client'

export default function RequireAuth() {
  const token = localStorage.getItem('token')

  // No token at all → go to login immediately, no loading flash
  if (!token) return <Navigate to="/login" replace />

  return <AuthCheck />
}

// Separate component so the hook only runs when a token exists
function AuthCheck() {
  const { isLoading, isError } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data),
    retry: false,
    staleTime: 5 * 60 * 1000,   // re-validate at most every 5 min
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

  return <Outlet />
}
