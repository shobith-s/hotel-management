import { useQuery } from '@tanstack/react-query'
import TopBar from '../components/shared/TopBar'
import { fetchUsers, User } from '../api/users'

const roleBadge: Record<string, string> = {
  admin: 'bg-primary text-on-primary',
  manager: 'bg-secondary-container text-on-secondary-container',
  waiter: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  receptionist: 'bg-surface-container-high text-on-surface-variant',
}

const roleLabel: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  waiter: 'Waiter',
  receptionist: 'Receptionist',
}

export default function UsersPage() {
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })

  const byRole = (role: string) => users.filter((u) => u.role === role).length

  return (
    <div className="min-h-screen">
      <TopBar title="Staff Management" />
      <div className="p-10 max-w-5xl mx-auto">
        <div className="mb-10">
          <h2 className="font-headline text-4xl font-bold text-primary tracking-tight mb-2">
            Staff Management
          </h2>
          <p className="text-on-surface-variant font-medium">
            Manage staff accounts and roles.
          </p>
        </div>

        {/* Role summary */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          {(['admin', 'manager', 'waiter', 'receptionist'] as const).map((role) => (
            <div key={role} className="card p-5 flex items-center gap-4">
              <span className="material-symbols-outlined text-primary opacity-60">
                {role === 'admin' ? 'shield_person' : role === 'manager' ? 'manage_accounts' : role === 'waiter' ? 'room_service' : 'support_agent'}
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{roleLabel[role]}</p>
                <p className="font-headline text-2xl font-bold text-primary">{isLoading ? '—' : byRole(role)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Users table */}
        {isLoading ? (
          <div className="card p-10 text-center text-sm text-on-surface-variant animate-pulse">Loading staff…</div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low/50">
                  {['Name', 'Email', 'Role', 'Status'].map((h) => (
                    <th key={h} className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-container-low/30 transition-colors">
                    <td className="px-6 py-5 font-bold text-primary">{user.name}</td>
                    <td className="px-6 py-5 text-sm text-on-surface-variant">{user.email}</td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${roleBadge[user.role]}`}>
                        {roleLabel[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-variant text-on-surface-variant'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
