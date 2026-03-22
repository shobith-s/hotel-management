import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import TopBar from '../components/shared/TopBar'
import { fetchFullMenu, MenuCategory, MenuItem } from '../api/menu'

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
  'Salad & Raita': 'salad',
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

function defaultPrice(item: MenuItem): number {
  const def = item.variants.find((v) => v.is_default) ?? item.variants[0]
  return def?.price ?? 0
}

export default function OrderEntryPage() {
  const { data: menu = [], isLoading } = useQuery<MenuCategory[]>({
    queryKey: ['menu'],
    queryFn: fetchFullMenu,
  })

  const [activeCatId, setActiveCatId] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')

  const activeCategory = activeCatId
    ? menu.find((c) => c.id === activeCatId)
    : menu[0]

  function addToCart(menuItem: MenuItem, variantId: string | null, price: number, label: string | null) {
    const key = menuItem.id + (variantId ?? '')
    setCart((prev) => {
      const existing = prev.find((c) => c.id === key)
      if (existing) return prev.map((c) => c.id === key ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, {
        id: key,
        menuItemId: menuItem.id,
        variantId,
        name: menuItem.name,
        variantLabel: label,
        price,
        qty: 1,
      }]
    })
  }

  function handleAddItem(menuItem: MenuItem) {
    if (menuItem.is_market_price) return  // TODO: price input modal
    if (menuItem.variants.length > 1) {
      // Add all as half (default) — TODO: variant picker modal
      const def = menuItem.variants.find((v) => v.is_default) ?? menuItem.variants[0]
      addToCart(menuItem, def.id, def.price, def.label)
    } else {
      const v = menuItem.variants[0]
      addToCart(menuItem, v?.id ?? null, v?.price ?? 0, null)
    }
  }

  function updateQty(key: string, delta: number) {
    setCart((prev) =>
      prev.map((c) => c.id === key ? { ...c, qty: c.qty + delta } : c)
          .filter((c) => c.qty > 0)
    )
  }

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0)
  const gst = Math.round(subtotal * 0.05)
  const total = subtotal + gst

  const filteredItems = search
    ? menu.flatMap((c) => c.items).filter((m) =>
        m.name.toLowerCase().includes(search.toLowerCase())
      )
    : activeCategory?.items ?? []

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left: Category Sidebar */}
      <aside className="w-72 bg-surface-container-low border-r border-outline-variant/15 flex flex-col py-8 shrink-0 overflow-y-auto">
        <div className="px-8 mb-6">
          <h3 className="font-headline text-lg font-bold text-primary">Menu Categories</h3>
          <p className="text-xs text-on-surface-variant mt-1 font-medium">Select to filter items</p>
        </div>

        {isLoading && (
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
              const price = defaultPrice(menuItem)
              const hasVariants = menuItem.variants.length > 1

              return (
                <div
                  key={menuItem.id}
                  className="group relative flex items-center gap-4 bg-surface-container-lowest rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer"
                  onClick={() => handleAddItem(menuItem)}
                >
                  {/* Veg/Non-veg indicator */}
                  <div className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center shrink-0 ${menuItem.is_veg ? 'border-green-600' : 'border-red-600'}`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${menuItem.is_veg ? 'bg-green-600' : 'bg-red-600'}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-primary text-sm leading-tight">{menuItem.name}</h3>
                    {hasVariants && (
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {menuItem.variants.map((v) => `${v.label} ₹${v.price}`).join(' / ')}
                      </p>
                    )}
                    {menuItem.is_market_price && (
                      <p className="text-xs text-amber-600 font-medium mt-0.5">Market price</p>
                    )}
                  </div>

                  {/* Price + Add */}
                  <div className="flex items-center gap-3 shrink-0">
                    {!menuItem.is_market_price && (
                      <span className="font-bold text-primary text-sm">₹{price}</span>
                    )}
                    <button className="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center text-primary/40 group-hover:text-primary group-hover:border-primary transition-colors">
                      <span className="material-symbols-outlined text-sm">add</span>
                    </button>
                  </div>
                </div>
              )
            })}

            {!isLoading && filteredItems.length === 0 && (
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
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-headline text-2xl font-bold text-primary">Active Order</h3>
            <span className="bg-secondary-container text-on-secondary-container text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
              Table —
            </span>
          </div>
          <p className="text-xs text-on-surface-variant font-medium">New Order</p>
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
          <button
            disabled={cart.length === 0}
            className="w-full btn-primary py-4 flex items-center justify-center gap-3 disabled:opacity-40"
          >
            <span className="material-symbols-outlined">send</span>
            Send to Kitchen
          </button>
        </div>
      </aside>
    </div>
  )
}
