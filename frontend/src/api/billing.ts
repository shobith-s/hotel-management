import api from './client'

export type PaymentMode = 'cash' | 'card' | 'upi' | 'complimentary' | 'credit'
export type PaymentStatus = 'pending' | 'paid'

export interface BillRead {
  id: string
  order_id: string
  bill_number: string
  subtotal: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  service_charge: number
  discount_amount: number
  grand_total: number
  payment_mode: PaymentMode | null
  payment_status: PaymentStatus
  served_by: string
  created_at: string
  paid_at: string | null
}

export interface BillCreate {
  order_id: string
  discount_amount?: number
  service_charge?: number
  is_igst?: boolean
}

export async function createBill(data: BillCreate): Promise<BillRead> {
  const res = await api.post<BillRead>('/billing/', data)
  return res.data
}

export async function getBillByOrder(orderId: string): Promise<BillRead> {
  const res = await api.get<BillRead>(`/billing/order/${orderId}`)
  return res.data
}

export async function settlePayment(billId: string, payment_mode: PaymentMode): Promise<BillRead> {
  const res = await api.post<BillRead>(`/billing/${billId}/pay`, { payment_mode })
  return res.data
}


export interface BillSplitRead {
  id: string
  bill_id: string
  split_number: number
  amount: number
  is_paid: boolean
  payment_mode: PaymentMode | null
  paid_at: string | null
}

export async function splitBill(billId: string, splits: number): Promise<BillSplitRead[]> {
  const res = await api.post<BillSplitRead[]>(`/billing/${billId}/split`, { splits })
  return res.data
}

export async function getSplits(billId: string): Promise<BillSplitRead[]> {
  const res = await api.get<BillSplitRead[]>(`/billing/${billId}/splits`)
  return res.data
}

export async function settleSplit(splitId: string, payment_mode: PaymentMode): Promise<BillSplitRead> {
  const res = await api.post<BillSplitRead>(`/billing/splits/${splitId}/pay`, { payment_mode })
  return res.data
}
