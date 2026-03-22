import api from './client'

export interface Table {
  id: string
  table_number: string
  capacity: number
  status: 'available' | 'occupied' | 'bill_requested' | 'reserved'
  section_id: string
}

export async function fetchTables(): Promise<Table[]> {
  const res = await api.get<Table[]>('/tables/')
  return res.data
}
