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
