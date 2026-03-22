import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import TopBar from '../components/shared/TopBar'
import { fetchRooms, fetchRoomTypes, Room } from '../api/lodge'

const hkBadge: Record<string, string> = {
  clean: 'bg-emerald-100 text-emerald-700',
  dirty: 'bg-amber-100 text-amber-700',
  in_service: 'bg-rose-100 text-rose-700',
}
const hkLabel: Record<string, string> = {
  clean: 'Clean',
  dirty: 'Dirty',
  in_service: 'Service',
}

function RoomCard({ room }: { room: Room }) {
  const isOccupied = room.status === 'occupied'
  return (
    <div className={`p-5 rounded-xl cursor-pointer transition-all ${
      isOccupied
        ? 'bg-primary border-2 border-primary/20 shadow-inner'
        : 'bg-surface-container-lowest border border-outline-variant/15 hover:shadow-xl'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <span className={`text-xl font-bold font-headline ${isOccupied ? 'text-on-primary' : 'text-primary'}`}>
          {room.room_number}
        </span>
        {isOccupied ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary-container text-on-primary-container">
            Occupied
          </span>
        ) : (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${hkBadge[room.housekeeping] ?? 'bg-surface-variant text-on-surface-variant'}`}>
            {hkLabel[room.housekeeping] ?? room.housekeeping}
          </span>
        )}
      </div>
      <p className={`text-xs ${isOccupied ? 'text-on-primary/70' : 'text-on-surface-variant'}`}>
        {room.room_type.name}
      </p>
      <p className={`text-xs mt-1 font-medium ${isOccupied ? 'text-on-primary/60' : 'text-on-surface-variant/60'}`}>
        Floor {room.floor} · ₹{room.room_type.base_rate}/night
      </p>
    </div>
  )
}

export default function LodgePage() {
  const [acUsed, setAcUsed] = useState(true)

  const { data: rooms = [], isLoading } = useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: fetchRooms,
    refetchInterval: 30000,
  })

  const { data: roomTypes = [] } = useQuery({
    queryKey: ['room-types'],
    queryFn: fetchRoomTypes,
  })

  const floor1 = rooms.filter((r) => r.floor === 1)
  const floor2 = rooms.filter((r) => r.floor === 2)

  const availableCount = rooms.filter((r) => r.status === 'available').length
  const occupiedCount = rooms.filter((r) => r.status === 'occupied').length
  const dirtyCount = rooms.filter((r) => r.housekeeping === 'dirty').length

  const acType = roomTypes.find((t) => t.name === 'AC Room')
  const nonAcType = roomTypes.find((t) => t.name === 'Non-AC Room')
  const selectedRate = acUsed ? acType?.base_rate : nonAcType?.base_rate

  return (
    <div className="min-h-screen">
      <TopBar title="Lodge Management" />

      <div className="pt-6 px-10 pb-16 flex gap-10">
        {/* Left: Room Grid */}
        <div className="flex-1 space-y-12">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: 'Available', count: availableCount, icon: 'check_circle', color: 'text-emerald-500' },
              { label: 'Occupied', count: occupiedCount, icon: 'bed', color: 'text-primary' },
              { label: 'Needs Cleaning', count: dirtyCount, icon: 'cleaning_services', color: 'text-error' },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface-container-low p-6 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">{stat.label}</p>
                  <h3 className="text-3xl font-headline text-primary">
                    {isLoading ? '—' : stat.count}
                  </h3>
                </div>
                <span className={`material-symbols-outlined text-4xl opacity-40 ${stat.color}`}>
                  {stat.icon}
                </span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 text-xs font-bold uppercase">
            {[['emerald', 'Clean'], ['amber', 'Dirty'], ['rose', 'Service']].map(([color, label]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full bg-${color}-500`} />
                {label}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              Occupied
            </span>
          </div>

          {isLoading ? (
            <div className="text-sm text-on-surface-variant animate-pulse">Loading rooms…</div>
          ) : (
            <>
              {floor1.length > 0 && (
                <section>
                  <h3 className="text-2xl font-headline text-primary mb-6">
                    Floor 1
                    <span className="text-sm font-sans font-normal text-on-surface-variant ml-3 italic">
                      Rooms 101–105
                    </span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {floor1.map((r) => <RoomCard key={r.id} room={r} />)}
                  </div>
                </section>
              )}

              {floor2.length > 0 && (
                <section>
                  <h3 className="text-2xl font-headline text-primary mb-6">
                    Floor 2
                    <span className="text-sm font-sans font-normal text-on-surface-variant ml-3 italic">
                      Rooms 201–208
                    </span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {floor2.map((r) => <RoomCard key={r.id} room={r} />)}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Right: Quick Check-In */}
        <aside className="w-96 shrink-0">
          <div className="sticky top-24 bg-surface-container-low rounded-3xl p-8 border border-outline-variant/15 space-y-6">
            <div>
              <h3 className="text-2xl font-headline text-primary mb-1">Quick Check-In</h3>
              <p className="text-sm text-on-surface-variant">Register a walk-in guest instantly.</p>
            </div>

            {/* AC / Non-AC Toggle */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/10">
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                AC Preference
              </p>
              <div className="flex rounded-full overflow-hidden border border-outline-variant/20">
                <button
                  onClick={() => setAcUsed(true)}
                  className={`flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    acUsed
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">ac_unit</span>
                  AC
                </button>
                <button
                  onClick={() => setAcUsed(false)}
                  className={`flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    !acUsed
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">wind_power</span>
                  Non-AC
                </button>
              </div>
              {selectedRate && (
                <p className="text-xs text-on-surface-variant mt-3 text-center">
                  Rate: <span className="font-bold text-primary">₹{selectedRate}/night</span>
                  <span className="ml-1 text-on-surface-variant/60">+ 12% GST</span>
                </p>
              )}
            </div>

            <form className="space-y-5">
              {[
                { label: 'Guest Full Name', placeholder: 'e.g. Rahul Verma', type: 'text' },
                { label: 'Contact Number', placeholder: '+91 98XXX XXXXX', type: 'tel' },
              ].map((field) => (
                <div key={field.label} className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                    {field.label}
                  </label>
                  <input type={field.type} placeholder={field.placeholder} className="input-minimal" />
                </div>
              ))}

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Room
                </label>
                <select className="input-minimal appearance-none">
                  <option value="">Select a room…</option>
                  {rooms
                    .filter((r) => r.status === 'available')
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.room_number} — Floor {r.floor}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                    Nights
                  </label>
                  <input type="number" defaultValue={1} min={1} className="input-minimal" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                    Guests
                  </label>
                  <input type="number" defaultValue={1} min={1} className="input-minimal" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Advance Payment (₹)
                </label>
                <input type="number" defaultValue={0} min={0} placeholder="0" className="input-minimal" />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full btn-primary py-4 px-6 flex items-center justify-center gap-2"
                >
                  <span>Complete Check-In</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            </form>
          </div>
        </aside>
      </div>
    </div>
  )
}
