import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import TopBar from '../components/shared/TopBar'
import { listOrders, markItemServed, type OrderRead } from '../api/orders'
import { fetchTables, type Table } from '../api/tables'

type LocalStatus = 'new' | 'in_prep' | 'ready'

const headerStyle: Record<LocalStatus, string> = {
  in_prep: 'bg-secondary-container',
  new: 'bg-tertiary-fixed',
  ready: 'bg-surface-container-high opacity-75',
}

const dotStyle: Record<LocalStatus, string> = {
  in_prep: 'bg-tertiary-container text-white',
  new: 'bg-tertiary-container text-white',
  ready: 'bg-on-surface-variant text-white',
}

function useElapsed(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime()
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function OrderCard({
  order,
  tableNumber,
  onAdvance,
}: {
  order: OrderRead
  tableNumber: string
  onAdvance: (order: OrderRead, status: LocalStatus) => void
}) {
  const [localStatus, setLocalStatus] = useState<LocalStatus>('new')
  const elapsed = useElapsed(order.created_at)
  const activeItems = order.items.filter((i) => !i.is_voided)

  function advance() {
    if (localStatus === 'new') {
      setLocalStatus('in_prep')
    } else if (localStatus === 'in_prep') {
      setLocalStatus('ready')
      onAdvance(order, 'ready')
    } else {
      onAdvance(order, 'ready')
    }
  }

  return (
    <div
      className={`bg-surface-container-lowest rounded-xl flex flex-col shadow-card overflow-hidden ${
        localStatus === 'ready' ? 'border-2 border-primary/20' : ''
      }`}
    >
      {/* Card Header */}
      <div className={`${headerStyle[localStatus]} p-6 flex justify-between items-start`}>
        <div>
          <span className="font-label font-bold text-sm tracking-widest uppercase text-on-surface-variant">
            #{order.id.slice(0, 6).toUpperCase()}
          </span>
          <h3 className="font-headline text-5xl font-extrabold text-primary mt-1">
            {tableNumber}
          </h3>
        </div>
        <div className="text-right">
          <div className={`flex items-center justify-end font-bold text-xl gap-1 ${
            localStatus === 'ready' ? 'text-secondary' : localStatus === 'in_prep' ? 'text-error' : 'text-primary'
          }`}>
            <span className="material-symbols-outlined">schedule</span>
            <span>{elapsed}</span>
          </div>
          <p className="text-on-surface-variant text-xs mt-1">
            {localStatus === 'new' ? 'New Order' : localStatus === 'in_prep' ? 'In Preparation' : 'Awaiting Service'}
          </p>
        </div>
      </div>

      {/* Items */}
      <div className={`p-8 flex-grow space-y-4 ${localStatus === 'ready' ? 'opacity-75' : ''}`}>
        {activeItems.map((item) => (
          <div
            key={item.id}
            className="flex justify-between items-center border-b border-outline-variant/15 pb-4 last:border-0 last:pb-0"
          >
            <div className="flex gap-4 items-center">
              <span className={`${dotStyle[localStatus]} w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm`}>
                {item.quantity}
              </span>
              <div>
                <span className={`text-lg font-medium text-primary ${localStatus === 'ready' ? 'line-through decoration-primary/30' : ''}`}>
                  {item.menu_item.name}
                </span>
                {item.variant && (
                  <span className="text-xs text-on-surface-variant ml-2">({item.variant.label})</span>
                )}
              </div>
            </div>
            {item.notes && (
              <span className="text-on-surface-variant font-medium italic text-sm">{item.notes}</span>
            )}
          </div>
        ))}
        {activeItems.length === 0 && (
          <p className="text-sm text-on-surface-variant text-center">No items</p>
        )}
      </div>

      {/* Action Button */}
      <div className="p-8 pt-0">
        {localStatus === 'new' && (
          <button
            onClick={advance}
            className="w-full py-4 bg-surface-container-high text-primary rounded-full font-bold flex items-center justify-center gap-2 hover:bg-surface-container transition-all"
          >
            <span className="material-symbols-outlined">play_arrow</span>
            Start Prep
          </button>
        )}
        {localStatus === 'in_prep' && (
          <button
            onClick={advance}
            className="w-full py-4 bg-primary text-white rounded-full font-bold flex items-center justify-center gap-2 shadow-md hover:bg-primary-container transition-all"
          >
            <span className="material-symbols-outlined">check_circle</span>
            Mark Ready
          </button>
        )}
        {localStatus === 'ready' && (
          <button
            onClick={advance}
            className="w-full py-4 bg-secondary text-white rounded-full font-bold flex items-center justify-center gap-2 shadow-md hover:bg-secondary-container hover:text-on-secondary-container transition-all"
          >
            <span className="material-symbols-outlined">restaurant</span>
            Mark Served
          </button>
        )}
      </div>
    </div>
  )
}

export default function KDSPage() {
  const qc = useQueryClient()
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  const { data: orders = [], isLoading, dataUpdatedAt } = useQuery<OrderRead[]>({
    queryKey: ['orders', 'open', 'unserved'],
    queryFn: () => listOrders('open', true),
    refetchInterval: 5000,
  })

  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ['tables'],
    queryFn: fetchTables,
    refetchInterval: 10000,
  })

  const markServedMutation = useMutation({
    mutationFn: async (order: OrderRead) => {
      const activeItems = order.items.filter((i) => !i.is_voided && !i.is_served)
      await Promise.all(activeItems.map((item) => markItemServed(order.id, item.id)))
      return order.id
    },
    onSuccess: (orderId) => {
      setDismissedIds((prev) => new Set([...prev, orderId]))
      qc.invalidateQueries({ queryKey: ['orders', 'open', 'unserved'] })
    },
  })

  function handleAdvance(order: OrderRead, status: LocalStatus) {
    if (status === 'ready') {
      markServedMutation.mutate(order)
    } else {
      setDismissedIds((prev) => new Set([...prev, order.id]))
      qc.invalidateQueries({ queryKey: ['orders', 'open'] })
    }
  }

  const tableMap: Record<string, string> = {}
  tables.forEach((t) => { tableMap[t.id] = t.table_number })

  const visibleOrders = orders.filter((o) => !dismissedIds.has(o.id))

  const lastUpdated = new Date(dataUpdatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="min-h-screen">
      <TopBar title="Kitchen Display" />

      <main className="p-10">
        {/* Header */}
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="font-headline text-4xl font-bold tracking-tight text-primary">
              Kitchen Display
            </h2>
            <p className="text-on-surface-variant mt-2">
              {visibleOrders.length} active order{visibleOrders.length !== 1 ? 's' : ''} · auto-refreshes every 5s
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="bg-surface-container text-primary px-6 py-3 rounded-full flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">update</span>
              <span className="font-bold text-sm">{lastUpdated}</span>
            </div>
            <div className="bg-primary text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-lg">
              <span className="material-symbols-outlined text-lg">sync</span>
              <span className="font-bold">Live</span>
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-20 text-on-surface-variant animate-pulse">
            <span className="material-symbols-outlined text-5xl block mb-3">restaurant</span>
            <p>Loading orders…</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && visibleOrders.length === 0 && (
          <div className="text-center py-20 text-on-surface-variant">
            <span className="material-symbols-outlined text-6xl block mb-4 opacity-30">done_all</span>
            <p className="font-bold text-lg">All clear! No active orders.</p>
            <p className="text-sm mt-1">New orders will appear here automatically.</p>
          </div>
        )}

        {/* KDS Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-10">
          {visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              tableNumber={tableMap[order.table_id] ?? 'Table ?'}
              onAdvance={handleAdvance}
            />
          ))}
        </div>
      </main>
    </div>
  )
}

