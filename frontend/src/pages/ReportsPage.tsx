import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import TopBar from '../components/shared/TopBar'
import {
  getRevenueSummary, type RevenueReport, type TopItem,
  getOccupancyReport, type OccupancyReport, type DailyOccupancy, type RoomTypeBreakdown,
} from '../api/reports'

// ── Date helpers ──────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayStr() { return toDateStr(new Date()) }
function firstOfMonthStr() { const d = new Date(); d.setDate(1); return toDateStr(d) }

// ── CSV export ────────────────────────────────────────────────────────────────

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((v) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v)).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportRevenueCsv(data: RevenueReport) {
  const rows: (string | number)[][] = [
    ['REVENUE REPORT', data.start_date, 'to', data.end_date],
    [],
    ['Metric', 'Value'],
    ['Total Revenue', data.total_revenue],
    ['Restaurant Revenue', data.restaurant_revenue],
    ['Lodge Revenue', data.lodge_revenue],
    ['Restaurant GST', data.restaurant_gst],
    ['Total Bills', data.total_bills],
    ['Avg Spend per Bill', data.avg_spend_per_bill],
    ['Total Discounts', data.total_discount],
    ['Voided Items Count', data.void_summary.count],
    ['Voided Items Value', data.void_summary.value],
    [],
    ['PAYMENT MODE BREAKDOWN'],
    ['Mode', 'Amount'],
    ...Object.entries(data.payment_modes).map(([mode, amount]) => [mode, amount]),
    [],
    ['TOP SELLING ITEMS'],
    ['Item', 'Qty Sold', 'Revenue'],
    ...data.top_items.map((i) => [i.name, i.quantity_sold, i.revenue]),
  ]
  downloadCsv(`revenue-${data.start_date}-to-${data.end_date}.csv`, rows)
}

function exportOccupancyCsv(data: OccupancyReport) {
  const rows: (string | number)[][] = [
    ['OCCUPANCY REPORT', data.start_date, 'to', data.end_date],
    [],
    ['Metric', 'Value'],
    ['Total Rooms', data.total_rooms],
    ['Avg Occupancy %', data.avg_occupancy_pct],
    ['Occupied Nights', data.occupied_nights],
    ['Total Room Nights', data.total_room_nights],
    ['RevPAR', data.revpar],
    ['ADR', data.adr],
    ['Room Revenue', data.total_revenue],
    [],
    ['DAILY OCCUPANCY'],
    ['Date', 'Occupied Rooms', 'Occupancy %'],
    ...data.daily.map((d) => [d.date, d.occupied_rooms, d.occupancy_pct]),
    [],
    ['ROOM TYPE BREAKDOWN'],
    ['Room Type', 'Total Rooms', 'Occupied Nights', 'Revenue'],
    ...data.by_room_type.map((rt) => [rt.room_type, rt.total_rooms, rt.occupied_nights, rt.revenue]),
  ]
  downloadCsv(`occupancy-${data.start_date}-to-${data.end_date}.csv`, rows)
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
        <div className="bg-primary rounded-full h-2 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-primary w-24 text-right">₹{amount.toLocaleString('en-IN')}</span>
    </div>
  )
}

// ── Occupancy bar chart ───────────────────────────────────────────────────────

function OccupancyBar({ day }: { day: DailyOccupancy }) {
  const pct = day.occupancy_pct
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-primary' : 'bg-primary/40'
  const label = new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0" title={`${label}: ${pct}%`}>
      <span className="text-xs text-primary font-bold">{pct > 0 ? `${pct}%` : ''}</span>
      <div className="w-full bg-surface-container-low rounded-sm" style={{ height: 80 }}>
        <div
          className={`w-full rounded-sm transition-all duration-500 ${color}`}
          style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
        />
      </div>
      <span className="text-xs text-on-surface-variant truncate w-full text-center">{label}</span>
    </div>
  )
}

// ── Occupancy tab ─────────────────────────────────────────────────────────────

function OccupancyTab({ data }: { data: OccupancyReport }) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon="hotel"
          label="Avg Occupancy"
          value={`${data.avg_occupancy_pct}%`}
          sub={`${data.occupied_nights} of ${data.total_room_nights} room-nights`}
          color={data.avg_occupancy_pct >= 70 ? 'text-emerald-600' : 'text-primary'}
        />
        <StatCard icon="currency_rupee" label="RevPAR" value={`₹${data.revpar.toLocaleString('en-IN')}`} sub="Revenue per available room" />
        <StatCard icon="trending_up" label="ADR" value={`₹${data.adr.toLocaleString('en-IN')}`} sub="Avg daily rate (occupied)" />
        <StatCard icon="bed" label="Room Revenue" value={`₹${data.total_revenue.toLocaleString('en-IN')}`} sub={`${data.total_rooms} total rooms`} />
      </div>

      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-card mb-8">
        <h2 className="font-headline text-lg font-bold text-primary mb-5">Daily Occupancy</h2>
        {data.daily.length === 0 ? (
          <p className="text-sm text-on-surface-variant text-center py-6">No data</p>
        ) : data.daily.length <= 31 ? (
          <div className="flex gap-1 items-end overflow-x-auto pb-2">
            {data.daily.map((d) => <OccupancyBar key={d.date} day={d} />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container-low/50">
                  {['Date', 'Occupied', 'Occupancy %'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-on-surface-variant">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {data.daily.map((d) => (
                  <tr key={d.date} className="hover:bg-surface-container-low/30">
                    <td className="px-4 py-2 text-primary font-medium">{new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-2 text-on-surface-variant">{d.occupied_rooms} / {data.total_rooms}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-surface-container-low rounded-full h-2 max-w-24">
                          <div className={`h-2 rounded-full ${d.occupancy_pct >= 80 ? 'bg-emerald-500' : d.occupancy_pct >= 50 ? 'bg-primary' : 'bg-primary/40'}`} style={{ width: `${d.occupancy_pct}%` }} />
                        </div>
                        <span className="font-bold text-primary w-10">{d.occupancy_pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data.by_room_type.length > 0 && (
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-card">
          <h2 className="font-headline text-lg font-bold text-primary mb-5">Room Type Breakdown</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container-low/50">
                {['Room Type', 'Total Rooms', 'Occupied Nights', 'Occupancy %', 'Revenue'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-on-surface-variant">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {data.by_room_type.map((rt: RoomTypeBreakdown) => {
                const maxNights = rt.total_rooms * data.daily.length
                const occ = maxNights > 0 ? Math.round(rt.occupied_nights / maxNights * 100) : 0
                return (
                  <tr key={rt.room_type} className="hover:bg-surface-container-low/30">
                    <td className="px-4 py-3 font-bold text-primary">{rt.room_type}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{rt.total_rooms}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{rt.occupied_nights}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${occ >= 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-container text-on-surface-variant'}`}>
                        {occ}%
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-primary">₹{rt.revenue.toLocaleString('en-IN')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// ── Date range controls ───────────────────────────────────────────────────────

type Preset = { label: string; start: string; end: string }

function getPresets(): Preset[] {
  const today = new Date()
  const todayS = toDateStr(today)

  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)

  return [
    { label: 'Today', start: todayS, end: todayS },
    { label: 'This Week', start: toDateStr(weekStart), end: todayS },
    { label: 'This Month', start: toDateStr(monthStart), end: todayS },
    { label: 'Last Month', start: toDateStr(lastMonthStart), end: toDateStr(lastMonthEnd) },
  ]
}

function DateRangeControls({
  startDate, endDate, onStartChange, onEndChange,
}: {
  startDate: string; endDate: string
  onStartChange: (v: string) => void; onEndChange: (v: string) => void
}) {
  const presets = getPresets()
  const activePreset = presets.find((p) => p.start === startDate && p.end === endDate)?.label ?? null

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Preset pills */}
      <div className="flex gap-1.5">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => { onStartChange(p.start); onEndChange(p.end) }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activePreset === p.label
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Date inputs */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-on-surface-variant font-medium">From</span>
        <input
          type="date"
          value={startDate}
          max={endDate || todayStr()}
          onChange={(e) => onStartChange(e.target.value)}
          className="bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-primary transition-colors"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-on-surface-variant font-medium">To</span>
        <input
          type="date"
          value={endDate}
          min={startDate}
          max={todayStr()}
          onChange={(e) => onEndChange(e.target.value)}
          className="bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-primary transition-colors"
        />
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [tab, setTab]               = useState<'revenue' | 'occupancy'>('revenue')
  const [startDate, setStartDate]   = useState(firstOfMonthStr())
  const [endDate, setEndDate]       = useState(todayStr())

  const isValidRange = startDate.length === 10 && endDate.length === 10 && startDate <= endDate

  const { data: revenueData, isLoading: revLoading, isError: revError, error: revErr } = useQuery<RevenueReport>({
    queryKey:  ['reports', 'revenue', startDate, endDate],
    queryFn:   () => getRevenueSummary(startDate, endDate),
    enabled:   isValidRange && tab === 'revenue',
  })

  const { data: occData, isLoading: occLoading, isError: occError, error: occErr } = useQuery<OccupancyReport>({
    queryKey:  ['reports', 'occupancy', startDate, endDate],
    queryFn:   () => getOccupancyReport(startDate, endDate),
    enabled:   isValidRange && tab === 'occupancy',
  })

  const isLoading = tab === 'revenue' ? revLoading : occLoading
  const isError   = tab === 'revenue' ? revError   : occError
  const error     = tab === 'revenue' ? revErr     : occErr

  const paymentTotal = revenueData
    ? Object.values(revenueData.payment_modes).reduce((s, v) => s + v, 0)
    : 0

  const canExport = tab === 'revenue' ? !!revenueData : !!occData

  function handleExport() {
    if (tab === 'revenue' && revenueData) exportRevenueCsv(revenueData)
    else if (tab === 'occupancy' && occData) exportOccupancyCsv(occData)
  }

  return (
    <div className="min-h-screen">
      <TopBar title="Reports" />
      <div className="pt-6 px-10 pb-16">

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          {/* Tabs */}
          <div className="flex rounded-full overflow-hidden border border-outline-variant/20 text-sm w-fit">
            {([['revenue', 'Revenue'], ['occupancy', 'Occupancy']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-6 py-2.5 font-bold transition-all ${tab === key ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <DateRangeControls
              startDate={startDate}
              endDate={endDate}
              onStartChange={setStartDate}
              onEndChange={setEndDate}
            />

            {isLoading && (
              <span className="text-xs text-on-surface-variant animate-pulse">Loading…</span>
            )}

            {/* Export button */}
            <button
              onClick={handleExport}
              disabled={!canExport}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-outline-variant/30 text-sm font-medium text-primary hover:bg-surface-container-low transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <span className="material-symbols-outlined text-base">download</span>
              Export CSV
            </button>
          </div>
        </div>

        {isError && (
          <div className="rounded-2xl bg-error/10 border border-error/20 p-5 mb-8 text-sm text-error">
            {(error as any)?.response?.data?.detail ?? 'Failed to load report'}
          </div>
        )}

        {/* Revenue tab */}
        {tab === 'revenue' && revenueData && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <StatCard icon="account_balance_wallet" label="Total Revenue" value={`₹${revenueData.total_revenue.toLocaleString('en-IN')}`} color="text-primary" />
              <StatCard icon="restaurant" label="Restaurant" value={`₹${revenueData.restaurant_revenue.toLocaleString('en-IN')}`} sub={`${revenueData.total_bills} bill${revenueData.total_bills !== 1 ? 's' : ''} · avg ₹${revenueData.avg_spend_per_bill.toLocaleString('en-IN')}`} />
              <StatCard icon="bed" label="Lodge" value={`₹${revenueData.lodge_revenue.toLocaleString('en-IN')}`} sub={`${revenueData.total_checkouts} checkout${revenueData.total_checkouts !== 1 ? 's' : ''}`} />
              <StatCard icon="receipt_long" label="GST Collected" value={`₹${revenueData.restaurant_gst.toLocaleString('en-IN')}`} sub="Restaurant GST" color="text-amber-600" />
              <StatCard icon="local_offer" label="Total Discounts" value={`₹${revenueData.total_discount.toLocaleString('en-IN')}`} sub="Applied across all bills" color="text-secondary" />
              <StatCard icon="cancel" label="Voided Items" value={String(revenueData.void_summary.count)} sub={`₹${revenueData.void_summary.value.toLocaleString('en-IN')} lost revenue`} color="text-error" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-card">
                <h2 className="font-headline text-lg font-bold text-primary mb-5">Top Selling Items</h2>
                {revenueData.top_items.length === 0 ? (
                  <p className="text-sm text-on-surface-variant text-center py-6">No sales data in this range</p>
                ) : (
                  <div className="space-y-4">
                    {revenueData.top_items.map((item, i) => (
                      <TopItemRow key={item.name} item={item} rank={i + 1} maxRevenue={revenueData.top_items[0]?.revenue ?? 1} />
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-card">
                <h2 className="font-headline text-lg font-bold text-primary mb-5">Payment Mode Breakdown</h2>
                {paymentTotal === 0 ? (
                  <p className="text-sm text-on-surface-variant text-center py-6">No paid bills in this date range</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(revenueData.payment_modes).sort(([, a], [, b]) => b - a).map(([mode, amount]) => (
                      <PaymentRow key={mode} mode={mode} amount={amount} total={paymentTotal} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Occupancy tab */}
        {tab === 'occupancy' && occData && <OccupancyTab data={occData} />}

        {/* Empty / invalid states */}
        {!isLoading && !isError && isValidRange && ((tab === 'revenue' && !revenueData) || (tab === 'occupancy' && !occData)) && (
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
