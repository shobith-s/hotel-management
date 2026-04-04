import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import TopBar from '../components/shared/TopBar'
import { fetchAuditLogs, type AuditAction } from '../api/audit'

const ACTION_LABELS: Record<AuditAction, { label: string; color: string }> = {
  add:    { label: 'Added',    color: 'bg-emerald-100 text-emerald-700' },
  modify: { label: 'Modified', color: 'bg-blue-100 text-blue-700'       },
  void:   { label: 'Voided',   color: 'bg-red-100 text-red-700'         },
  cancel: { label: 'Cancelled',color: 'bg-amber-100 text-amber-700'     },
}

function fmt(dt: string) {
  const d = new Date(dt)
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export default function AuditLogPage() {
  const [start, setStart] = useState(daysAgo(7))
  const [end, setEnd]     = useState(today())
  const [action, setAction] = useState<AuditAction | ''>('')

  const { data: logs = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['audit-logs', start, end, action],
    queryFn: () => fetchAuditLogs({ start, end, action: action || undefined }),
  })

  return (
    <div className="min-h-screen">
      <TopBar title="Audit Log" />

      <main className="p-10 max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="font-headline text-4xl font-bold text-primary tracking-tight">Audit Log</h2>
          <p className="text-on-surface-variant mt-1 text-sm">Track voided items and cancelled orders</p>
        </div>

        {/* Filters */}
        <div className="bg-surface-container-low rounded-2xl p-5 mb-6 flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">From</label>
            <input
              type="date"
              className="input"
              value={start}
              max={end}
              onChange={e => setStart(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">To</label>
            <input
              type="date"
              className="input"
              value={end}
              min={start}
              max={today()}
              onChange={e => setEnd(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Action</label>
            <select
              className="input"
              value={action}
              onChange={e => setAction(e.target.value as AuditAction | '')}
            >
              <option value="">All actions</option>
              <option value="void">Voided</option>
              <option value="cancel">Cancelled</option>
              <option value="add">Added</option>
              <option value="modify">Modified</option>
            </select>
          </div>
          <button
            onClick={() => refetch()}
            className="btn-primary px-6 py-2.5"
          >
            Apply
          </button>
          <span className="ml-auto text-xs text-on-surface-variant self-end pb-1">
            {isLoading ? <span className="animate-pulse">—</span> : `${logs.length} record${logs.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Table */}
        {isError ? (
          <p className="text-sm text-error text-center py-12">Failed to load audit logs.</p>
        ) : isLoading ? (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden">
            <div className="divide-y divide-outline-variant/10">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-4 px-5 py-4">
                  <div className="animate-pulse bg-surface-container-high rounded h-3 w-28 flex-shrink-0" />
                  <div className="animate-pulse bg-surface-container-high rounded h-3 w-16 flex-shrink-0" />
                  <div className="animate-pulse bg-surface-container-high rounded h-3 flex-1" />
                  <div className="animate-pulse bg-surface-container-high rounded h-3 w-20 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 text-on-surface-variant">
            <span className="material-symbols-outlined text-6xl block mb-4 opacity-30">manage_search</span>
            <p className="font-bold text-lg">No records found</p>
            <p className="text-sm mt-1">Try adjusting the date range or action filter.</p>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 px-6 py-3 bg-surface-container-low/60 border-b border-outline-variant/10">
              <span className="col-span-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Time</span>
              <span className="col-span-1 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Table</span>
              <span className="col-span-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Action</span>
              <span className="col-span-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Item</span>
              <span className="col-span-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">By</span>
              <span className="col-span-1 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Reason</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-outline-variant/10">
              {logs.map(log => {
                const a = ACTION_LABELS[log.action] ?? { label: log.action, color: 'bg-surface-container text-on-surface-variant' }
                return (
                  <div key={log.id} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-surface-container-low/40 transition-colors">
                    <span className="col-span-3 text-xs text-on-surface-variant">{fmt(log.created_at)}</span>
                    <span className="col-span-1 text-sm font-bold text-primary">{log.table_number}</span>
                    <span className="col-span-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${a.color}`}>{a.label}</span>
                    </span>
                    <span className="col-span-3 text-sm text-primary">{log.item_name ?? '—'}</span>
                    <span className="col-span-2 text-sm text-on-surface-variant">{log.performed_by_name}</span>
                    <span className="col-span-1 text-xs text-on-surface-variant truncate" title={log.reason ?? ''}>{log.reason ?? '—'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
