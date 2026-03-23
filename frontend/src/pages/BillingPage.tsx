import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import TopBar from '../components/shared/TopBar'
import { fetchTables, type Table } from '../api/tables'
import { getActiveOrderForTable, type OrderRead } from '../api/orders'
import { createBill, getBillByOrder, settlePayment, type BillRead, type PaymentMode } from '../api/billing'

type PaymentOption = { mode: PaymentMode; icon: string; label: string; sub: string }

const paymentOptions: PaymentOption[] = [
  { mode: 'cash', icon: 'payments', label: 'Cash', sub: 'Settle at Front Desk' },
  { mode: 'card', icon: 'credit_card', label: 'Card', sub: 'Visa, Master, Amex' },
  { mode: 'upi', icon: 'qr_code_2', label: 'UPI', sub: 'Google Pay, PhonePe' },
]

const statusColor: Record<Table['status'], string> = {
  available: 'bg-emerald-100 text-emerald-700',
  occupied: 'bg-amber-100 text-amber-700',
  bill_requested: 'bg-primary text-on-primary',
  reserved: 'bg-surface-container-high text-on-surface-variant',
}

export default function BillingPage() {
  const qc = useQueryClient()
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash')
  const [bill, setBill] = useState<BillRead | null>(null)
  const [settled, setSettled] = useState(false)

  const { data: tables = [], isLoading: tablesLoading } = useQuery<Table[]>({
    queryKey: ['tables'],
    queryFn: fetchTables,
    refetchInterval: 10000,
  })

  const { data: order, isLoading: orderLoading, error: orderError } = useQuery<OrderRead>({
    queryKey: ['order-for-table', selectedTable?.id],
    queryFn: () => getActiveOrderForTable(selectedTable!.id),
    enabled: !!selectedTable,
    retry: false,
  })

  const generateBillMutation = useMutation({
    mutationFn: async (orderId: string) => {
      // Check if bill already exists
      try {
        return await getBillByOrder(orderId)
      } catch {
        return await createBill({ order_id: orderId })
      }
    },
    onSuccess: (b) => setBill(b),
  })

  const settleMutation = useMutation({
    mutationFn: () => settlePayment(bill!.id, paymentMode),
    onSuccess: () => {
      setSettled(true)
      qc.invalidateQueries({ queryKey: ['tables'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  function selectTable(table: Table) {
    setSelectedTable(table)
    setBill(null)
    setSettled(false)
  }

  function reset() {
    setSelectedTable(null)
    setBill(null)
    setSettled(false)
    qc.invalidateQueries({ queryKey: ['tables'] })
  }

  const billRequestedTables = tables.filter((t) => t.status === 'bill_requested')
  const occupiedTables = tables.filter((t) => t.status === 'occupied')

  const activeItems = order?.items.filter((i) => !i.is_voided) ?? []
  const subtotal = activeItems.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const gstTotal = bill ? bill.cgst_amount + bill.sgst_amount + bill.igst_amount : Math.round(subtotal * 0.05)
  const grandTotal = bill ? bill.grand_total : subtotal + gstTotal

  return (
    <div className="min-h-screen">
      <TopBar title="Billing & Checkout" />

      <main className="p-10 max-w-7xl mx-auto">
        <div className="mb-10 flex justify-between items-end">
          <div>
            <h2 className="font-headline text-4xl font-bold text-primary tracking-tight">
              Billing & Checkout
            </h2>
            <p className="text-on-surface-variant mt-1 text-sm">
              {billRequestedTables.length} table{billRequestedTables.length !== 1 ? 's' : ''} awaiting bill
            </p>
          </div>
          {selectedTable && (
            <button
              onClick={reset}
              className="flex items-center gap-2 text-sm font-bold text-primary/60 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to tables
            </button>
          )}
        </div>

        {!selectedTable ? (
          /* ── Table selection ── */
          <div className="space-y-10">
            {billRequestedTables.length > 0 && (
              <section>
                <h3 className="font-bold text-sm uppercase tracking-widest text-on-surface-variant mb-4">
                  Bill Requested
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {billRequestedTables.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => selectTable(t)}
                      className="card p-5 flex flex-col items-center gap-3 hover:shadow-card-hover hover:border-primary border-2 border-transparent transition-all"
                    >
                      <span className="material-symbols-outlined text-3xl text-primary">table_restaurant</span>
                      <span className="font-headline text-xl font-bold text-primary">{t.table_number}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColor[t.status]}`}>
                        Bill Requested
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {occupiedTables.length > 0 && (
              <section>
                <h3 className="font-bold text-sm uppercase tracking-widest text-on-surface-variant mb-4">
                  Occupied Tables
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {occupiedTables.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => selectTable(t)}
                      className="card p-5 flex flex-col items-center gap-3 hover:shadow-card-hover hover:border-outline-variant border-2 border-transparent transition-all opacity-70"
                    >
                      <span className="material-symbols-outlined text-3xl text-primary/60">table_restaurant</span>
                      <span className="font-headline text-xl font-bold text-primary">{t.table_number}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColor[t.status]}`}>
                        Occupied
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {tablesLoading && (
              <p className="text-sm text-on-surface-variant animate-pulse">Loading tables…</p>
            )}

            {!tablesLoading && billRequestedTables.length === 0 && occupiedTables.length === 0 && (
              <div className="text-center py-20 text-on-surface-variant">
                <span className="material-symbols-outlined text-6xl block mb-4 opacity-30">receipt_long</span>
                <p className="font-bold text-lg">No pending bills</p>
                <p className="text-sm mt-1">Tables will appear here when customers request the bill.</p>
              </div>
            )}
          </div>
        ) : settled ? (
          /* ── Payment settled ── */
          <div className="text-center py-24">
            <span className="material-symbols-outlined text-7xl text-emerald-500 block mb-6">check_circle</span>
            <h3 className="font-headline text-3xl font-bold text-primary mb-2">Payment Settled</h3>
            <p className="text-on-surface-variant mb-2">
              {selectedTable.table_number} · Bill {bill?.bill_number}
            </p>
            <p className="font-bold text-2xl text-primary mb-8">₹{grandTotal.toFixed(2)}</p>
            <button onClick={reset} className="btn-primary px-8 py-3">
              Back to Tables
            </button>
          </div>
        ) : (
          /* ── Bill view ── */
          <div className="grid grid-cols-12 gap-10">
            {/* Left: Order items + payment */}
            <div className="col-span-12 lg:col-span-8 space-y-8">
              {/* Table header */}
              <div className="card p-6 flex items-center gap-6">
                <span className="material-symbols-outlined text-4xl text-primary">table_restaurant</span>
                <div>
                  <h3 className="font-headline text-2xl font-bold text-primary">{selectedTable.table_number}</h3>
                  <p className="text-on-surface-variant text-sm">
                    {orderLoading ? 'Loading order…' : `${activeItems.length} item${activeItems.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>

              {/* Order items */}
              {orderError ? (
                <div className="card p-8 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl block mb-3 opacity-30">receipt_long</span>
                  <p className="font-medium">No active order found for this table.</p>
                </div>
              ) : (
                <div className="card overflow-hidden">
                  <div className="px-6 py-4 bg-surface-container-low/50 border-b border-outline-variant/10 flex justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Order Items</h4>
                    {order && (
                      <span className="text-xs text-on-surface-variant">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {orderLoading ? (
                    <div className="p-8 text-center text-sm text-on-surface-variant animate-pulse">Loading…</div>
                  ) : (
                    <div className="divide-y divide-outline-variant/10">
                      {activeItems.map((item) => (
                        <div key={item.id} className="px-6 py-4 flex justify-between items-center">
                          <div>
                            <span className="font-bold text-primary text-sm">{item.menu_item.name}</span>
                            {item.variant && (
                              <span className="text-xs text-on-surface-variant ml-2">({item.variant.label})</span>
                            )}
                            {item.notes && (
                              <p className="text-xs text-on-surface-variant italic">{item.notes}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-primary">
                              ₹{(item.unit_price * item.quantity).toFixed(2)}
                            </p>
                            <p className="text-xs text-on-surface-variant">
                              {item.quantity} × ₹{item.unit_price}
                            </p>
                          </div>
                        </div>
                      ))}
                      {activeItems.length === 0 && !orderLoading && (
                        <p className="px-6 py-8 text-sm text-on-surface-variant text-center">No items</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Payment method */}
              {!orderError && order && (
                <section className="space-y-4">
                  <h4 className="font-headline text-xl font-bold text-primary">Payment Method</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {paymentOptions.map((opt) => (
                      <label key={opt.mode} className="relative cursor-pointer">
                        <input
                          type="radio"
                          name="payment"
                          className="sr-only peer"
                          checked={paymentMode === opt.mode}
                          onChange={() => setPaymentMode(opt.mode)}
                        />
                        <div className="p-5 rounded-xl bg-surface-container-low border-2 border-transparent peer-checked:border-primary peer-checked:bg-surface-container-lowest transition-all">
                          <span className="material-symbols-outlined text-3xl mb-2 block text-primary">{opt.icon}</span>
                          <p className="font-bold text-primary">{opt.label}</p>
                          <p className="text-xs text-on-surface-variant">{opt.sub}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Right: Receipt */}
            <div className="col-span-12 lg:col-span-4">
              <div className="sticky top-10 bg-surface-container-lowest rounded-xl shadow-modal overflow-hidden border border-outline-variant/10">
                <div className="bg-primary p-8 text-on-primary text-center">
                  <p className="text-xs uppercase tracking-[0.2em] opacity-70 mb-2 font-bold">Total Amount Due</p>
                  <h3 className="font-headline text-4xl font-bold tracking-tighter">
                    ₹{grandTotal.toFixed(2)}
                  </h3>
                  {bill && (
                    <p className="text-xs opacity-70 mt-2">{bill.bill_number}</p>
                  )}
                </div>

                <div className="p-8 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Subtotal</span>
                    <span className="font-bold text-primary">₹{subtotal.toFixed(2)}</span>
                  </div>
                  {bill ? (
                    <>
                      {bill.cgst_amount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-on-surface-variant">CGST</span>
                          <span className="font-bold text-primary">₹{bill.cgst_amount.toFixed(2)}</span>
                        </div>
                      )}
                      {bill.sgst_amount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-on-surface-variant">SGST</span>
                          <span className="font-bold text-primary">₹{bill.sgst_amount.toFixed(2)}</span>
                        </div>
                      )}
                      {bill.igst_amount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-on-surface-variant">IGST</span>
                          <span className="font-bold text-primary">₹{bill.igst_amount.toFixed(2)}</span>
                        </div>
                      )}
                      {bill.discount_amount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-on-surface-variant">Discount</span>
                          <span className="font-bold text-emerald-600">−₹{bill.discount_amount.toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">GST (est.)</span>
                      <span className="font-bold text-primary">₹{gstTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="pt-4 border-t border-dashed border-outline-variant/30">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs uppercase font-bold text-on-surface-variant tracking-widest">Grand Total</p>
                        <h4 className="font-headline text-3xl font-bold text-primary mt-1">
                          ₹{grandTotal.toFixed(2)}
                        </h4>
                      </div>
                      <span className="material-symbols-outlined text-4xl text-primary/10">receipt</span>
                    </div>
                  </div>
                </div>

                <div className="px-8 pb-8 space-y-3">
                  {!bill && order && (
                    <button
                      onClick={() => generateBillMutation.mutate(order.id)}
                      disabled={generateBillMutation.isPending || activeItems.length === 0}
                      className="w-full btn-primary py-4 flex items-center justify-center gap-2 disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined text-xl">receipt</span>
                      {generateBillMutation.isPending ? 'Generating…' : 'Generate Bill'}
                    </button>
                  )}
                  {bill && bill.payment_status === 'pending' && (
                    <button
                      onClick={() => settleMutation.mutate()}
                      disabled={settleMutation.isPending}
                      className="w-full btn-primary py-4 flex items-center justify-center gap-2 disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined text-xl">check_circle</span>
                      {settleMutation.isPending ? 'Processing…' : 'Settle Payment'}
                    </button>
                  )}
                  {bill && bill.payment_status === 'paid' && (
                    <button
                      onClick={() => window.open(`/api/v1/print/bill/${bill.id}`, '_blank')}
                      className="w-full py-3 flex items-center justify-center gap-2 border border-outline-variant/40 rounded-xl text-primary font-medium hover:bg-surface-container-low transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">print</span>
                      Print Bill
                    </button>
                  )}
                  {generateBillMutation.isError && (
                    <p className="text-xs text-error text-center">
                      {(generateBillMutation.error as any)?.response?.data?.detail ?? 'Failed to generate bill'}
                    </p>
                  )}
                  {settleMutation.isError && (
                    <p className="text-xs text-error text-center">
                      {(settleMutation.error as any)?.response?.data?.detail ?? 'Payment failed'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
