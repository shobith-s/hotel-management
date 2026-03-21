import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) throw new Error('Invalid credentials')
      const data = await res.json()
      localStorage.setItem('token', data.access_token)
      navigate('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-16 relative overflow-hidden">
        <div>
          <h1 className="font-headline text-4xl font-bold text-on-primary italic">Sukhsagar</h1>
          <p className="text-on-primary-container text-sm uppercase tracking-widest font-bold mt-2">
            Desi Dhaba, Miraj
          </p>
        </div>
        <div>
          <p className="font-headline text-5xl font-bold text-on-primary leading-tight mb-4">
            The Digital<br />Concierge
          </p>
          <p className="text-on-primary-container text-lg leading-relaxed max-w-sm">
            Manage tables, kitchen, lodge and billing — all from one elegant interface.
          </p>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-primary-container opacity-40" />
        <div className="absolute -right-4 -bottom-4 w-48 h-48 rounded-full bg-primary-container opacity-30" />
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24">
        <div className="max-w-md w-full mx-auto">
          {/* Mobile brand */}
          <div className="lg:hidden mb-12">
            <h1 className="font-headline text-3xl font-bold text-primary">Sukhsagar</h1>
            <p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold mt-1">
              Management Suite
            </p>
          </div>

          <h2 className="font-headline text-4xl font-bold text-primary tracking-tight mb-2">
            Welcome back
          </h2>
          <p className="text-on-surface-variant font-medium mb-12">
            Sign in to your management account
          </p>

          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sukhsagar.com"
                required
                className="input-minimal"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input-minimal"
              />
            </div>

            {error && (
              <p className="text-error text-sm font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-4 px-6 flex items-center justify-center gap-3 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
