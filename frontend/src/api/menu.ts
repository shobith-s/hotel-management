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

export async function fetchFullMenu(): Promise<MenuCategory[]> {
  const res = await api.get<MenuCategory[]>('/menu/')
  return res.data
}
