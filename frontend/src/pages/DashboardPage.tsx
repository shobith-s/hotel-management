import { useQuery } from '@tanstack/react-query'
import TopBar from '../components/shared/TopBar'
import { fetchTables, Table } from '../api/tables'
import { fetchRooms } from '../api/lodge'

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS: Record<string, { card: string; dot: string; label: string; nameColor: string; subColor: string }> = {
  available:      { card: 'bg-surface-container-lowest border-outline-variant/20 hover:border-outline-variant/50 hover:shadow-md', dot: 'bg-emerald-500', label: 'Available',      nameColor: 'text-primary',    subColor: 'text-on-surface-variant' },
  occupied:       { card: 'bg-primary border-primary/20',                                                                          dot: 'bg-amber-400',   label: 'Occupied',       nameColor: 'text-on-primary', subColor: 'text-on-primary/70'       },
  bill_requested: { card: 'bg-amber-50 border-amber-300',                                                                          dot: 'bg-amber-500',   label: 'Bill Requested', nameColor: 'text-amber-900',  subColor: 'text-amber-700'           },
  reserved:       { card: 'bg-surface-container border-outline-variant/30',                                                        dot: 'bg-secondary',   label: 'Reserved',       nameColor: 'text-primary',    subColor: 'text-on-surface-variant'  },
}

// ── Table card ─────────────────────────────────────────────────────────────────

function TableCard({ table }: { table: Table }) {
  const s = STATUS[table.status] ?? STATUS.available
  const occupied = table.status === 'occupied'

  return (
    <div
      className={`rounded-xl border-2 transition-all cursor-default flex flex-col justify-between ${s.card}`}
      style={{ padding: '12px 14px' }}
    >
      {/* Top row: table number + capacity badge */}
      <div className="flex items-center justify-between">
        <span className={`font-bold font-headline text-xl leading-none ${s.nameColor}`}>
          {table.table_number}
        </span>
        <span
          className={`text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
            occupied
              ? 'bg-on-primary/20 text-on-primary'
              : 'bg-outline-variant/20 text-on-surface-variant'
          }`}
        >
          {table.capacity}
        </span>
      </div>

      {/* Bottom row: status */}
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
        <span className={`text-xs font-bold uppercase tracking-wide leading-none ${s.subColor}`}>
          {s.label}
        </span>
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

  // Sort all tables by capacity descending, then by table number
  const sortedTables = [...tables].sort((a, b) =>
    b.capacity - a.capacity || a.table_number.localeCompare(b.table_number, undefined, { numeric: true })
  )

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar title="Sukhsagar" />

      <div className="flex-1 min-h-0 flex flex-col gap-4 pt-5 px-6 md:px-10 pb-5">

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
        <div className="flex-1 min-h-0 flex flex-col gap-3">

          {/* Header + legend */}
          <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
            <h3 className="text-xl md:text-2xl font-headline text-primary">Restaurant Tables</h3>
            <div className="flex items-center gap-3 md:gap-5 text-xs font-bold uppercase text-on-surface-variant flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Available</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />Occupied</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />Bill Req.</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-secondary" />Reserved</span>
              <span className="hidden md:flex items-center gap-1 ml-1 font-normal normal-case text-on-surface-variant/50">
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>sync</span>
                Auto-refreshes every 15 s
              </span>
            </div>
          </div>

          {/* Cards grid — fills all remaining vertical space */}
          {tablesLoading ? (
            <p className="text-sm text-on-surface-variant animate-pulse py-10 text-center">Loading tables…</p>
          ) : tables.length === 0 ? (
            <p className="text-sm text-on-surface-variant py-10 text-center">No tables configured yet.</p>
          ) : (
            <div
              className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              style={{ gridAutoRows: '1fr', gap: 10 }}
            >
              {sortedTables.map(t => <TableCard key={t.id} table={t} />)}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
