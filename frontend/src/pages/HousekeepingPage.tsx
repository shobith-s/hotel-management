import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchRooms, updateRoom, type Room } from '../api/lodge'
import { useAuth } from '../context/AuthContext'

// ── Status config ─────────────────────────────────────────────────────────────

type HKStatus = 'clean' | 'dirty' | 'in_progress'

const STATUS_NEXT: Record<HKStatus, HKStatus> = {
  dirty:       'in_progress',
  in_progress: 'clean',
  clean:       'dirty',
}

const STATUS_CONFIG: Record<HKStatus, { label: string; actionLabel: string; bg: string; text: string; dot: string; icon: string }> = {
  dirty:       { label: 'Dirty',       actionLabel: 'Start Cleaning', bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500',    icon: 'delete_sweep' },
  in_progress: { label: 'In Progress', actionLabel: 'Mark Clean',     bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500',  icon: 'cleaning_services' },
  clean:       { label: 'Clean',       actionLabel: 'Mark Dirty',     bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: 'check_circle' },
}

type Filter = 'all' | HKStatus

// ── Room card ─────────────────────────────────────────────────────────────────

function RoomCard({ room, onUpdate, isPending }: {
  room: Room
  onUpdate: (roomId: string, hk: HKStatus) => void
  isPending: boolean
}) {
  const hk = room.housekeeping as HKStatus
  const cfg = STATUS_CONFIG[hk]
  const next = STATUS_NEXT[hk]

  return (
    <div className={`rounded-2xl border-2 p-4 flex flex-col gap-3 transition-all ${
      hk === 'dirty' ? 'border-red-200' : hk === 'in_progress' ? 'border-amber-200' : 'border-emerald-200'
    } bg-white shadow-sm`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-headline text-2xl font-bold text-on-surface">
              {room.room_number}
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Floor {room.floor} · {room.room_type.name}
          </p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
          <span className="material-symbols-outlined text-sm">{cfg.icon}</span>
          {cfg.label}
        </div>
      </div>

      {/* Room occupancy badge */}
      <div className={`text-xs font-medium px-2 py-1 rounded-lg w-fit ${
        room.status === 'occupied' ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface-variant'
      }`}>
        {room.status === 'occupied' ? 'Guest In Room' : room.status === 'available' ? 'Vacant' : room.status}
      </div>

      {/* Action button */}
      <button
        onClick={() => onUpdate(room.id, next)}
        disabled={isPending}
        className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 ${
          hk === 'dirty'
            ? 'bg-amber-500 text-white'
            : hk === 'in_progress'
            ? 'bg-emerald-600 text-white'
            : 'bg-surface-container text-on-surface-variant'
        }`}
      >
        <span className="material-symbols-outlined text-base">
          {hk === 'dirty' ? 'play_arrow' : hk === 'in_progress' ? 'check' : 'refresh'}
        </span>
        {STATUS_CONFIG[next].label === 'Dirty' ? 'Reset to Dirty' : STATUS_CONFIG[hk].actionLabel}
      </button>
    </div>
  )
}

// ── Filter tab bar ────────────────────────────────────────────────────────────

function FilterBar({ filter, onChange, counts }: {
  filter: Filter
  onChange: (f: Filter) => void
  counts: Record<Filter, number>
}) {
  const tabs: { key: Filter; label: string }[] = [
    { key: 'all',         label: `All (${counts.all})` },
    { key: 'dirty',       label: `Dirty (${counts.dirty})` },
    { key: 'in_progress', label: `In Progress (${counts.in_progress})` },
    { key: 'clean',       label: `Clean (${counts.clean})` },
  ]

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${
            filter === key
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container text-on-surface-variant'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HousekeepingPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [filter, setFilter] = useState<Filter>('all')
  const [pendingId, setPendingId] = useState<string | null>(null)

  const { data: rooms = [], isLoading } = useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: fetchRooms,
    refetchInterval: 30_000,
  })

  const mutation = useMutation({
    mutationFn: ({ roomId, hk }: { roomId: string; hk: HKStatus }) =>
      updateRoom(roomId, { housekeeping: hk }),
    onMutate: ({ roomId }) => setPendingId(roomId),
    onSettled: () => setPendingId(null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  })

  const counts: Record<Filter, number> = {
    all:         rooms.length,
    dirty:       rooms.filter((r) => r.housekeeping === 'dirty').length,
    in_progress: rooms.filter((r) => r.housekeeping === 'in_progress').length,
    clean:       rooms.filter((r) => r.housekeeping === 'clean').length,
  }

  const filtered = filter === 'all' ? rooms : rooms.filter((r) => r.housekeeping === filter)

  // Group by floor
  const byFloor = filtered.reduce<Record<number, Room[]>>((acc, r) => {
    ;(acc[r.floor] ??= []).push(r)
    return acc
  }, {})
  const floors = Object.keys(byFloor).map(Number).sort((a, b) => a - b)

  return (
    <div className="min-h-screen bg-surface">
      {/* Mobile header */}
      <header className="sticky top-0 z-40 bg-surface border-b border-outline-variant/15 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-headline text-xl font-bold text-primary">Housekeeping</h1>
          <p className="text-xs text-on-surface-variant">
            {user?.name ?? 'Staff'} · {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
        </div>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['rooms'] })}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-xl">refresh</span>
        </button>
      </header>

      <div className="px-4 pt-4 pb-24">
        {/* Summary chips */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {(['dirty', 'in_progress', 'clean'] as HKStatus[]).map((s) => {
            const cfg = STATUS_CONFIG[s]
            return (
              <button
                key={s}
                onClick={() => setFilter(s === filter ? 'all' : s)}
                className={`rounded-2xl p-3 text-center transition-all ${cfg.bg} ${filter === s ? 'ring-2 ring-primary' : ''}`}
              >
                <p className={`font-headline text-2xl font-bold ${cfg.text}`}>{counts[s]}</p>
                <p className={`text-xs font-bold ${cfg.text} mt-0.5`}>{cfg.label}</p>
              </button>
            )
          })}
        </div>

        {/* Filter tabs */}
        <div className="mb-5">
          <FilterBar filter={filter} onChange={setFilter} counts={counts} />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl bg-surface-container-low h-36 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl block opacity-30 mb-3">cleaning_services</span>
            <p className="text-sm font-medium">No rooms in this category</p>
          </div>
        ) : (
          floors.map((floor) => (
            <div key={floor} className="mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 px-1">
                Floor {floor}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {byFloor[floor].map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    onUpdate={(roomId, hk) => mutation.mutate({ roomId, hk })}
                    isPending={pendingId === room.id}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
