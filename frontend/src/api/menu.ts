import api from './client'

export interface MenuItemVariant {
  id: string
  label: string
  price: number
  is_default: boolean
}

export interface MenuItem {
  id: string
  name: string
  is_veg: boolean
  is_available: boolean
  is_market_price: boolean
  gst_rate: number
  description: string | null
  variants: MenuItemVariant[]
}

export interface MenuCategory {
  id: string
  name: string
  display_order: number
  is_active: boolean
  items: MenuItem[]
}

export interface MenuItemHistoryEntry {
  id: string
  menu_item_id: string
  changed_by_id: string | null
  changed_at: string
  field_name: string
  old_value: string | null
  new_value: string | null
  note: string | null
}

export async function fetchFullMenu(availableOnly = true): Promise<MenuCategory[]> {
  const res = await api.get<MenuCategory[]>('/menu/', { params: { available_only: availableOnly } })
  return res.data
}

export async function getMenuItemHistory(itemId: string): Promise<MenuItemHistoryEntry[]> {
  const res = await api.get<MenuItemHistoryEntry[]>(`/menu/items/${itemId}/history`)
  return res.data
}
