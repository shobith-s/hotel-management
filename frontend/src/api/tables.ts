import api from './client'

export interface Table {
  id: string
  table_number: string
  capacity: number
  status: 'available' | 'occupied' | 'bill_requested' | 'reserved'
  section_id: string
  pos_x: number | null
  pos_y: number | null
}

export async function fetchTables(): Promise<Table[]> {
  const res = await api.get<Table[]>('/tables/')
  return res.data
}

export async function updateTable(
  id: string,
  data: Partial<Pick<Table, 'pos_x' | 'pos_y' | 'status' | 'capacity'>>,
): Promise<Table> {
  const res = await api.patch<Table>(`/tables/${id}`, data)
  return res.data
}
