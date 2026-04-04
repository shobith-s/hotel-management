import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import TopBar from '../components/shared/TopBar'
import { fetchFullMenu, getMenuItemHistory, MenuCategory, MenuItem, MenuItemHistoryEntry } from '../api/menu'
import api from '../api/client'

const FIELD_LABELS: Record<string, string> = {
  is_available: 'Availability',
  price: 'Price',
  name: 'Name',
  gst_rate: 'GST Rate',
  is_veg: 'Veg/Non-Veg',
  description: 'Description',
  is_market_price: 'Market Price',
  category_id: 'Category',
  label: 'Variant Label',
  is_default: 'Default Variant',
}

function formatValue(field: string, val: string | null): string {
  if (val === null) return '—'
  if (field === 'is_available') return val === 'True' ? 'Available' : 'Unavailable'
  if (field === 'is_veg') return val === 'True' ? 'Veg' : 'Non-Veg'
  if (field === 'is_market_price') return val === 'True' ? 'Yes' : 'No'
  if (field === 'is_default') return val === 'True' ? 'Yes' : 'No'
  if (field === 'price') return `₹${parseFloat(val).toFixed(2)}`
  if (field === 'gst_rate') return `${val}%`
  return val
}

function HistoryPanel({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const { data: history = [], isLoading } = useQuery<MenuItemHistoryEntry[]>({
    queryKey: ['menu-history', item.id],
    queryFn: () => getMenuItemHistory(item.id),
  })

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface shadow-2xl flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/20">
          <div>
            <h2 className="font-headline text-lg font-bold text-primary">Change History</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">{item.name}</p>
          </div>
          <button onClick={onClose} className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">close</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="animate-pulse bg-surface-container-high rounded-full w-2.5 h-2.5 mt-1 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="animate-pulse bg-surface-container-high rounded h-3 w-1/3" />
                    <div className="animate-pulse bg-surface-container-high rounded h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!isLoading && history.length === 0 && (
            <div className="text-center py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl block mb-2 opacity-40">history</span>
              <p className="text-sm">No changes recorded yet.</p>
              <p className="text-xs mt-1 opacity-60">Changes made from now on will appear here.</p>
            </div>
          )}
          {history.length > 0 && (
            <ol className="relative border-l border-outline-variant/30 ml-2 space-y-5">
              {history.map((entry) => (
                <li key={entry.id} className="ml-5">
                  <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-primary/20 border-2 border-primary/50" />
                  <p className="text-xs text-on-surface-variant mb-1">
                    {new Date(entry.changed_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    {entry.note && <span className="ml-2 text-primary/60">· {entry.note}</span>}
                  </p>
                  <p className="text-sm font-semibold text-primary">
                    {FIELD_LABELS[entry.field_name] ?? entry.field_name}
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    <span className="line-through opacity-60">{formatValue(entry.field_name, entry.old_value)}</span>
                    <span className="material-symbols-outlined text-xs mx-1 align-middle">arrow_forward</span>
                    <span className="font-medium text-primary">{formatValue(entry.field_name, entry.new_value)}</span>
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}

function toggleItem(itemId: string) {
  return api.post(`/menu/items/${itemId}/toggle`)
}

interface CsvImportResult { imported: number; skipped: number; errors: string[] }

async function importMenuCsv(file: File): Promise<CsvImportResult> {
  const form = new FormData()
  form.append('file', file)
  const res = await api.post<CsvImportResult>('/menu/import-csv', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export default function MenuPage() {
  const qc = useQueryClient()
  const [activeCatId, setActiveCatId] = useState<string | null>(null)
  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'nonveg'>('all')
  const [csvResult, setCsvResult] = useState<CsvImportResult | null>(null)
  const [historyItem, setHistoryItem] = useState<MenuItem | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: menu = [], isLoading } = useQuery<MenuCategory[]>({
    queryKey: ['menu', 'all'],
    queryFn: () => fetchFullMenu(false),  // show all items including unavailable
  })

  const toggleMutation = useMutation({
    mutationFn: toggleItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu', 'all'] }),
  })

  const csvMutation = useMutation({
    mutationFn: importMenuCsv,
    onSuccess: (result) => {
      setCsvResult(result)
      qc.invalidateQueries({ queryKey: ['menu'] })
    },
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
        {isLoading && (
          <div className="px-8 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-surface-container-high rounded-xl h-10" />
            ))}
          </div>
        )}
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

          {/* CSV Import */}
          <div className="mb-6 bg-surface-container-lowest rounded-2xl p-5 shadow-card flex items-center gap-4 flex-wrap">
            <span className="material-symbols-outlined text-on-surface-variant">upload_file</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-primary">Bulk Import via CSV</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Columns: <span className="font-mono">category_name, item_name, is_veg, price, gst_rate</span>
                {' '}· optional: <span className="font-mono">variant_label, is_market_price</span>
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) { setCsvResult(null); csvMutation.mutate(f) }
                e.target.value = ''
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={csvMutation.isPending}
              className="px-5 py-2 rounded-full border border-outline-variant text-sm font-bold text-primary hover:bg-surface-container-low transition-colors disabled:opacity-40 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">upload</span>
              {csvMutation.isPending ? 'Importing…' : 'Choose CSV'}
            </button>
          </div>

          {/* CSV result banner */}
          {csvResult && (
            <div className={`mb-6 rounded-2xl p-4 text-sm border ${csvResult.errors.length ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <p className="font-bold text-primary mb-1">
                Import complete — {csvResult.imported} added, {csvResult.skipped} skipped
              </p>
              {csvResult.errors.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-amber-800">
                  {csvResult.errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              )}
              <button onClick={() => setCsvResult(null)} className="mt-2 text-xs text-on-surface-variant underline">Dismiss</button>
            </div>
          )}

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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setHistoryItem(item)}
                          title="View change history"
                          className="material-symbols-outlined text-on-surface-variant/40 hover:text-primary transition-colors text-[20px]"
                        >
                          history
                        </button>
                        <button
                          onClick={() => toggleMutation.mutate(item.id)}
                          disabled={toggleMutation.isPending}
                          title={item.is_available ? 'Mark unavailable' : 'Mark available'}
                          className="material-symbols-outlined text-primary/40 hover:text-primary transition-colors disabled:opacity-30"
                        >
                          {item.is_available ? 'toggle_on' : 'toggle_off'}
                        </button>
                      </div>
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
      {historyItem && <HistoryPanel item={historyItem} onClose={() => setHistoryItem(null)} />}
    </div>
  )
}
