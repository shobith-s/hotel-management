import { NavLink } from 'react-router-dom'
import { logout } from '../../api/client'

const navItems = [
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/menu', icon: 'restaurant_menu', label: 'Menu' },
  { to: '/orders', icon: 'receipt_long', label: 'Orders' },
  { to: '/kds', icon: 'display_settings', label: 'Kitchen' },
  { to: '/billing', icon: 'payments', label: 'Billing' },
  { to: '/lodge', icon: 'bed', label: 'Lodge' },
  { to: '/users', icon: 'group', label: 'Users' },
]

export default function Sidebar() {
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

      {/* Bottom */}
      <div className="px-6 mt-auto space-y-4">
        <NavLink
          to="/lodge"
          className="w-full btn-primary py-3 px-6 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          <span>New Booking</span>
        </NavLink>
        <div className="pt-4 border-t border-outline-variant/10 flex flex-col gap-1">
          <a className="text-primary/70 hover:text-primary py-2 flex items-center gap-4 px-2 transition-colors text-sm">
            <span className="material-symbols-outlined text-[20px]">help_outline</span>
            <span className="font-medium">Support</span>
          </a>
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
  )
}
