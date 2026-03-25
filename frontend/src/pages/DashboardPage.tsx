import { useRef, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import TopBar from '../components/shared/TopBar'
import { fetchTables, updateTable, Table } from '../api/tables'
import { fetchRooms } from '../api/lodge'
import { useAuth } from '../context/AuthContext'

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  available:      { bg: 'bg-emerald-50 border-emerald-400',               dot: 'bg-emerald-500', label: 'Free',     text: 'text-emerald-800' },
  occupied:       { bg: 'bg-primary border-primary',                      dot: 'bg-amber-300',   label: 'Occupied', text: 'text-on-primary'  },
  bill_requested: { bg: 'bg-amber-50 border-amber-400',                   dot: 'bg-amber-500',   label: 'Bill',     text: 'text-amber-900'   },
  reserved:       { bg: 'bg-surface-container border-outline-variant/40', dot: 'bg-secondary',   label: 'Reserved', text: 'text-primary'     },
} as const

function defaultPos(index: number): { x: number; y: number } {
  const cols = 5
  return {
    x: 3 + (index % cols) * 18,
    y: 5 + Math.floor(index / cols) * 28,
  }
}

function getPos(
  table: Table,
  index: number,
  overrides: Record<string, { x: number; y: number }>,
): { x: number; y: number } {
  if (overrides[table.id]) return overrides[table.id]
  if (table.pos_x !== null && table.pos_y !== null) return { x: table.pos_x, y: table.pos_y }
  return defaultPos(index)
}

// ── Table tile ────────────────────────────────────────────────────────────────

function TableTile({
  table,
  pos,
  editMode,
  onPointerDown,
}: {
  table: Table
  pos: { x: number; y: number }
  editMode: boolean
  onPointerDown: (e: React.PointerEvent) => void
}) {
  const s = STATUS_CFG[table.status] ?? STATUS_CFG.available

  return (
    <div
      className={`absolute border-2 rounded-xl select-none ${s.bg} ${
        editMode
          ? 'cursor-grab active:cursor-grabbing shadow-lg ring-2 ring-primary/20'
          : 'cursor-default shadow-sm'
      }`}
      style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: 88, height: 72, touchAction: 'none' }}
      onPointerDown={editMode ? onPointerDown : undefined}
    >
      <div className="h-full flex flex-col items-center justify-center gap-1 px-2">
        <span className={`font-headline font-bold text-lg leading-none ${s.text}`}>
          {table.table_number}
        </span>
        <div className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wide leading-none ${s.text} opacity-80`}>
            {s.label}
          </span>
        </div>
        {editMode && (
          <span className="material-symbols-outlined text-[11px] opacity-25 mt-0.5">drag_pan</span>
        )}
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canvasRef = useRef<HTMLDivElement>(null)
  const isAdmin = user?.role === 'admin'

  const [editMode, setEditMode] = useState(false)
  const [overrides, setOverrides] = useState<Record<string, { x: number; y: number }>>({})
  const overridesRef = useRef(overrides)
  overridesRef.current = overrides

  const dragging = useRef<{ id: string; offsetXPx: number; offsetYPx: number } | null>(null)

  const { data: tables = [], isLoading: tablesLoading } = useQuery<Table[]>({
    queryKey: ['tables'],
    queryFn: fetchTables,
    refetchInterval: editMode ? false : 15000,
  })

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: fetchRooms,
    refetchInterval: editMode ? false : 15000,
  })

  const isLoading = tablesLoading || roomsLoading

  const sortedTables = [...tables].sort((a, b) =>
    a.table_number.localeCompare(b.table_number, undefined, { numeric: true }),
  )

  function handlePointerDown(e: React.PointerEvent, tableId: string) {
    if (!editMode || !canvasRef.current) return
    e.preventDefault()
    const table = tables.find(t => t.id === tableId)!
    const idx = sortedTables.findIndex(t => t.id === tableId)
    const pos = getPos(table, idx, overridesRef.current)
    const rect = canvasRef.current.getBoundingClientRect()
    dragging.current = {
      id: tableId,
      offsetXPx: e.clientX - rect.left - (pos.x / 100) * rect.width,
      offsetYPx: e.clientY - rect.top  - (pos.y / 100) * rect.height,
    }
  }

  useEffect(() => {
    if (!editMode) return

    function onMove(e: PointerEvent) {
      if (!dragging.current || !canvasRef.current) return
      const rect = canvasRef.current.getBoundingClientRect()
      const x = Math.max(1, Math.min(88, ((e.clientX - rect.left) - dragging.current.offsetXPx) / rect.width  * 100))
      const y = Math.max(1, Math.min(85, ((e.clientY - rect.top)  - dragging.current.offsetYPx) / rect.height * 100))
      const id = dragging.current.id
      setOverrides(prev => ({ ...prev, [id]: { x, y } }))
    }

    function onUp() { dragging.current = null }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [editMode])

  const saveMutation = useMutation({
    mutationFn: () =>
      Promise.all(
        Object.entries(overrides).map(([id, pos]) => updateTable(id, { pos_x: pos.x, pos_y: pos.y })),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      setEditMode(false)
      setOverrides({})
    },
  })

  function cancelEdit() {
    setEditMode(false)
    setOverrides({})
    dragging.current = null
  }

  const tablesOccupied  = tables.filter(t => t.status === 'occupied' || t.status === 'bill_requested').length
  const tablesAvailable = tables.filter(t => t.status === 'available').length
  const roomsOccupied   = rooms.filter((r: any) => r.status === 'occupied').length
  const roomsAvailable  = rooms.length - roomsOccupied

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar title="Sukhsagar" />

      <div className="flex-1 min-h-0 flex flex-col gap-4 pt-5 px-6 md:px-10 pb-5">

        {/* Stat cards */}
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

        {/* Floor plan */}
        <div className="flex-1 min-h-0 flex flex-col gap-3">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
            <div className="flex items-center gap-4 flex-wrap">
              <h3 className="text-xl md:text-2xl font-headline text-primary">Restaurant Tables</h3>
              <div className="flex items-center gap-3 text-xs font-bold uppercase text-on-surface-variant">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Free</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />Occupied</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />Bill</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-secondary" />Reserved</span>
              </div>
            </div>

            {isAdmin && (
              editMode ? (
                <div className="flex items-center gap-2">
                  <button onClick={cancelEdit} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
                  <button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || Object.keys(overrides).length === 0}
                    className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">save</span>
                    {saveMutation.isPending ? 'Saving…' : 'Save Layout'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-surface-container-high"
                >
                  <span className="material-symbols-outlined text-base">edit</span>
                  Edit Layout
                </button>
              )
            )}
          </div>

          {/* Canvas */}
          {tablesLoading ? (
            <p className="text-sm text-on-surface-variant animate-pulse py-10 text-center">Loading tables…</p>
          ) : tables.length === 0 ? (
            <p className="text-sm text-on-surface-variant py-10 text-center">No tables configured yet.</p>
          ) : (
            <div
              ref={canvasRef}
              className={`flex-1 min-h-0 relative rounded-2xl border-2 transition-colors ${
                editMode
                  ? 'bg-surface-container-low/60 border-primary/30 border-dashed'
                  : 'bg-surface-container-low/30 border-outline-variant/20'
              }`}
              style={{ minHeight: 280 }}
            >
              {editMode && (
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none opacity-20"
                  style={{
                    backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.4) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                  }}
                />
              )}

              {sortedTables.map((table, idx) => (
                <TableTile
                  key={table.id}
                  table={table}
                  pos={getPos(table, idx, overrides)}
                  editMode={editMode}
                  onPointerDown={e => handlePointerDown(e, table.id)}
                />
              ))}

              {editMode && (
                <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-on-surface-variant/40 pointer-events-none">
                  Drag tables to rearrange · Save Layout when done
                </p>
              )}

              {!editMode && (
                <p className="absolute bottom-3 right-4 text-xs text-on-surface-variant/30 pointer-events-none flex items-center gap-1">
                  <span className="material-symbols-outlined" style={{ fontSize: 11 }}>sync</span>
                  Auto-refreshes every 15 s
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
