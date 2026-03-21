import TopBar from '../components/shared/TopBar'

const tableData = [
  { id: 'T-04', capacity: '4 Seats', status: 'available', time: '—' },
  { id: 'T-12', capacity: '2 Seats', status: 'occupied', time: '18:45' },
  { id: 'T-08', capacity: '6 Seats', status: 'bill_requested', time: '19:15' },
  { id: 'T-02', capacity: '4 Seats', status: 'occupied', time: '19:30' },
]

const activity = [
  { type: 'New Booking', msg: 'Suite 402 booked by Arjun Sharma for 3 nights.', time: '2 mins ago', active: true },
  { type: 'Service Alert', msg: 'Table 08 requested the final bill. Dispatching Waiter #14.', time: '15 mins ago', active: false },
  { type: 'Kitchen Status', msg: 'Inventory alert: Stock below threshold for Chicken.', time: '42 mins ago', active: false },
  { type: 'Check-Out', msg: 'Room 205 vacated. Marked for housekeeping.', time: '1 hour ago', active: false },
]

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

        {/* Metrics Bento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Revenue */}
          <div className="card p-8 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-secondary-container/30 rounded-lg">
                <span className="material-symbols-outlined text-primary">payments</span>
              </div>
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">+12.5%</span>
            </div>
            <h3 className="text-on-surface-variant text-sm font-bold uppercase tracking-widest mb-1">
              Total Revenue
            </h3>
            <div className="font-headline text-3xl font-bold text-primary">₹4,28,500</div>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
              <span className="material-symbols-outlined text-9xl">trending_up</span>
            </div>
          </div>

          {/* Occupancy */}
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
              <div className="font-headline text-5xl font-bold">88%</div>
              <div className="text-on-primary-container text-sm mb-2">/ 120 Rooms</div>
            </div>
            <div className="mt-6 w-full bg-primary-container h-1.5 rounded-full">
              <div className="bg-primary-fixed h-full rounded-full" style={{ width: '88%' }} />
            </div>
          </div>

          {/* Orders */}
          <div className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/15 flex flex-col justify-between">
            <div>
              <div className="p-3 bg-surface-variant/50 w-fit rounded-lg mb-4">
                <span className="material-symbols-outlined text-primary">restaurant</span>
              </div>
              <h3 className="text-on-surface-variant text-sm font-bold uppercase tracking-widest mb-1">
                Restaurant Orders
              </h3>
              <div className="font-headline text-3xl font-bold text-primary">142</div>
            </div>
            <div className="flex items-center gap-2 mt-4 text-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-sm">schedule</span>
              <span>Peak time: 8:00 PM – 10:00 PM</span>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          {/* Tables */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-2xl font-bold text-primary">Restaurant Tables</h3>
              <button className="text-sm font-bold text-primary border-b border-primary/20 hover:border-primary transition-all">
                View Floor Plan
              </button>
            </div>
            <div className="card overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low/50">
                    {['Table ID', 'Capacity', 'Status', 'Time Seated', ''].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant last:text-right"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {tableData.map((t) => (
                    <tr key={t.id} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="px-6 py-5 font-bold text-primary">{t.id}</td>
                      <td className="px-6 py-5 text-on-surface-variant">{t.capacity}</td>
                      <td className="px-6 py-5">
                        <span className={statusBadge[t.status]}>{statusLabel[t.status]}</span>
                      </td>
                      <td className="px-6 py-5 text-on-surface-variant/60">{t.time}</td>
                      <td className="px-6 py-5 text-right">
                        <button className="material-symbols-outlined text-primary/40 hover:text-primary transition-colors">
                          more_horiz
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activity */}
          <div className="space-y-6">
            <h3 className="font-headline text-2xl font-bold text-primary">Recent Activity</h3>
            <div className="space-y-0">
              {activity.map((item, i) => (
                <div
                  key={i}
                  className={`relative pl-8 ${i < activity.length - 1 ? 'pb-8' : ''} border-l border-outline-variant/30 group`}
                >
                  <div
                    className={`absolute left-[-5px] top-0 w-[9px] h-[9px] rounded-full ring-4 ring-background ${
                      item.active ? 'bg-primary' : 'bg-outline-variant'
                    }`}
                  />
                  <div className="bg-surface-container-low p-5 rounded-xl transition-all group-hover:-translate-y-1">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        {item.type}
                      </span>
                      <span className="text-xs text-on-surface-variant/60">{item.time}</span>
                    </div>
                    <p className="text-sm text-primary font-medium leading-relaxed">{item.msg}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FAB */}
      <button className="fixed bottom-10 right-10 bg-primary text-on-primary w-16 h-16 rounded-full shadow-2xl flex items-center justify-center group hover:scale-105 transition-all z-50">
        <span className="material-symbols-outlined text-2xl group-hover:rotate-90 transition-transform duration-300">
          add
        </span>
      </button>
    </div>
  )
}
