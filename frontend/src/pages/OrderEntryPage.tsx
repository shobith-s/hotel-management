import { useState } from 'react'
import TopBar from '../components/shared/TopBar'

const categories = [
  { id: 'breakfast', icon: 'breakfast_dining', label: 'Breakfast' },
  { id: 'mains', icon: 'restaurant', label: 'Mains' },
  { id: 'dessert', icon: 'icecream', label: 'Dessert' },
  { id: 'drinks', icon: 'local_bar', label: 'Drinks' },
  { id: 'breads', icon: 'grain', label: 'Breads' },
]

const menuItems = [
  { id: '1', name: 'Paneer Butter Masala', price: 340, desc: 'Cubes of fresh cottage cheese simmered in a rich tomato and butter gravy with aromatic spices.', veg: true },
  { id: '2', name: 'Dal Makhani', price: 280, desc: 'Black lentils slow-cooked for 12 hours with cream, butter and traditional spices.', veg: true },
  { id: '3', name: 'Tandoori Chicken', price: 420, desc: 'Spring chicken marinated in yoghurt and spices, roasted in our clay oven.', veg: false },
  { id: '4', name: 'Butter Naan', price: 60, desc: 'Traditional leavened bread brushed with melting fresh butter, served hot from the tandoor.', veg: true },
  { id: '5', name: 'Mutton Rogan Josh', price: 480, desc: 'Slow-braised mutton in aromatic spices — the house specialty.', veg: false },
  { id: '6', name: 'Veg Biryani', price: 260, desc: 'Fragrant basmati rice layered with seasonal vegetables and saffron.', veg: true },
]

interface CartItem {
  id: string
  name: string
  price: number
  qty: number
}

export default function OrderEntryPage() {
  const [activeCategory, setActiveCategory] = useState('mains')
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')

  function addToCart(item: (typeof menuItems)[0]) {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id)
      if (existing) return prev.map((c) => c.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }]
    })
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) => c.id === id ? { ...c, qty: c.qty + delta } : c)
        .filter((c) => c.qty > 0)
    )
  }

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0)
  const gst = Math.round(subtotal * 0.05)
  const total = subtotal + gst

  const filtered = menuItems.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left: Category Sidebar */}
      <aside className="w-72 bg-surface-container-low border-r border-outline-variant/15 flex flex-col py-8 gap-y-2 shrink-0">
        <div className="px-8 mb-6">
          <h3 className="font-headline text-lg font-bold text-primary">Menu Categories</h3>
          <p className="text-xs text-on-surface-variant mt-1 font-medium">Select to filter items</p>
        </div>
        <nav className="flex flex-col gap-y-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={
                activeCategory === cat.id
                  ? 'bg-gradient-to-r from-primary to-primary-container text-white rounded-full mx-4 py-3 px-6 shadow-lg flex items-center gap-4 font-medium'
                  : 'py-3 px-10 transition-transform hover:translate-x-1 flex items-center gap-4 text-primary/70 font-medium'
              }
            >
              <span className="material-symbols-outlined text-[22px]">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Center: Menu Grid */}
      <main className="flex-1 bg-surface overflow-y-auto">
        <TopBar />
        <div className="p-10 max-w-5xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h1 className="font-headline text-4xl font-bold text-primary tracking-tight">
                {categories.find((c) => c.id === activeCategory)?.label ?? 'Menu'}
              </h1>
              <p className="text-on-surface-variant mt-2 max-w-md">
                Chef's signature specialties and authentic Indian cuisine.
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="group relative flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-500 cursor-pointer"
              >
                {/* Placeholder food image */}
                <div className="relative h-48 w-full bg-surface-container-high flex items-center justify-center">
                  <span className="material-symbols-outlined text-6xl text-primary/20">
                    {item.veg ? 'eco' : 'kebab_dining'}
                  </span>
                  {/* Veg/Non-veg dot */}
                  <div className={`absolute top-3 right-3 w-4 h-4 rounded-full border-2 border-white ${item.veg ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-headline text-xl font-bold text-primary">{item.name}</h3>
                    <span className="text-primary font-bold">₹{item.price}</span>
                  </div>
                  <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">{item.desc}</p>
                  <button
                    onClick={() => addToCart(item)}
                    className="mt-auto self-start text-xs font-bold tracking-widest uppercase text-primary/40 group-hover:text-primary transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">add_circle</span>
                    Add to Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Right: Cart */}
      <aside className="w-[420px] bg-surface-container-lowest flex flex-col shadow-[-20px_0_40px_rgba(26,28,26,0.02)] border-l border-outline-variant/15 shrink-0">
        <div className="p-8 border-b border-outline-variant/10">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-headline text-2xl font-bold text-primary">Active Order</h3>
            <span className="bg-secondary-container text-on-secondary-container text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
              Table 04
            </span>
          </div>
          <p className="text-xs text-on-surface-variant font-medium">Order #— • New Order</p>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {cart.length === 0 && (
            <div className="text-center py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl mb-3 block opacity-30">shopping_cart</span>
              <p className="text-sm font-medium">No items added yet</p>
            </div>
          )}
          {cart.map((item) => (
            <div key={item.id} className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-lg bg-surface-container-low flex-shrink-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary/30">restaurant</span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-primary text-sm">{item.name}</h4>
                  <span className="text-sm font-bold text-primary">₹{item.price * item.qty}</span>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => updateQty(item.id, -1)}
                    className="w-6 h-6 rounded-full border border-outline-variant flex items-center justify-center text-primary hover:bg-surface-container-low"
                  >
                    <span className="material-symbols-outlined text-xs">remove</span>
                  </button>
                  <span className="text-xs font-bold text-primary">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.id, 1)}
                    className="w-6 h-6 rounded-full border border-outline-variant flex items-center justify-center text-primary hover:bg-surface-container-low"
                  >
                    <span className="material-symbols-outlined text-xs">add</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Totals */}
        <div className="p-8 bg-surface-container-low">
          <div className="space-y-3 mb-8">
            <div className="flex justify-between text-sm text-on-surface-variant">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-on-surface-variant">
              <span>GST (5%)</span>
              <span>₹{gst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-outline-variant/20">
              <span className="font-bold text-primary text-lg">Total</span>
              <span className="font-headline font-bold text-primary text-2xl italic">
                ₹{total.toFixed(2)}
              </span>
            </div>
          </div>
          <button
            disabled={cart.length === 0}
            className="w-full btn-primary py-5 flex items-center justify-center gap-3 disabled:opacity-40"
          >
            <span className="material-symbols-outlined">payment</span>
            Checkout & Pay
          </button>
        </div>
      </aside>
    </div>
  )
}
