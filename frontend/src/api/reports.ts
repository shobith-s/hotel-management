import api from './client'

export interface PaymentBreakdown {
  cash: number
  card: number
  upi: number
  complimentary: number
  credit: number
}

export interface RevenueReport {
  start_date: string
  end_date: string
  restaurant_revenue: number
  restaurant_gst: number
  total_bills: number
  payment_modes: PaymentBreakdown
  lodge_revenue: number
  total_checkouts: number
  total_revenue: number
  total_gst: number
}

export async function getRevenueSummary(start: string, end: string): Promise<RevenueReport> {
  const res = await api.get<RevenueReport>('/reports/summary', { params: { start, end } })
  return res.data
}
