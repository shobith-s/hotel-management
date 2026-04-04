import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import TopBar from '../components/shared/TopBar'
import { useAuth } from '../context/AuthContext'
import {
  fetchUsers, createUser, updateUser, deleteUser, resetUserPassword,
  User,
} from '../api/users'

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_ROLES: User['role'][] = ['admin', 'manager', 'waiter', 'receptionist', 'housekeeping']

const roleBadge: Record<string, string> = {
  admin:        'bg-primary text-on-primary',
  manager:      'bg-secondary-container text-on-secondary-container',
  waiter:       'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  receptionist: 'bg-surface-container-high text-on-surface-variant',
  housekeeping: 'bg-emerald-100 text-emerald-700',
}

const roleLabel: Record<string, string> = {
  admin: 'Admin', manager: 'Manager', waiter: 'Waiter', receptionist: 'Receptionist', housekeeping: 'Housekeeping',
}

const roleIcon: Record<string, string> = {
  admin: 'shield_person', manager: 'manage_accounts', waiter: 'room_service', receptionist: 'support_agent', housekeeping: 'cleaning_services',
}

// ── Modal wrapper ──────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
          <h3 className="font-headline text-lg font-bold text-primary">{title}</h3>
          <button onClick={onClose} className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">close</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ── Form field ─────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{label}</label>
      {children}
    </div>
  )
}

// ── UsersPage ──────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { user: authUser } = useAuth()
  const queryClient = useQueryClient()
  const isAdmin = authUser?.role === 'admin'

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })

  // Available roles for current user (manager can't create admin)
  const availableRoles = isAdmin ? ALL_ROLES : ALL_ROLES.filter(r => r !== 'admin')

  // ── Modal state ──────────────────────────────────────────────────────────────

  type ModalType = 'create' | 'edit' | 'reset-password' | 'delete' | null
  const [modal, setModal]       = useState<ModalType>(null)
  const [selected, setSelected] = useState<User | null>(null)
  const [apiError, setApiError] = useState('')

  function openModal(type: ModalType, user?: User) {
    setSelected(user ?? null)
    setApiError('')
    setModal(type)
  }
  function closeModal() { setModal(null); setSelected(null); setApiError('') }

  // ── Create form state ────────────────────────────────────────────────────────

  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'waiter' as User['role'] })

  // ── Edit form state ──────────────────────────────────────────────────────────

  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'waiter' as User['role'], is_active: true })

  function openEdit(user: User) {
    setEditForm({ name: user.name, email: user.email, role: user.role, is_active: user.is_active })
    openModal('edit', user)
  }

  // ── Reset password state ─────────────────────────────────────────────────────

  const [newPassword, setNewPassword] = useState('')

  // ── Mutations ────────────────────────────────────────────────────────────────

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => { invalidate(); closeModal(); setCreateForm({ name: '', email: '', password: '', role: 'waiter' }) },
    onError: (err: any) => setApiError(err?.response?.data?.detail ?? 'Failed to create user.'),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateUser>[1] }) => updateUser(id, data),
    onSuccess: () => { invalidate(); closeModal() },
    onError: (err: any) => setApiError(err?.response?.data?.detail ?? 'Failed to update user.'),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => updateUser(id, { is_active }),
    onSuccess: invalidate,
    onError: (err: any) => setApiError(err?.response?.data?.detail ?? 'Failed to update status.'),
  })

  const resetMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => resetUserPassword(id, password),
    onSuccess: () => { invalidate(); closeModal(); setNewPassword('') },
    onError: (err: any) => setApiError(err?.response?.data?.detail ?? 'Failed to reset password.'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => { invalidate(); closeModal() },
    onError: (err: any) => setApiError(err?.response?.data?.detail ?? 'Failed to delete user.'),
  })

  // ── Render ───────────────────────────────────────────────────────────────────

  const byRole = (role: string) => users.filter(u => u.role === role).length

  return (
    <div className="min-h-screen">
      <TopBar title="Staff Management" />
      <div className="p-10 max-w-5xl mx-auto">

        {/* Heading */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h2 className="font-headline text-4xl font-bold text-primary tracking-tight mb-2">Staff Management</h2>
            <p className="text-on-surface-variant font-medium">Manage staff accounts and roles.</p>
          </div>
          <button
            onClick={() => openModal('create')}
            className="btn-primary flex items-center gap-2 px-5 py-2.5"
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            Add Staff
          </button>
        </div>

        {/* Role summary */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          {ALL_ROLES.map(role => (
            <div key={role} className="card p-5 flex items-center gap-4">
              <span className="material-symbols-outlined text-primary opacity-60">{roleIcon[role]}</span>
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
                  {['Name', 'Email', 'Role', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-surface-container-low/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-primary">
                      <div className="flex items-center gap-2">
                        {user.name}
                        {user.force_password_change && (
                          <span title="Awaiting password change" className="material-symbols-outlined text-sm text-amber-500">key</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${roleBadge[user.role]}`}>
                        {roleLabel[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-variant text-on-surface-variant'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {/* Edit */}
                        <button
                          onClick={() => openEdit(user)}
                          title="Edit"
                          className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-primary"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>

                        {/* Reset password */}
                        <button
                          onClick={() => { setNewPassword(''); openModal('reset-password', user) }}
                          title="Reset password"
                          className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-primary"
                        >
                          <span className="material-symbols-outlined text-lg">lock_reset</span>
                        </button>

                        {/* Deactivate / Activate — admin only */}
                        {isAdmin && (
                          <button
                            onClick={() => toggleActiveMutation.mutate({ id: user.id, is_active: !user.is_active })}
                            title={user.is_active ? 'Deactivate' : 'Activate'}
                            className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-amber-600"
                          >
                            <span className="material-symbols-outlined text-lg">
                              {user.is_active ? 'person_off' : 'person_check'}
                            </span>
                          </button>
                        )}

                        {/* Delete — admin only */}
                        {isAdmin && (
                          <button
                            onClick={() => openModal('delete', user)}
                            title="Delete"
                            className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-error"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create modal ─────────────────────────────────────────────────────── */}
      {modal === 'create' && (
        <Modal title="Add Staff Member" onClose={closeModal}>
          <form
            className="flex flex-col gap-4"
            onSubmit={e => { e.preventDefault(); createMutation.mutate(createForm) }}
          >
            <Field label="Full name">
              <input className="input" required value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Email">
              <input className="input" type="email" required value={createForm.email}
                onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field label="Role">
              <select className="input" value={createForm.role}
                onChange={e => setCreateForm(f => ({ ...f, role: e.target.value as User['role'] }))}>
                {availableRoles.map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}
              </select>
            </Field>
            <Field label="Temporary password">
              <input className="input" type="password" required minLength={6} value={createForm.password}
                onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Staff will be asked to change this" />
            </Field>
            {apiError && <p className="text-sm text-error">{apiError}</p>}
            <button type="submit" disabled={createMutation.isPending} className="btn-primary py-2.5 mt-1">
              {createMutation.isPending ? 'Creating…' : 'Create Account'}
            </button>
          </form>
        </Modal>
      )}

      {/* ── Edit modal ───────────────────────────────────────────────────────── */}
      {modal === 'edit' && selected && (
        <Modal title="Edit Staff Member" onClose={closeModal}>
          <form
            className="flex flex-col gap-4"
            onSubmit={e => {
              e.preventDefault()
              const data: Parameters<typeof updateUser>[1] = {
                name: editForm.name, email: editForm.email, role: editForm.role,
              }
              if (isAdmin) data.is_active = editForm.is_active
              editMutation.mutate({ id: selected.id, data })
            }}
          >
            <Field label="Full name">
              <input className="input" required value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Email">
              <input className="input" type="email" required value={editForm.email}
                onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field label="Role">
              <select className="input" value={editForm.role}
                onChange={e => setEditForm(f => ({ ...f, role: e.target.value as User['role'] }))}>
                {availableRoles.map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}
              </select>
            </Field>
            {isAdmin && (
              <Field label="Status">
                <select className="input" value={editForm.is_active ? 'active' : 'inactive'}
                  onChange={e => setEditForm(f => ({ ...f, is_active: e.target.value === 'active' }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
            )}
            {apiError && <p className="text-sm text-error">{apiError}</p>}
            <button type="submit" disabled={editMutation.isPending} className="btn-primary py-2.5 mt-1">
              {editMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </Modal>
      )}

      {/* ── Reset password modal ─────────────────────────────────────────────── */}
      {modal === 'reset-password' && selected && (
        <Modal title={`Reset Password — ${selected.name}`} onClose={closeModal}>
          <form
            className="flex flex-col gap-4"
            onSubmit={e => { e.preventDefault(); resetMutation.mutate({ id: selected.id, password: newPassword }) }}
          >
            <p className="text-sm text-on-surface-variant">
              Set a temporary password. The staff member will be prompted to change it on next login.
            </p>
            <Field label="New temporary password">
              <input className="input" type="password" required minLength={6} value={newPassword}
                onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 characters" />
            </Field>
            {apiError && <p className="text-sm text-error">{apiError}</p>}
            <button type="submit" disabled={resetMutation.isPending} className="btn-primary py-2.5 mt-1">
              {resetMutation.isPending ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        </Modal>
      )}

      {/* ── Delete confirm modal ─────────────────────────────────────────────── */}
      {modal === 'delete' && selected && (
        <Modal title="Delete Staff Member" onClose={closeModal}>
          <div className="flex flex-col gap-5">
            <p className="text-sm text-on-surface-variant">
              Permanently delete <span className="font-bold text-primary">{selected.name}</span>? This cannot be undone.
              <br /><br />
              Note: users with existing orders, bills, or bookings cannot be deleted — deactivate them instead.
            </p>
            {apiError && <p className="text-sm text-error">{apiError}</p>}
            <div className="flex gap-3">
              <button onClick={closeModal} className="btn-secondary flex-1 py-2.5">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(selected.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-error text-on-error font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
