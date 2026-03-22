import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import TopBar from '../components/shared/TopBar'
import { fetchFullMenu, type MenuCategory, type MenuItem, type MenuItemVariant } from '../api/menu'
import { fetchTables, type Table } from '../api/tables'
import { createOrder, type OrderCreate } from '../api/orders'

interface CartItem {
  id: string          // menuItemId + variantId
  menuItemId: string
  variantId: string | null
  name: string
  variantLabel: string | null
  price: number
  qty: number
}

const CATEGORY_ICONS: Record<string, string> = {
  'Breakfast': 'breakfast_dining',
  'Beverages': 'local_cafe',
  'Veg Soup': 'soup_kitchen',
  'Veg Noodles': 'ramen_dining',
  'Veg Tandoor & Kabab': 'outdoor_grill',
  'Salad & Raita': 'eco',
  'Veg Starter': 'tapas',
  'Veg Main Course': 'restaurant',
  'Roti & Bread': 'grain',
  'Rice': 'rice_bowl',
  'Non Veg Soup': 'soup_kitchen',
  'Non Veg Noodles': 'ramen_dining',
  'Non Veg Tandoor & Kabab': 'outdoor_grill',
  'Chinese Starter': 'fastfood',
  'Non Veg Main Course': 'lunch_dining',
  'Egg': 'egg',
  'Sea Food': 'set_meal',
  'Biryani Per Kg': 'rice_bowl',
  'Non Veg Rice & Chinese': 'rice_bowl',
  'Thali': 'dinner_dining',
  'Cold Drinks & Ice Cream': 'local_bar',
}

function VariantPicker({
  item,
  onAdd,
}: {
  item: MenuItem
  onAdd: (variant: MenuItemVariant) => void
}) {
  const [selected, setSelected] = useState<string>(
    item.variants.find((v) => v.is_default)?.id ?? item.variants[0]?.id
  )
  const selectedVariant = item.variants.find((v) => v.id === selected)!

  return (
    <div className="flex items-center justify-between mt-1 w-full" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2">
        <div className="flex rounded-full overflow-hidden border border-outline-variant/30 text-xs">
          {item.variants.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelected(v.id)}
              className={`px-3 py-1 font-bold transition-all ${
                selected === v.id
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <span className="text-xs font-bold text-primary">₹{selectedVariant?.price}</span>
      </div>
      <button
        onClick={() => onAdd(selectedVariant)}
        className="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center text-primary/40 hover:text-primary hover:border-primary transition-colors"
      >
        <span className="material-symbols-outlined text-sm">add</span>
      </button>
    </div>
  )
}

// ── Step 1: Table Selection Grid ───────────────────────────────────────────────

function TableGrid({
  tables,
  isLoading,
  onSelect,
}: {
  tables: Table[]
  isLoading: boolean
  onSelect: (table: Table) => void
}) {
  const available = tables.filter((t) => t.status === 'available')
  const occupied = tables.filter((t) => t.status === 'occupied')
  const other = tables.filter((t) => t.status !== 'available' && t.status !== 'occupied')

  return (
    <div className="flex-1 overflow-y-auto">
      <TopBar />
      <div className="p-10 max-w-5xl mx-auto">
        <div className="mb-10">
          <h1 className="font-headline text-4xl font-bold text-primary tracking-tight">Select a Table</h1>
          <p className="text-on-surface-variant mt-1 text-sm">Choose a table to start or add to an order</p>
        </div>

        {isLoading && (
          <div className="text-center py-20 text-on-surface-variant animate-pulse text-sm">Loading tables…</div>
        )}

        {available.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">
              Available — {available.length} table{available.length !== 1 ? 's' : ''}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {available.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSelect(t)}
                  className="flex flex-col items-center justify-center gap-2 bg-surface-container-lowest rounded-2xl p-6 shadow-card hover:shadow-card-hover hover:border-primary border border-transparent transition-all duration-200 group"
                >
                  <span className="material-symbols-outlined text-3xl text-emerald-500 group-hover:scale-110 transition-transform">
                    table_restaurant
                  </span>
                  <span className="font-bold text-primary text-base">{t.table_number}</span>
                  <span className="text-xs text-emerald-600 font-medium">Available</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {occupied.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">
              Occupied — {occupied.length} table{occupied.length !== 1 ? 's' : ''}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {occupied.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSelect(t)}
                  className="flex flex-col items-center justify-center gap-2 bg-surface-container-lowest rounded-2xl p-6 shadow-card hover:shadow-card-hover hover:border-amber-400 border border-amber-200 transition-all duration-200 group"
                >
                  <span className="material-symbols-outlined text-3xl text-amber-500 group-hover:scale-110 transition-transform">
                    table_restaurant
                  </span>
                  <span className="font-bold text-primary text-base">{t.table_number}</span>
                  <span className="text-xs text-amber-600 font-medium">Occupied — add items</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {other.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">Other</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {other.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col items-center justify-center gap-2 bg-surface-container-low rounded-2xl p-6 border border-outline-variant/20 opacity-50 cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant">
                    table_restaurant
                  </span>
                  <span className="font-bold text-on-surface-variant text-base">{t.table_number}</span>
                  <span className="text-xs text-on-surface-variant font-medium capitalize">{t.status}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {!isLoading && tables.length === 0 && (
          <div className="text-center py-20 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl block opacity-30 mb-3">table_restaurant</span>
            <p className="text-sm font-medium">No tables found</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Step 2: Order Entry ────────────────────────────────────────────────────────

export default function OrderEntryPage() {
  const qc = useQueryClient()

  const { data: menu = [], isLoading: menuLoading } = useQuery<MenuCategory[]>({
    queryKey: ['menu'],
    queryFn: () => fetchFullMenu(true),
  })

  const { data: tables = [], isLoading: tablesLoading } = useQuery<Table[]>({
    queryKey: ['tables'],
    queryFn: fetchTables,
  })

  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [activeCatId, setActiveCatId] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [orderSuccess, setOrderSuccess] = useState(false)

  const sendMutation = useMutation({
    mutationFn: (data: OrderCreate) => createOrder(data),
    onSuccess: () => {
      setCart([])
      setOrderSuccess(true)
      setSelectedTable(null)
      qc.invalidateQueries({ queryKey: ['tables'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      setTimeout(() => setOrderSuccess(false), 3000)
    },
  })

  // ── Step 1: show table grid ────────────────────────────────────────────────
  if (!selectedTable) {
    return (
      <div className="flex h-screen overflow-hidden flex-col">
        {orderSuccess && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-sm font-bold px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            Order sent to kitchen!
          </div>
        )}
        <TableGrid
          tables={tables}
          isLoading={tablesLoading}
          onSelect={(t) => { setSelectedTable(t); setCart([]); setSearch(''); setActiveCatId(null) }}
        />
      </div>
    )
  }

  // ── Step 2: order entry for selected table ─────────────────────────────────

  const activeCategory = activeCatId ? menu.find((c) => c.id === activeCatId) : menu[0]

  function addToCart(menuItem: MenuItem, variant: MenuItemVariant) {
    const key = menuItem.id + variant.id
    setCart((prev) => {
      const existing = prev.find((c) => c.id === key)
      if (existing) return prev.map((c) => c.id === key ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, {
        id: key,
        menuItemId: menuItem.id,
        variantId: variant.id,
        name: menuItem.name,
        variantLabel: menuItem.variants.length > 1 ? variant.label : null,
        price: variant.price,
        qty: 1,
      }]
    })
  }

  function handleSingleAdd(menuItem: MenuItem) {
    if (menuItem.is_market_price) return
    const def = menuItem.variants.find((v) => v.is_default) ?? menuItem.variants[0]
    if (def) addToCart(menuItem, def)
  }

  function updateQty(key: string, delta: number) {
    setCart((prev) =>
      prev.map((c) => c.id === key ? { ...c, qty: c.qty + delta } : c)
          .filter((c) => c.qty > 0)
    )
  }

  function handleSendToKitchen() {
    if (!selectedTable || cart.length === 0) return
    sendMutation.mutate({
      table_id: selectedTable.id,
      items: cart.map((c) => ({
        menu_item_id: c.menuItemId,
        variant_id: c.variantId,
        quantity: c.qty,
      })),
    })
  }

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0)
  const gst = Math.round(subtotal * 0.05)
  const total = subtotal + gst

  const filteredItems = search
    ? menu.flatMap((c) => c.items).filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    : activeCategory?.items ?? []

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left: Category Sidebar */}
      <aside className="w-72 bg-surface-container-low border-r border-outline-variant/15 flex flex-col py-8 shrink-0 overflow-y-auto">
        <div className="px-8 mb-6">
          <h3 className="font-headline text-lg font-bold text-primary">Menu Categories</h3>
          <p className="text-xs text-on-surface-variant mt-1 font-medium">Select to filter items</p>
        </div>

        {menuLoading && (
          <div className="px-10 text-sm text-on-surface-variant animate-pulse">Loading…</div>
        )}

        <nav className="flex flex-col gap-y-1">
          {menu.map((cat) => {
            const isActive = cat.id === (activeCatId ?? menu[0]?.id)
            return (
              <button
                key={cat.id}
                onClick={() => { setActiveCatId(cat.id); setSearch('') }}
                className={
                  isActive
                    ? 'bg-gradient-to-r from-primary to-primary-container text-white rounded-full mx-4 py-3 px-6 shadow-lg flex items-center gap-3 font-medium text-sm'
                    : 'py-3 px-10 transition-transform hover:translate-x-1 flex items-center gap-3 text-primary/70 font-medium text-sm'
                }
              >
                <span className="material-symbols-outlined text-[20px]">
                  {CATEGORY_ICONS[cat.name] ?? 'restaurant_menu'}
                </span>
                <span>{cat.name}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Center: Menu Grid */}
      <main className="flex-1 bg-surface overflow-y-auto">
        <TopBar />
        <div className="p-10 max-w-5xl mx-auto">
          {/* Table header with back button */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => setSelectedTable(null)}
              className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors text-sm font-medium"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Tables
            </button>
            <span className="text-outline-variant">/</span>
            <div className="flex items-center gap-2">
              <span className={`material-symbols-outlined text-lg ${selectedTable.status === 'occupied' ? 'text-amber-500' : 'text-emerald-500'}`}>
                table_restaurant
              </span>
              <span className="font-bold text-primary">{selectedTable.table_number}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                selectedTable.status === 'occupied'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {selectedTable.status === 'occupied' ? 'Adding items' : 'New order'}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-end mb-10">
            <div>
              <h1 className="font-headline text-4xl font-bold text-primary tracking-tight">
                {search ? 'Search Results' : (activeCategory?.name ?? 'Menu')}
              </h1>
              <p className="text-on-surface-variant mt-1 text-sm">
                {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="relative w-64 group">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search menu…"
                className="w-full bg-transparent border-b border-outline-variant py-2 pr-10 focus:outline-none focus:border-primary transition-all text-sm"
              />
              <span className="material-symbols-outlined absolute right-0 top-2 text-outline group-focus-within:text-primary transition-colors">
                search
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredItems.map((menuItem) => {
              const hasVariants = menuItem.variants.length > 1
              return (
                <div
                  key={menuItem.id}
                  className={`group relative flex items-start gap-4 bg-surface-container-lowest rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 ${!hasVariants ? 'cursor-pointer' : ''}`}
                  onClick={() => !hasVariants && handleSingleAdd(menuItem)}
                >
                  <div className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center shrink-0 mt-0.5 ${menuItem.is_veg ? 'border-green-600' : 'border-red-600'}`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${menuItem.is_veg ? 'bg-green-600' : 'bg-red-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-primary text-sm leading-tight">{menuItem.name}</h3>
                    {menuItem.is_market_price ? (
                      <p className="text-xs text-amber-600 font-medium mt-1">Market price</p>
                    ) : hasVariants ? (
                      <VariantPicker item={menuItem} onAdd={(v) => addToCart(menuItem, v)} />
                    ) : (
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-bold text-primary text-sm">₹{menuItem.variants[0]?.price ?? 0}</span>
                        <button className="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center text-primary/40 group-hover:text-primary group-hover:border-primary transition-colors">
                          <span className="material-symbols-outlined text-sm">add</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {!menuLoading && filteredItems.length === 0 && (
              <div className="col-span-2 text-center py-20 text-on-surface-variant">
                <span className="material-symbols-outlined text-5xl block opacity-30 mb-3">search_off</span>
                <p className="text-sm font-medium">No items found</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Right: Cart */}
      <aside className="w-[380px] bg-surface-container-lowest flex flex-col border-l border-outline-variant/15 shrink-0">
        <div className="p-8 border-b border-outline-variant/10">
          <div className="flex justify-between items-center">
            <h3 className="font-headline text-2xl font-bold text-primary">Order</h3>
            <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${
              selectedTable.status === 'occupied'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              <span className="material-symbols-outlined text-sm">table_restaurant</span>
              {selectedTable.table_number}
            </div>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
          {cart.length === 0 && (
            <div className="text-center py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl mb-3 block opacity-30">shopping_cart</span>
              <p className="text-sm font-medium">No items added yet</p>
            </div>
          )}
          {cart.map((cartItem) => (
            <div key={cartItem.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-primary text-sm leading-tight">{cartItem.name}</h4>
                {cartItem.variantLabel && (
                  <p className="text-xs text-on-surface-variant">{cartItem.variantLabel}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQty(cartItem.id, -1)}
                  className="w-6 h-6 rounded-full border border-outline-variant flex items-center justify-center text-primary hover:bg-surface-container-low"
                >
                  <span className="material-symbols-outlined text-xs">remove</span>
                </button>
                <span className="text-xs font-bold text-primary w-4 text-center">{cartItem.qty}</span>
                <button
                  onClick={() => updateQty(cartItem.id, 1)}
                  className="w-6 h-6 rounded-full border border-outline-variant flex items-center justify-center text-primary hover:bg-surface-container-low"
                >
                  <span className="material-symbols-outlined text-xs">add</span>
                </button>
              </div>
              <span className="text-sm font-bold text-primary w-16 text-right">₹{cartItem.price * cartItem.qty}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="p-8 bg-surface-container-low">
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm text-on-surface-variant">
              <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-on-surface-variant">
              <span>GST (5%)</span><span>₹{gst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-outline-variant/20">
              <span className="font-bold text-primary text-lg">Total</span>
              <span className="font-headline font-bold text-primary text-2xl italic">₹{total.toFixed(2)}</span>
            </div>
          </div>
          {sendMutation.isError && (
            <p className="text-xs text-error mb-3 text-center">
              {(sendMutation.error as any)?.response?.data?.detail ?? 'Failed to send order'}
            </p>
          )}
          <button
            onClick={handleSendToKitchen}
            disabled={cart.length === 0 || sendMutation.isPending}
            className="w-full btn-primary py-4 flex items-center justify-center gap-3 disabled:opacity-40"
          >
            <span className="material-symbols-outlined">send</span>
            {sendMutation.isPending ? 'Sending…' : 'Send to Kitchen'}
          </button>
        </div>
      </aside>
    </div>
  )
}
