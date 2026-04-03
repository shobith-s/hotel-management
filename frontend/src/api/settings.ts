import api from './client'

export interface HotelSettings {
  name: string
  address: string
  phone: string
  gstin: string
  upi_id: string
  logo_url: string
  service_charge_pct: number
  default_checkout_time: string
}

export async function getSettings(): Promise<HotelSettings> {
  const res = await api.get<HotelSettings>('/settings')
  return res.data
}

export async function updateSettings(data: HotelSettings): Promise<HotelSettings> {
  const res = await api.put<HotelSettings>('/settings', data)
  return res.data
}
