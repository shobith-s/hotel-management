import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import TopBar from '../components/shared/TopBar'
import { getRevenueSummary, type RevenueReport, type TopItem } from '../api/reports'

// ── Date helpers (same pattern as LodgePage) ──────────────────────────────────

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [yyyy, mm, dd] = value ? value.split('-') : ['', '', '']
  const hiddenRef = useRef<HTMLInputElement>(null)

  function handlePart(part: 'dd' | 'mm' | 'yyyy', raw: string) {
    const n = raw.replace(/\D/g, '')
    let newDd = dd, newMm = mm, newYyyy = yyyy
    if (part === 'dd')   newDd   = n.slice(0, 2)
    if (part === 'mm')   newMm   = n.slice(0, 2)
    if (part === 'yyyy') newYyyy = n.slice(0, 4)
    if (newYyyy.length === 4 && newMm.length <= 2 && newDd.length <= 2) {
      onChange(`${newYyyy}-${newMm.padStart(2, '0')}-${newDd.padStart(2, '0')}`)
    } else {
      onChange(`${newYyyy}-${newMm}-${newDd}`)
    }
  }

  return (
    <div className="flex items-center gap-0.5 border border-outline-variant/30 rounded-lg px-2 py-1.5 bg-surface-container-low focus-within:border-primary transition-colors">
      <input type="text" inputMode="numeric" placeholder="DD"
        value={dd} onChange={e => handlePart('dd', e.target.value)}
        className="w-7 text-center bg-transparent focus:outline-none text-sm font-medium text-primary" />
      <span className="text-on-surface-variant">/</span>
      <input type="text" inputMode="numeric" placeholder="MM"
        value={mm} onChange={e => handlePart('mm', e.target.value)}
        className="w-7 text-center bg-transparent focus:outline-none text-sm font-medium text-primary" />
      <span className="text-on-surface-variant">/</span>
      <input type="text" inputMode="numeric" placeholder="YYYY"
        value={yyyy} onChange={e => handlePart('yyyy', e.target.value)}
        className="w-12 text-center bg-transparent focus:outline-none text-sm font-medium text-primary" />
      <button
        type="button"
        onClick={() => hiddenRef.current?.showPicker?.()}
        className="ml-1 text-on-surface-variant hover:text-primary transition-colors"
      >
        <span className="material-symbols-outlined text-base">calendar_month</span>
      </button>
      <input
        ref={hiddenRef}
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-0 h-0 opacity-0 pointer-events-none absolute"
        tabIndex={-1}
      />
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color = 'text-primary' }: {
  icon: string; label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-card flex flex-col gap-2">
      <div className="flex items-center gap-2 text-on-surface-variant text-xs font-bold uppercase tracking-widest">
        <span className="material-symbols-outlined text-base">{icon}</span>
        {label}
      </div>
      <p className={`font-headline text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-on-surface-variant">{sub}</p>}
    </div>
  )
}

// ── Top item row ──────────────────────────────────────────────────────────────

function TopItemRow({ item, rank, maxRevenue }: { item: TopItem; rank: number; maxRevenue: number }) {
  const pct = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold text-on-surface-variant w-5 text-right">{rank}</span>
      <span className="flex-1 text-sm font-medium text-primary truncate">{item.name}</span>
      <span className="text-xs text-on-surface-variant w-16 text-right">{item.quantity_sold} sold</span>
      <div className="w-24 bg-surface-container-low rounded-full h-2">
        <div className="bg-secondary rounded-full h-2 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-primary w-24 text-right">₹{item.revenue.toLocaleString('en-IN')}</span>
    </div>
  )
}

// ── Payment mode row ──────────────────────────────────────────────────────────

const MODE_ICONS: Record<string, string> = {
  cash:          'payments',
  card:          'credit_card',
  upi:           'qr_code_2',
  complimentary: 'card_giftcard',
  credit:        'account_balance',
}

function PaymentRow({ mode, amount, total }: { mode: string; amount: number; total: number }) {
  const pct = total > 0 ? (amount / total) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-base text-on-surface-variant w-5">
        {MODE_ICONS[mode] ?? 'payments'}
      </span>
      <span className="capitalize text-sm font-medium text-primary w-28">{mode}</span>
      <div className="flex-1 bg-surface-container-low rounded-full h-2">
        <div
          className="bg-primary rounded-full h-2 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-bold text-primary w-24 text-right">₹{amount.toLocaleString('en-IN')}</span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

function todayStr() { return toDateStr(new Date()) }
function firstOfMonthStr() {
  const d = new Date()
  d.setDate(1)
  return toDateStr(d)
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(firstOfMonthStr())
  const [endDate,   setEndDate]   = useState(todayStr())

  const isValidRange = startDate.length === 10 && endDate.length === 10 && startDate <= endDate

  const { data, isLoading, isError, error } = useQuery<RevenueReport>({
    queryKey: ['reports', startDate, endDate],
    queryFn:  () => getRevenueSummary(startDate, endDate),
    enabled:  isValidRange,
  })

  const paymentTotal = data
    ? Object.values(data.payment_modes).reduce((s, v) => s + v, 0)
    : 0

  return (
    <div className="flex-1 overflow-y-auto bg-surface">
      <TopBar />
      <div className="p-10 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-headline text-4xl font-bold text-primary tracking-tight">Revenue Reports</h1>
          <p className="text-on-surface-variant mt-1 text-sm">Daily reconciliation and payment summary</p>
        </div>

        {/* Date range picker */}
        <div className="flex items-center gap-4 mb-10 bg-surface-container-lowest rounded-2xl p-5 shadow-card">
          <span className="material-symbols-outlined text-on-surface-variant">date_range</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-on-surface-variant font-medium">From</span>
            <DateInput value={startDate} onChange={setStartDate} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-on-surface-variant font-medium">To</span>
            <DateInput value={endDate} onChange={setEndDate} />
          </div>
          {!isValidRange && startDate.length === 10 && endDate.length === 10 && (
            <p className="text-xs text-error">End date must be on or after start date</p>
          )}
          {isLoading && (
            <span className="text-xs text-on-surface-variant animate-pulse ml-2">Loading…</span>
          )}
        </div>

        {isError && (
          <div className="rounded-2xl bg-error/10 border border-error/20 p-5 mb-8 text-sm text-error">
            {(error as any)?.response?.data?.detail ?? 'Failed to load report'}
          </div>
        )}

        {data && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon="account_balance_wallet"
                label="Total Revenue"
                value={`₹${data.total_revenue.toLocaleString('en-IN')}`}
                color="text-primary"
              />
              <StatCard
                icon="restaurant"
                label="Restaurant"
                value={`₹${data.restaurant_revenue.toLocaleString('en-IN')}`}
                sub={`${data.total_bills} bill${data.total_bills !== 1 ? 's' : ''} · avg ₹${data.avg_spend_per_bill.toLocaleString('en-IN')}`}
              />
              <StatCard
                icon="bed"
                label="Lodge"
                value={`₹${data.lodge_revenue.toLocaleString('en-IN')}`}
                sub={`${data.total_checkouts} checkout${data.total_checkouts !== 1 ? 's' : ''}`}
              />
              <StatCard
                icon="receipt_long"
                label="GST Collected"
                value={`₹${data.restaurant_gst.toLocaleString('en-IN')}`}
                sub="Restaurant GST"
                color="text-amber-600"
              />
            </div>

            {/* Second row: discount + void */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <StatCard
                icon="local_offer"
                label="Total Discounts"
                value={`₹${data.total_discount.toLocaleString('en-IN')}`}
                sub="Applied across all bills"
                color="text-secondary"
              />
              <StatCard
                icon="cancel"
                label="Voided Items"
                value={String(data.void_summary.count)}
                sub={`₹${data.void_summary.value.toLocaleString('en-IN')} lost revenue`}
                color="text-error"
              />
            </div>

            {/* Top 10 items + Payment mode side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Top 10 selling items */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-card">
                <h2 className="font-headline text-lg font-bold text-primary mb-5">Top Selling Items</h2>
                {data.top_items.length === 0 ? (
                  <p className="text-sm text-on-surface-variant text-center py-6">No sales data in this range</p>
                ) : (
                  <div className="space-y-4">
                    {data.top_items.map((item, i) => (
                      <TopItemRow
                        key={item.name}
                        item={item}
                        rank={i + 1}
                        maxRevenue={data.top_items[0]?.revenue ?? 1}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Payment mode breakdown */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-card">
                <h2 className="font-headline text-lg font-bold text-primary mb-5">Payment Mode Breakdown</h2>
                {paymentTotal === 0 ? (
                  <p className="text-sm text-on-surface-variant text-center py-6">No paid bills in this date range</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(data.payment_modes)
                      .sort(([, a], [, b]) => b - a)
                      .map(([mode, amount]) => (
                        <PaymentRow key={mode} mode={mode} amount={amount} total={paymentTotal} />
                      ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {!data && !isLoading && isValidRange && !isError && (
          <div className="text-center py-20 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl block opacity-30 mb-3">analytics</span>
            <p className="text-sm font-medium">Select a date range to view the report</p>
          </div>
        )}

        {!isValidRange && (
          <div className="text-center py-20 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl block opacity-30 mb-3">calendar_month</span>
            <p className="text-sm font-medium">Enter a valid date range above</p>
          </div>
        )}
      </div>
    </div>
  )
}
