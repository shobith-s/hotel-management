import api from './client'

export type AuditAction = 'add' | 'modify' | 'void' | 'cancel'

export interface AuditLogEntry {
  id: string
  action: AuditAction
  reason: string | null
  created_at: string
  performed_by_name: string
  table_number: string
  item_name: string | null
}

export async function fetchAuditLogs(params?: {
  start?: string
  end?: string
  action?: AuditAction
}): Promise<AuditLogEntry[]> {
  const res = await api.get<AuditLogEntry[]>('/audit/', { params })
  return res.data
}
