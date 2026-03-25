import api from './client'

export interface OrderItemRead {
  id: string
  order_id: string
  menu_item_id: string
  variant_id: string | null
  quantity: number
  unit_price: number
  notes: string | null
  is_served: boolean
  is_voided: boolean
  void_reason: string | null
  voided_by: string | null
  created_at: string
  menu_item: { id: string; name: string; gst_rate: number }
  variant: { id: string; label: string; price: number } | null
}

export interface OrderRead {
  id: string
  table_id: string
  waiter_id: string
  status: 'open' | 'billed' | 'paid' | 'cancelled'
  order_source: string
  created_at: string
  updated_at: string
  items: OrderItemRead[]
}

export interface OrderItemCreate {
  menu_item_id: string
  variant_id?: string | null
  quantity: number
  notes?: string | null
  unit_price?: number | null
}

export interface OrderCreate {
  table_id: string
  items: OrderItemCreate[]
  order_source?: 'manual' | 'voice'
}

export async function listOrders(status?: string, hasUnserved?: boolean): Promise<OrderRead[]> {
  const params: Record<string, string | boolean> = {}
  if (status) params.status = status
  if (hasUnserved) params.has_unserved = true
  const res = await api.get<OrderRead[]>('/orders/', { params })
  return res.data
}

export async function createOrder(data: OrderCreate): Promise<OrderRead> {
  const res = await api.post<OrderRead>('/orders/', data)
  return res.data
}

export async function getActiveOrderForTable(tableId: string): Promise<OrderRead> {
  const res = await api.get<OrderRead>(`/orders/table/${tableId}/active`)
  return res.data
}

export async function markItemServed(orderId: string, itemId: string): Promise<OrderItemRead> {
  const res = await api.patch<OrderItemRead>(`/orders/${orderId}/items/${itemId}/served`)
  return res.data
}

export async function addItemsToOrder(orderId: string, items: OrderItemCreate[], orderSource: 'manual' | 'voice' = 'manual'): Promise<OrderRead> {
  const res = await api.post<OrderRead>(`/orders/${orderId}/items`, { items, order_source: orderSource })
  return res.data
}

export async function voidItem(orderId: string, itemId: string, reason: string): Promise<OrderItemRead> {
  const res = await api.post<OrderItemRead>(`/orders/${orderId}/items/${itemId}/void`, { reason })
  return res.data
}
