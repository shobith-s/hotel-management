import { useQuery } from '@tanstack/react-query'
import TopBar from '../components/shared/TopBar'
import { fetchTables, Table } from '../api/tables'
import { fetchRooms } from '../api/lodge'

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS: Record<string, { card: string; dot: string; label: string; name: string; sub: string }> = {
  available:      { card: 'bg-surface-container-lowest border-outline-variant/20 hover:border-outline-variant/50 hover:shadow-md', dot: 'bg-emerald-500', label: 'Available',      name: 'text-primary',     sub: 'text-on-surface-variant' },
  occupied:       { card: 'bg-primary border-primary/20',                                                                          dot: 'bg-amber-400',   label: 'Occupied',       name: 'text-on-primary',  sub: 'text-on-primary/70'     },
  bill_requested: { card: 'bg-amber-50 border-amber-300',                                                                          dot: 'bg-amber-500',   label: 'Bill Requested', name: 'text-amber-900',   sub: 'text-amber-700'         },
  reserved:       { card: 'bg-surface-container border-outline-variant/30',                                                        dot: 'bg-secondary',   label: 'Reserved',       name: 'text-primary',     sub: 'text-on-surface-variant' },
}

// ── Span mapping ───────────────────────────────────────────────────────────────
// Desktop lg (6-col): 2-seat=1×1  4-seat=2×1  6-seat=2×2  8-seat=3×2
// Tablet  md (4-col): 2-seat=1×1  4-seat=2×1  6-seat=2×2  8-seat=2×2
// Mobile     (2-col): 2-seat=1×1  4-seat=2×1  6-seat=2×1  8-seat=2×1

function span(cap: number): string {
  if (cap >= 8) return 'col-span-2 row-span-1 md:row-span-2 lg:col-span-3 lg:row-span-2'
  if (cap >= 6) return 'col-span-2 row-span-1 md:row-span-2 lg:row-span-2'
  if (cap >= 4) return 'col-span-2 row-span-1'
  return 'col-span-1 row-span-1'
}

// ── Table card ─────────────────────────────────────────────────────────────────

function TableCard({ table }: { table: Table }) {
  const s = STATUS[table.status] ?? STATUS.available
  return (
    <div className={`${span(table.capacity)} rounded-xl border-2 transition-all p-3 lg:p-4 flex flex-col justify-between ${s.card}`}>
      <div className="flex justify-between items-start">
        <span className={`font-bold font-headline text-sm lg:text-base leading-none ${s.name}`}>
          {table.table_number}
        </span>
        <span className={`w-2.5 h-2.5 rounded-full mt-0.5 shrink-0 ${s.dot}`} />
      </div>
      <div>
        <p className={`text-xs font-medium leading-snug ${s.sub}`}>{table.capacity} seats</p>
        <p className={`text-xs font-bold uppercase tracking-wide leading-snug ${s.sub}`}>{s.label}</p>
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: tables = [], isLoading: tablesLoading } = useQuery<Table[]>({
    queryKey: ['tables'],
    queryFn: fetchTables,
    refetchInterval: 15000,
  })

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: fetchRooms,
    refetchInterval: 15000,
  })

  const isLoading = tablesLoading || roomsLoading

  const tablesOccupied  = tables.filter(t => t.status === 'occupied' || t.status === 'bill_requested').length
  const tablesAvailable = tables.filter(t => t.status === 'available').length
  const roomsOccupied   = rooms.filter((r: any) => r.status === 'occupied').length
  const roomsAvailable  = rooms.length - roomsOccupied

  // Sort capacity-descending then table number — guarantees perfect dense packing:
  // big items first create exactly-shaped gaps that smaller items backfill with zero waste.
  const sorted = [...tables].sort((a, b) => {
    if (b.capacity !== a.capacity) return b.capacity - a.capacity
    return a.table_number.localeCompare(b.table_number, undefined, { numeric: true })
  })

  return (
    <div className="flex flex-col min-h-screen lg:h-screen lg:overflow-hidden">
      <TopBar title="Sukhsagar" />

      <div className="flex-1 flex flex-col pt-5 px-6 md:px-10 pb-5 gap-4 min-h-0">

        {/* ── Stat cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
          {[
            { label: 'Tables Occupied',  value: `${tablesOccupied} / ${tables.length}`, icon: 'table_restaurant', color: 'text-primary'     },
            { label: 'Tables Available', value: String(tablesAvailable),                 icon: 'event_seat',       color: 'text-emerald-500' },
            { label: 'Rooms Occupied',   value: String(roomsOccupied),                   icon: 'bed',              color: 'text-primary'     },
            { label: 'Rooms Available',  value: String(roomsAvailable),                  icon: 'check_circle',     color: 'text-emerald-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-surface-container-low p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold mb-0.5 leading-tight">{stat.label}</p>
                <h3 className="text-2xl md:text-3xl font-headline text-primary leading-none">{isLoading ? '—' : stat.value}</h3>
              </div>
              <span className={`material-symbols-outlined text-3xl md:text-4xl opacity-40 ${stat.color}`}>{stat.icon}</span>
            </div>
          ))}
        </div>

        {/* ── Restaurant tables ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">

          {/* Header + legend */}
          <div className="flex items-center justify-between shrink-0 flex-wrap gap-2">
            <h3 className="text-xl md:text-2xl font-headline text-primary">Restaurant Tables</h3>
            <div className="flex items-center gap-3 md:gap-5 text-xs font-bold uppercase text-on-surface-variant flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Available</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />Occupied</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />Bill Req.</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-secondary" />Reserved</span>
              <span className="hidden lg:flex items-center gap-1 ml-2 font-normal normal-case text-on-surface-variant/50">
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>sync</span>
                Auto-refreshes every 15 s
              </span>
            </div>
          </div>

          {/* Bento grid */}
          {tablesLoading ? (
            <div className="flex-1 flex items-center justify-center text-sm text-on-surface-variant animate-pulse">
              Loading tables…
            </div>
          ) : tables.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-on-surface-variant">
              No tables configured yet.
            </div>
          ) : (
            <div
              className="flex-1 min-h-0 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 [grid-auto-flow:dense]"
              style={{ gridAutoRows: 'minmax(56px, 1fr)' }}
            >
              {sorted.map(t => <TableCard key={t.id} table={t} />)}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
