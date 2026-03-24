import api from './client'

export interface PaymentBreakdown {
  cash: number
  card: number
  upi: number
  complimentary: number
  credit: number
}

export interface TopItem {
  name: string
  quantity_sold: number
  revenue: number
}

export interface VoidSummary {
  count: number
  value: number
}

export interface RevenueReport {
  start_date: string
  end_date: string
  restaurant_revenue: number
  restaurant_gst: number
  total_bills: number
  avg_spend_per_bill: number
  payment_modes: PaymentBreakdown
  lodge_revenue: number
  total_checkouts: number
  total_revenue: number
  total_gst: number
  top_items: TopItem[]
  total_discount: number
  void_summary: VoidSummary
}

export async function getRevenueSummary(start: string, end: string): Promise<RevenueReport> {
  const res = await api.get<RevenueReport>('/reports/summary', { params: { start, end } })
  return res.data
}

export interface DailyOccupancy {
  date: string
  occupied_rooms: number
  occupancy_pct: number
}

export interface RoomTypeBreakdown {
  room_type: string
  total_rooms: number
  occupied_nights: number
  revenue: number
}

export interface OccupancyReport {
  start_date: string
  end_date: string
  total_rooms: number
  total_room_nights: number
  occupied_nights: number
  avg_occupancy_pct: number
  revpar: number
  adr: number
  total_revenue: number
  daily: DailyOccupancy[]
  by_room_type: RoomTypeBreakdown[]
}

export async function getOccupancyReport(start: string, end: string): Promise<OccupancyReport> {
  const res = await api.get<OccupancyReport>('/reports/occupancy', { params: { start, end } })
  return res.data
}
