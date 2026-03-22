import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import TopBar from '../components/shared/TopBar'
import { fetchFullMenu, MenuCategory, MenuItem } from '../api/menu'
import api from '../api/client'

const roleColors: Record<string, string> = {}

function toggleItem(itemId: string) {
  return api.post(`/menu/items/${itemId}/toggle`)
}

export default function MenuPage() {
  const qc = useQueryClient()
  const [activeCatId, setActiveCatId] = useState<string | null>(null)
  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'nonveg'>('all')

  const { data: menu = [], isLoading } = useQuery<MenuCategory[]>({
    queryKey: ['menu'],
    queryFn: fetchFullMenu,
  })

  const toggleMutation = useMutation({
    mutationFn: toggleItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu'] }),
  })

  const activeCategory = activeCatId
    ? menu.find((c) => c.id === activeCatId)
    : menu[0]

  const items = (activeCategory?.items ?? []).filter((item) => {
    if (vegFilter === 'veg') return item.is_veg
    if (vegFilter === 'nonveg') return !item.is_veg
    return true
  })

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Category sidebar */}
      <aside className="w-64 bg-surface-container-low border-r border-outline-variant/15 flex flex-col py-8 shrink-0 overflow-y-auto">
        <div className="px-8 mb-6">
          <h3 className="font-headline text-lg font-bold text-primary">Categories</h3>
          <p className="text-xs text-on-surface-variant mt-1">{menu.length} categories</p>
        </div>
        {isLoading && <p className="px-8 text-sm text-on-surface-variant animate-pulse">Loading…</p>}
        <nav className="flex flex-col gap-y-0.5">
          {menu.map((cat) => {
            const isActive = cat.id === (activeCatId ?? menu[0]?.id)
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCatId(cat.id)}
                className={isActive
                  ? 'bg-gradient-to-r from-primary to-primary-container text-white rounded-full mx-4 py-2.5 px-5 shadow-lg flex items-center justify-between font-bold text-sm'
                  : 'py-2.5 px-8 hover:translate-x-1 transition-transform flex items-center justify-between text-primary/70 text-sm font-medium'
                }
              >
                <span>{cat.name}</span>
                <span className={`text-xs ${isActive ? 'text-white/70' : 'text-on-surface-variant/50'}`}>
                  {cat.items.length}
                </span>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-surface">
        <TopBar title="Menu Management" />
        <div className="p-10 max-w-5xl mx-auto">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="font-headline text-4xl font-bold text-primary tracking-tight">
                {activeCategory?.name ?? '—'}
              </h1>
              <p className="text-on-surface-variant text-sm mt-1">{items.length} items</p>
            </div>

            {/* Veg filter */}
            <div className="flex rounded-full overflow-hidden border border-outline-variant/20 text-sm">
              {(['all', 'veg', 'nonveg'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setVegFilter(f)}
                  className={`px-4 py-2 font-bold transition-all capitalize ${
                    vegFilter === f ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  {f === 'nonveg' ? 'Non-Veg' : f === 'all' ? 'All' : 'Veg'}
                </button>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low/50">
                  {['', 'Item Name', 'Variants & Price', 'GST', 'Status', ''].map((h, i) => (
                    <th key={i} className="px-5 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant last:text-right">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container-low/30 transition-colors">
                    {/* Veg dot */}
                    <td className="pl-5 pr-2 py-4">
                      <div className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center ${item.is_veg ? 'border-green-600' : 'border-red-600'}`}>
                        <div className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-green-600' : 'bg-red-600'}`} />
                      </div>
                    </td>
                    <td className="px-3 py-4 font-bold text-primary text-sm">{item.name}</td>
                    <td className="px-3 py-4 text-sm text-on-surface-variant">
                      {item.is_market_price ? (
                        <span className="text-amber-600 font-medium text-xs">Market price</span>
                      ) : item.variants.length > 1 ? (
                        item.variants.map((v) => (
                          <span key={v.id} className="mr-3">
                            <span className="text-on-surface-variant/60">{v.label}</span>{' '}
                            <span className="font-bold text-primary">₹{v.price}</span>
                          </span>
                        ))
                      ) : (
                        <span className="font-bold text-primary">₹{item.variants[0]?.price ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-sm text-on-surface-variant">{item.gst_rate}%</td>
                    <td className="px-3 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-variant text-on-surface-variant'
                      }`}>
                        {item.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => toggleMutation.mutate(item.id)}
                        disabled={toggleMutation.isPending}
                        title={item.is_available ? 'Mark unavailable' : 'Mark available'}
                        className="material-symbols-outlined text-primary/40 hover:text-primary transition-colors disabled:opacity-30"
                      >
                        {item.is_available ? 'toggle_on' : 'toggle_off'}
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-sm text-on-surface-variant">
                      No items in this category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
