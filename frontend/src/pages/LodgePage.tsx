import TopBar from '../components/shared/TopBar'

type HKStatus = 'clean' | 'dirty' | 'service' | 'occupied'

interface RoomCard {
  number: string
  type: string
  status: HKStatus
  guest?: string
  lastCheckout?: string
}

const floor1: RoomCard[] = [
  { number: '101', type: 'King Suite', status: 'clean' },
  { number: '102', type: 'Twin Room', status: 'dirty', lastCheckout: '12:00' },
  { number: '103', type: 'Deluxe King', status: 'occupied', guest: 'Mr. R. Sharma' },
  { number: '104', type: 'Standard Single', status: 'clean' },
  { number: '105', type: 'Junior Suite', status: 'service' },
]

const floor2: RoomCard[] = [
  { number: '201', type: 'Penthouse', status: 'clean' },
  { number: '202', type: 'Executive Suite', status: 'occupied', guest: 'Dr. Anita Gupta' },
  { number: '203', type: 'Executive Suite', status: 'clean' },
  { number: '204', type: 'Presidential', status: 'dirty' },
  { number: '205', type: 'Honeymoon Suite', status: 'clean' },
]

const bookings = [
  { guest: 'Vikram Singh', room: '103', checkIn: 'Oct 12, 14:00', checkOut: 'Oct 15, 11:00', amount: '₹12,400', status: 'confirmed' },
  { guest: 'Sarah Jenkins', room: '202', checkIn: 'Oct 11, 16:30', checkOut: 'Oct 14, 10:00', amount: '₹24,000', status: 'in_stay' },
  { guest: 'Karthik Raja', room: '108', checkIn: 'Oct 10, 11:15', checkOut: 'Oct 12, 12:00', amount: '₹8,500', status: 'checked_out' },
]

const hkBadge: Record<HKStatus, string> = {
  clean: 'bg-emerald-100 text-emerald-700',
  dirty: 'bg-amber-100 text-amber-700',
  service: 'bg-rose-100 text-rose-700',
  occupied: 'bg-primary-container text-white',
}
const hkLabel: Record<HKStatus, string> = {
  clean: 'Clean',
  dirty: 'Dirty',
  service: 'Service',
  occupied: 'Occupied',
}
const bookingBadge: Record<string, string> = {
  confirmed: 'bg-emerald-50 text-emerald-700',
  in_stay: 'bg-secondary-container text-on-secondary-container',
  checked_out: 'bg-surface-variant text-on-surface-variant',
}
const bookingLabel: Record<string, string> = {
  confirmed: 'Confirmed',
  in_stay: 'In-Stay',
  checked_out: 'Checked Out',
}

function RoomGrid({ rooms, floor, wing }: { rooms: RoomCard[]; floor: string; wing: string }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-headline text-primary">
          Floor {floor}{' '}
          <span className="text-sm font-sans font-normal text-on-surface-variant ml-2 italic">{wing}</span>
        </h3>
        {floor === '1' && (
          <div className="flex gap-4">
            {[['emerald', 'Clean'], ['amber', 'Dirty'], ['rose', 'Service']].map(([color, label]) => (
              <span key={label} className="flex items-center gap-1 text-xs font-bold uppercase">
                <span className={`w-2 h-2 rounded-full bg-${color}-500`} />
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {rooms.map((room) => (
          <div
            key={room.number}
            className={`p-5 rounded-xl cursor-pointer transition-all ${
              room.status === 'occupied'
                ? 'bg-surface border-2 border-primary/20 shadow-inner'
                : 'bg-surface-container-lowest border border-outline-variant/15 hover:shadow-xl'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-xl font-bold font-headline">{room.number}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${hkBadge[room.status]}`}>
                {hkLabel[room.status]}
              </span>
            </div>
            <p className={`text-xs ${room.status === 'occupied' ? 'text-white/60' : 'text-on-surface-variant'}`}>
              {room.type}
            </p>
            {room.guest && (
              <p className="mt-4 text-[11px] font-bold text-primary">{room.guest}</p>
            )}
            {room.lastCheckout && (
              <div className="mt-4">
                <span className="text-[10px] text-on-surface-variant">Last checkout: {room.lastCheckout}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export default function LodgePage() {
  return (
    <div className="min-h-screen">
      <TopBar title="Lodge Management" />

      <div className="pt-6 px-10 pb-16 flex gap-10">
        {/* Left: Room Grid */}
        <div className="flex-1 space-y-12">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: 'Available', count: '12', icon: 'check_circle', color: 'text-emerald-500' },
              { label: 'Occupied', count: '28', icon: 'bed', color: 'text-primary-fixed-dim' },
              { label: 'Service', count: '04', icon: 'cleaning_services', color: 'text-error' },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface-container-low p-6 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">{stat.label}</p>
                  <h3 className="text-3xl font-headline text-primary">{stat.count}</h3>
                </div>
                <span className={`material-symbols-outlined text-4xl opacity-40 ${stat.color}`}>
                  {stat.icon}
                </span>
              </div>
            ))}
          </div>

          <RoomGrid rooms={floor1} floor="1" wing="Standard Suites" />
          <RoomGrid rooms={floor2} floor="2" wing="Executive Wing" />

          {/* Recent Bookings */}
          <section className="bg-surface-container-lowest rounded-2xl p-8 shadow-card border border-outline-variant/10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-headline text-primary">Recent Bookings</h3>
              <button className="text-sm font-bold text-primary border-b border-primary/20 hover:border-primary transition-all">
                View All History
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-outline-variant/20">
                    {['Guest Name', 'Room', 'Check In', 'Check Out', 'Amount', 'Status'].map((h) => (
                      <th key={h} className="pb-4 font-bold text-xs uppercase tracking-widest text-on-surface-variant">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {bookings.map((b, i) => (
                    <tr key={i} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-4 font-medium">{b.guest}</td>
                      <td className="py-4">{b.room}</td>
                      <td className="py-4 text-sm text-on-surface-variant">{b.checkIn}</td>
                      <td className="py-4 text-sm text-on-surface-variant">{b.checkOut}</td>
                      <td className="py-4 font-bold">{b.amount}</td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${bookingBadge[b.status]}`}>
                          {bookingLabel[b.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right: Quick Registration */}
        <aside className="w-96 shrink-0">
          <div className="sticky top-24 bg-surface-container-low rounded-3xl p-8 border border-outline-variant/15">
            <h3 className="text-2xl font-headline text-primary mb-2">Quick Check-In</h3>
            <p className="text-sm text-on-surface-variant mb-8">Register a walk-in guest instantly.</p>
            <form className="space-y-6">
              {[
                { label: 'Guest Full Name', placeholder: 'e.g. Rahul Verma', type: 'text' },
                { label: 'Contact Number', placeholder: '+91 98XXX XXXXX', type: 'tel' },
              ].map((field) => (
                <div key={field.label} className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    className="input-minimal"
                  />
                </div>
              ))}

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Room Category
                </label>
                <select className="input-minimal appearance-none">
                  <option>Executive Suite</option>
                  <option>Deluxe King</option>
                  <option>Twin Room</option>
                  <option>Penthouse</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                    Nights
                  </label>
                  <input type="number" defaultValue={1} className="input-minimal" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                    Pax
                  </label>
                  <input type="number" defaultValue={2} className="input-minimal" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  ID Verification
                </label>
                <div className="mt-2 border-2 border-dashed border-outline-variant/30 rounded-xl p-6 text-center hover:bg-surface-container-highest transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-primary/40 block mb-2">upload_file</span>
                  <p className="text-xs text-on-surface-variant">Upload Aadhaar / Passport</p>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full btn-primary py-4 px-6 flex items-center justify-center gap-2"
                >
                  <span>Complete Check-in</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            </form>

            {/* Alert banner */}
            <div className="mt-10 p-4 bg-primary-fixed/30 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white">restaurant_menu</span>
              </div>
              <div>
                <p className="text-xs font-bold text-primary">Dinner Rush Impending</p>
                <p className="text-[10px] text-on-surface-variant">14 table bookings in 2 hours.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
