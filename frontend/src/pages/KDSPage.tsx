import TopBar from '../components/shared/TopBar'

type KDSStatus = 'new' | 'in_prep' | 'ready'

interface KDSOrder {
  id: string
  table: string
  orderNo: string
  status: KDSStatus
  timer: string
  rush?: boolean
  items: { qty: number; name: string; note?: string }[]
}

const orders: KDSOrder[] = [
  {
    id: '1',
    table: 'Table 08',
    orderNo: '#2045',
    status: 'in_prep',
    timer: '12:45',
    items: [
      { qty: 2, name: 'Mutton Rogan Josh', note: 'Spicy' },
      { qty: 4, name: 'Garlic Naan' },
      { qty: 1, name: 'Vegetable Biryani', note: 'Extra Raita' },
    ],
  },
  {
    id: '2',
    table: 'Table 12',
    orderNo: '#2041',
    status: 'new',
    timer: '04:12',
    rush: true,
    items: [
      { qty: 1, name: 'Paneer Tikka Platter' },
      { qty: 2, name: 'Dal Tadka (Double)' },
    ],
  },
  {
    id: '3',
    table: 'Table 03',
    orderNo: '#2039',
    status: 'ready',
    timer: '22:10',
    items: [
      { qty: 1, name: 'Lemon Coriander Soup' },
      { qty: 3, name: 'Fresh Lime Soda' },
    ],
  },
]

const stockAlerts = [
  { severity: 'critical', label: 'Critical Low', item: 'Chicken Breast', detail: 'Only 4kg left' },
  { severity: 'healthy', label: 'Stock Level', item: 'Basmati Rice', detail: '50kg (Healthy)' },
  { severity: 'supply', label: 'Supply Alert', item: 'Fresh Cream', detail: 'Delivery at 4 PM' },
]

const headerStyle: Record<KDSStatus, string> = {
  in_prep: 'bg-secondary-container',
  new: 'bg-tertiary-fixed',
  ready: 'bg-surface-container-high opacity-75',
}

const dotStyle: Record<KDSStatus, string> = {
  in_prep: 'bg-tertiary-container text-white',
  new: 'bg-tertiary-container text-white',
  ready: 'bg-on-surface-variant text-white',
}

const timerStyle: Record<KDSStatus, string> = {
  in_prep: 'text-error',
  new: 'text-primary',
  ready: 'text-secondary',
}

export default function KDSPage() {
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
            <p className="text-on-surface-variant mt-2">Active Orders & Real-time Preparation Status</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="bg-surface-container text-primary px-6 py-3 rounded-full flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">timer</span>
              <span className="font-bold">Avg. Prep: 14m</span>
            </div>
            <div className="bg-primary text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-lg">
              <span className="material-symbols-outlined text-lg">sync</span>
              <span className="font-bold">Live</span>
            </div>
          </div>
        </div>

        {/* KDS Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-10">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`bg-surface-container-lowest rounded-xl flex flex-col shadow-card overflow-hidden ${
                order.status === 'ready' ? 'border-2 border-primary/20' : ''
              }`}
            >
              {/* Card Header */}
              <div className={`${headerStyle[order.status]} p-6 flex justify-between items-start`}>
                <div>
                  <span className="font-label font-bold text-sm tracking-widest uppercase text-on-surface-variant">
                    {order.orderNo}
                  </span>
                  <h3 className="font-headline text-5xl font-extrabold text-primary mt-1">
                    {order.table}
                  </h3>
                </div>
                <div className="text-right">
                  <div className={`flex items-center justify-end font-bold text-xl gap-1 ${timerStyle[order.status]}`}>
                    <span className="material-symbols-outlined">schedule</span>
                    <span>{order.timer}</span>
                  </div>
                  {order.rush && (
                    <p className="text-xs mt-1 font-bold italic underline decoration-error text-tertiary">
                      Rush Priority
                    </p>
                  )}
                  {order.status === 'in_prep' && (
                    <p className="text-on-secondary-container text-xs mt-1">In Preparation</p>
                  )}
                  {order.status === 'ready' && (
                    <p className="text-on-surface-variant text-xs mt-1">Awaiting Service</p>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className={`p-8 flex-grow space-y-4 ${order.status === 'ready' ? 'opacity-75' : ''}`}>
                {order.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center border-b border-outline-variant/15 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex gap-4 items-center">
                      <span className={`${dotStyle[order.status]} w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm`}>
                        {item.qty}
                      </span>
                      <span className={`text-xl font-medium text-primary ${order.status === 'ready' ? 'line-through decoration-primary/30' : ''}`}>
                        {item.name}
                      </span>
                    </div>
                    {item.note && (
                      <span className="text-on-surface-variant font-medium italic text-sm">{item.note}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <div className="p-8 pt-0">
                {order.status === 'new' && (
                  <button className="flex-1 w-full py-4 bg-surface-container-high text-primary rounded-full font-bold flex items-center justify-center gap-2 hover:bg-surface-container transition-all">
                    <span className="material-symbols-outlined">play_arrow</span>
                    Start Prep
                  </button>
                )}
                {order.status === 'in_prep' && (
                  <button className="flex-1 w-full py-4 bg-primary text-white rounded-full font-bold flex items-center justify-center gap-2 shadow-md hover:bg-primary-container transition-all">
                    <span className="material-symbols-outlined">check_circle</span>
                    Mark Ready
                  </button>
                )}
                {order.status === 'ready' && (
                  <button className="flex-1 w-full py-4 bg-secondary text-white rounded-full font-bold flex items-center justify-center gap-2 shadow-md hover:bg-secondary-container hover:text-on-secondary-container transition-all">
                    <span className="material-symbols-outlined">restaurant</span>
                    Mark Served
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Stock Alerts */}
        <section className="mt-20">
          <h4 className="font-headline text-2xl font-bold text-primary mb-8">Stock Alerts</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {stockAlerts.map((alert, i) => (
              <div
                key={i}
                className={`bg-surface-container-low p-6 rounded-xl border-l-4 ${
                  alert.severity === 'critical'
                    ? 'border-error'
                    : alert.severity === 'healthy'
                    ? 'border-secondary'
                    : 'border-primary'
                }`}
              >
                <p className="text-on-surface-variant text-sm font-bold uppercase tracking-wide">
                  {alert.label}
                </p>
                <p className="font-headline text-xl text-primary mt-1">{alert.item}</p>
                <p
                  className={`font-bold mt-2 ${
                    alert.severity === 'critical'
                      ? 'text-error'
                      : alert.severity === 'healthy'
                      ? 'text-secondary'
                      : 'text-primary'
                  }`}
                >
                  {alert.detail}
                </p>
              </div>
            ))}
            <div className="bg-surface-container p-6 rounded-xl flex items-center justify-center border-2 border-dashed border-outline-variant">
              <button className="flex flex-col items-center gap-2 text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-3xl">add_circle</span>
                <span className="font-bold">Add Alert</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* FAB - Broadcast */}
      <div className="fixed bottom-10 right-10">
        <div className="relative group">
          <button className="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-3xl">campaign</span>
          </button>
          <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-primary text-white px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-bold text-sm">
            Broadcast to Front
          </span>
        </div>
      </div>
    </div>
  )
}
