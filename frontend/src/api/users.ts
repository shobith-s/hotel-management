import api from './client'

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'waiter' | 'receptionist'
  is_active: boolean
}

export async function fetchUsers(): Promise<User[]> {
  const res = await api.get<User[]>('/users/')
  return res.data
}
