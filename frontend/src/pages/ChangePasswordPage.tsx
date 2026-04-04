import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, ROLE_ALLOWED_PATHS } from '../context/AuthContext'
import { changeOwnPassword } from '../api/users'

export default function ChangePasswordPage() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError]                     = useState('')
  const [loading, setLoading]                 = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      const updated = await changeOwnPassword(currentPassword, newPassword)
      if (user) setUser({ ...user, ...updated })
      const home = ROLE_ALLOWED_PATHS[updated.role]?.[0] ?? '/dashboard'
      navigate(home, { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to change password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Icon + heading */}
        <div className="text-center mb-8">
          <span className="material-symbols-outlined text-5xl text-primary mb-4 block">lock_reset</span>
          <h1 className="font-headline text-3xl font-bold text-primary mb-2">Set Your New Password</h1>
          <p className="text-sm text-on-surface-variant">
            Your administrator has set a temporary password. Please create a new one to continue.
          </p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Current (temporary) password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                className="input"
                placeholder="Enter temporary password"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                className="input"
                placeholder="At least 6 characters"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                className="input"
                placeholder="Repeat new password"
              />
            </div>

            {error && (
              <p className="text-sm text-error font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-1"
            >
              {loading ? 'Saving…' : 'Set New Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
