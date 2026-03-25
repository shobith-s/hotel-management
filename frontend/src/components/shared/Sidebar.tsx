import { NavLink } from 'react-router-dom'
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
  { to: '/audit',     icon: 'manage_search',       label: 'Audit Log' },
]

export default function Sidebar() {
  const { user } = useAuth()

  const allowed  = user ? (ROLE_ALLOWED_PATHS[user.role] ?? []) : ALL_NAV_ITEMS.map(n => n.to)
  const navItems = ALL_NAV_ITEMS.filter(item => allowed.includes(item.to))

  return (
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
    </aside>
  )
}
