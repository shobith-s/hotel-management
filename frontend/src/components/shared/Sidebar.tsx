import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { logout } from '../../api/client'
import { updateUser, changeOwnPassword } from '../../api/users'
import { useAuth, ROLE_ALLOWED_PATHS } from '../../context/AuthContext'

const ALL_NAV_ITEMS = [
  { to: '/dashboard', icon: 'dashboard',        label: 'Dashboard' },
  { to: '/menu',      icon: 'restaurant_menu',   label: 'Menu' },
  { to: '/orders',    icon: 'receipt_long',       label: 'Orders' },
  { to: '/kds',       icon: 'display_settings',   label: 'Kitchen' },
  { to: '/billing',   icon: 'payments',           label: 'Billing' },
  { to: '/lodge',     icon: 'bed',                label: 'Lodge' },
  { to: '/users',     icon: 'group',              label: 'Users' },
  { to: '/reports',   icon: 'analytics',          label: 'Reports' },
  { to: '/settings',  icon: 'settings',            label: 'Settings' },
]

const ROLE_LABELS: Record<string, string> = {
  admin:        'Administrator',
  manager:      'Manager',
  waiter:       'Waiter',
  receptionist: 'Receptionist',
}

// ── Profile modal ──────────────────────────────────────────────────────────────

function ProfileModal({ onClose }: { onClose: () => void }) {
  const { user, setUser } = useAuth()
  const queryClient = useQueryClient()

  // Account form
  const [name, setName]   = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [accountMsg, setAccountMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Password form
  const [currentPw, setCurrentPw]   = useState('')
  const [newPw, setNewPw]           = useState('')
  const [confirmPw, setConfirmPw]   = useState('')
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const accountMutation = useMutation({
    mutationFn: () => updateUser(user!.id, { name, email }),
    onSuccess: (updated) => {
      if (user) setUser({ ...user, name: updated.name, email: updated.email })
      queryClient.invalidateQueries({ queryKey: ['auth-me'] })
      setAccountMsg({ type: 'ok', text: 'Profile updated.' })
      setTimeout(() => setAccountMsg(null), 3000)
    },
    onError: (err: any) =>
      setAccountMsg({ type: 'err', text: err?.response?.data?.detail ?? 'Failed to update profile.' }),
  })

  const passwordMutation = useMutation({
    mutationFn: () => changeOwnPassword(currentPw, newPw),
    onSuccess: () => {
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      setPasswordMsg({ type: 'ok', text: 'Password changed.' })
      setTimeout(() => setPasswordMsg(null), 3000)
    },
    onError: (err: any) =>
      setPasswordMsg({ type: 'err', text: err?.response?.data?.detail ?? 'Failed to change password.' }),
  })

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMsg(null)
    if (newPw !== confirmPw) { setPasswordMsg({ type: 'err', text: 'New passwords do not match.' }); return }
    if (newPw.length < 6)    { setPasswordMsg({ type: 'err', text: 'Password must be at least 6 characters.' }); return }
    passwordMutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-lg">person</span>
            </div>
            <div>
              <h3 className="font-headline text-base font-bold text-primary leading-none">{user?.name}</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</p>
            </div>
          </div>
          <button onClick={onClose} className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">close</button>
        </div>

        <div className="p-6 flex flex-col gap-6">

          {/* ── Account section ─────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 mb-4">Account</p>
            <form
              className="flex flex-col gap-3"
              onSubmit={e => { e.preventDefault(); setAccountMsg(null); accountMutation.mutate() }}
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Full name</label>
                <input className="input" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Email</label>
                <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              {accountMsg && (
                <p className={`text-sm font-medium ${accountMsg.type === 'ok' ? 'text-emerald-600' : 'text-error'}`}>
                  {accountMsg.text}
                </p>
              )}
              <button type="submit" disabled={accountMutation.isPending} className="btn-primary py-2 mt-1">
                {accountMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </div>

          <div className="border-t border-outline-variant/15" />

          {/* ── Password section ─────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 mb-4">Change Password</p>
            <form className="flex flex-col gap-3" onSubmit={handlePasswordSubmit}>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Current password</label>
                <input className="input" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">New password</label>
                <input className="input" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required placeholder="At least 6 characters" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Confirm new password</label>
                <input className="input" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required />
              </div>
              {passwordMsg && (
                <p className={`text-sm font-medium ${passwordMsg.type === 'ok' ? 'text-emerald-600' : 'text-error'}`}>
                  {passwordMsg.text}
                </p>
              )}
              <button type="submit" disabled={passwordMutation.isPending} className="btn-primary py-2 mt-1">
                {passwordMutation.isPending ? 'Changing…' : 'Change Password'}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const { user } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)

  const allowed  = user ? (ROLE_ALLOWED_PATHS[user.role] ?? []) : ALL_NAV_ITEMS.map(n => n.to)
  const navItems = ALL_NAV_ITEMS.filter(item => allowed.includes(item.to))
  const showNewBooking = user ? allowed.includes('/lodge') : false

  return (
    <>
      <aside className="h-screen w-72 fixed left-0 top-0 border-r border-outline-variant/15 bg-surface-container-low flex flex-col py-8 z-50">
        {/* Brand */}
        <div className="px-10 mb-8">
          <h1 className="font-headline text-xl font-bold text-primary">Sukhsagar</h1>
          <p className="text-xs uppercase tracking-widest text-on-surface-variant/60 font-bold mt-0.5">
            Management Suite
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-y-1">
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive
                  ? 'bg-gradient-to-r from-primary to-primary-container text-white rounded-full mx-4 py-3 px-6 shadow-lg flex items-center gap-3 font-bold'
                  : 'text-primary/70 hover:translate-x-1 py-3 px-10 transition-transform flex items-center gap-3 font-medium'
              }
            >
              <span className="material-symbols-outlined text-[22px]">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-6 mt-auto space-y-4">
          {showNewBooking && (
            <NavLink
              to="/lodge"
              className="w-full btn-primary py-3 px-6 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>New Booking</span>
            </NavLink>
          )}

          {/* Profile card — clickable */}
          {user && (
            <button
              onClick={() => setProfileOpen(true)}
              className="w-full px-2 py-3 bg-surface-container rounded-xl flex items-center gap-3 hover:bg-surface-container-high transition-colors group"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-lg">person</span>
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-bold text-primary truncate">{user.name}</p>
                <p className="text-xs text-on-surface-variant">{ROLE_LABELS[user.role] ?? user.role}</p>
              </div>
              <span className="material-symbols-outlined text-sm text-on-surface-variant/40 group-hover:text-on-surface-variant transition-colors shrink-0">edit</span>
            </button>
          )}

          <div className="pt-2 border-t border-outline-variant/10 flex flex-col gap-1">
            <button
              onClick={() => logout()}
              className="text-primary/70 hover:text-primary py-2 flex items-center gap-4 px-2 transition-colors text-sm w-full"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </>
  )
}
