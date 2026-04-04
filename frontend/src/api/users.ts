import api from './client'

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'waiter' | 'receptionist' | 'housekeeping'
  is_active: boolean
  force_password_change: boolean
  created_at: string
}

export async function fetchUsers(): Promise<User[]> {
  const res = await api.get<User[]>('/users/')
  return res.data
}

export async function createUser(data: {
  name: string
  email: string
  password: string
  role: User['role']
}): Promise<User> {
  const res = await api.post<User>('/users/', data)
  return res.data
}

export async function updateUser(
  id: string,
  data: Partial<Pick<User, 'name' | 'email' | 'role' | 'is_active'>>,
): Promise<User> {
  const res = await api.patch<User>(`/users/${id}`, data)
  return res.data
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`)
}

export async function resetUserPassword(id: string, newPassword: string): Promise<User> {
  const res = await api.post<User>(`/users/${id}/reset-password`, { new_password: newPassword })
  return res.data
}

export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<User> {
  const res = await api.post<User>('/users/me/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
  return res.data
}
