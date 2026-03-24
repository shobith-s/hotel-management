import { useQuery } from '@tanstack/react-query'
import TopBar from '../components/shared/TopBar'
import { fetchTables, Table } from '../api/tables'
import { fetchRooms } from '../api/lodge'

const statusBadge: Record<string, string> = {
  available: 'badge-available',
  occupied: 'badge-occupied',
  bill_requested: 'badge-bill-requested',
  reserved: 'badge-reserved',
}

const statusLabel: Record<string, string> = {
  available: 'Available',
  occupied: 'Occupied',
  bill_requested: 'Bill Requested',
  reserved: 'Reserved',
}

export default function DashboardPage() {
  const { data: tables = [], isLoading } = useQuery<Table[]>({
    queryKey: ['tables'],
    queryFn: fetchTables,
    refetchInterval: 15000, // refresh every 15s
  })

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: fetchRooms,
    refetchInterval: 15000,
  })

  const occupiedCount = tables.filter((t) => t.status === 'occupied' || t.status === 'bill_requested').length
  const availableCount = tables.filter((t) => t.status === 'available').length
  const roomsOccupied = rooms.filter((r) => r.status === 'occupied').length
  const occupancyPct = rooms.length ? Math.round((roomsOccupied / rooms.length) * 100) : 0

  return (
    <div className="min-h-screen">
      <TopBar title="Sukhsagar" />

      <div className="p-10 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h2 className="font-headline text-4xl font-bold text-primary tracking-tight mb-2">
            Executive Dashboard
          </h2>
          <p className="text-on-surface-variant font-medium">
            Property performance overview for today.
          </p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Tables occupied */}
          <div className="card p-8 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-secondary-container/30 rounded-lg">
                <span className="material-symbols-outlined text-primary">table_restaurant</span>
              </div>
            </div>
            <h3 className="text-on-surface-variant text-sm font-bold uppercase tracking-widest mb-1">
              Tables Occupied
            </h3>
            <div className="font-headline text-3xl font-bold text-primary">
              {isLoading ? '—' : `${occupiedCount} / ${tables.length}`}
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
              <span className="material-symbols-outlined text-9xl">restaurant</span>
            </div>
          </div>

          {/* Lodge Occupancy */}
          <div className="bg-primary text-on-primary p-8 rounded-xl shadow-[0_20px_40px_rgba(54,31,26,0.1)] relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-primary-container rounded-lg">
                <span className="material-symbols-outlined text-primary-fixed">bed</span>
              </div>
            </div>
            <h3 className="text-on-primary-container text-sm font-bold uppercase tracking-widest mb-1">
              Lodge Occupancy
            </h3>
            <div className="flex items-end gap-2">
              <div className="font-headline text-5xl font-bold">{rooms.length - roomsOccupied}</div>
              <div className="text-on-primary-container text-sm mb-2">/ {rooms.length} available</div>
            </div>
            <div className="mt-6 w-full bg-primary-container h-1.5 rounded-full">
              <div className="bg-primary-fixed h-full rounded-full" style={{ width: `${100 - occupancyPct}%` }} />
            </div>
          </div>

          {/* Available tables */}
          <div className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/15 flex flex-col justify-between">
            <div>
              <div className="p-3 bg-surface-variant/50 w-fit rounded-lg mb-4">
                <span className="material-symbols-outlined text-primary">event_seat</span>
              </div>
              <h3 className="text-on-surface-variant text-sm font-bold uppercase tracking-widest mb-1">
                Tables Available
              </h3>
              <div className="font-headline text-3xl font-bold text-primary">
                {isLoading ? '—' : availableCount}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 text-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-sm">sync</span>
              <span>Auto-refreshes every 15 s</span>
            </div>
          </div>
        </div>

        {/* Tables */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-2xl font-bold text-primary">Restaurant Tables</h3>
          </div>

          {isLoading ? (
            <div className="card p-10 text-center text-on-surface-variant animate-pulse text-sm">
              Loading tables…
            </div>
          ) : tables.length === 0 ? (
            <div className="card p-10 text-center text-on-surface-variant text-sm">
              No tables configured yet. Add tables from the admin panel.
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low/50">
                    {['Table', 'Capacity', 'Status'].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {tables.map((t) => (
                    <tr key={t.id} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="px-6 py-5 font-bold text-primary">{t.table_number}</td>
                      <td className="px-6 py-5 text-on-surface-variant">{t.capacity} seats</td>
                      <td className="px-6 py-5">
                        <span className={statusBadge[t.status] ?? 'badge-available'}>
                          {statusLabel[t.status] ?? t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
