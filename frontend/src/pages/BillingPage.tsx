import { useState } from 'react'
import TopBar from '../components/shared/TopBar'

const charges = [
  { icon: 'bed', label: 'Deluxe Suite – Garden View', detail: '3 Nights × ₹12,500.00', amount: 37500 },
  { icon: 'restaurant', label: 'In-Room Dining & Bar', detail: '4 Orders (Room Service)', amount: 6420 },
  { icon: 'local_laundry_service', label: 'Express Laundry Service', detail: '5 Items (Dry Cleaned)', amount: 1250 },
]

type PaymentMode = 'cash' | 'card' | 'upi'

const paymentOptions: { mode: PaymentMode; icon: string; label: string; sub: string }[] = [
  { mode: 'cash', icon: 'payments', label: 'Cash', sub: 'Settle at Front Desk' },
  { mode: 'card', icon: 'credit_card', label: 'Card', sub: 'Visa, Master, Amex' },
  { mode: 'upi', icon: 'qr_code_2', label: 'UPI', sub: 'Google Pay, PhonePe' },
]

export default function BillingPage() {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash')

  const subtotal = charges.reduce((s, c) => s + c.amount, 0)
  const gst = Math.round(subtotal * 0.18)
  const serviceCharge = Math.round(subtotal * 0.05)
  const grandTotal = subtotal + gst + serviceCharge

  return (
    <div className="min-h-screen">
      <TopBar title="Billing & Checkout" />

      <main className="p-10 lg:p-16">
        {/* Header */}
        <header className="mb-16 flex justify-between items-end">
          <div>
            <nav className="flex gap-2 text-sm text-on-surface-variant mb-4">
              <span>Dashboard</span>
              <span>/</span>
              <span className="font-bold text-primary">Billing & Checkout</span>
            </nav>
            <h2 className="font-headline text-5xl font-bold tracking-tight text-primary">
              Guest Final Folio
            </h2>
          </div>
          <button className="px-6 py-3 rounded-full bg-surface-container-highest text-on-surface font-semibold flex items-center gap-2 hover:bg-surface-variant transition-colors">
            <span className="material-symbols-outlined text-xl">edit</span>
            Edit Stay
          </button>
        </header>

        <div className="grid grid-cols-12 gap-10">
          {/* Left: Guest + Charges + Payment */}
          <div className="col-span-12 lg:col-span-8 space-y-10">
            {/* Guest Profile */}
            <section className="card p-8 flex items-center gap-8">
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-primary-fixed-dim flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-4xl text-primary/40">person</span>
              </div>
              <div className="flex-grow">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline text-2xl font-bold text-primary">Aryan Sharma</h3>
                  <span className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold uppercase tracking-wider">
                    Platinum Member
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-6 mt-4">
                  <div>
                    <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">Room</p>
                    <p className="text-lg font-medium">Suite 402 (Deluxe)</p>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">Stay Period</p>
                    <p className="text-lg font-medium">Oct 12 — Oct 15</p>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">Guest ID</p>
                    <p className="text-lg font-medium">#SK-9942</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Itemized Charges */}
            <section className="bg-surface rounded-xl overflow-hidden border-b border-outline-variant/10">
              <div className="px-4 py-3 bg-surface-container-low border-b border-outline-variant/10 flex justify-between items-center">
                <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
                  Billable Items
                </h4>
                <span className="text-xs text-on-surface-variant">3 Nights, 4 Days</span>
              </div>
              <div className="divide-y divide-outline-variant/10">
                {charges.map((charge, i) => (
                  <div
                    key={i}
                    className="p-6 flex justify-between items-center hover:bg-surface-container-lowest transition-colors"
                  >
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-lg bg-secondary-fixed flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">{charge.icon}</span>
                      </div>
                      <div>
                        <h5 className="font-bold text-primary">{charge.label}</h5>
                        <p className="text-sm text-on-surface-variant">{charge.detail}</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-primary">₹{charge.amount.toLocaleString('en-IN')}.00</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Payment Method */}
            <section className="space-y-6">
              <h4 className="font-headline text-2xl font-bold text-primary">Payment Method</h4>
              <div className="grid grid-cols-3 gap-4">
                {paymentOptions.map((opt) => (
                  <label key={opt.mode} className="relative cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      className="sr-only peer"
                      checked={paymentMode === opt.mode}
                      onChange={() => setPaymentMode(opt.mode)}
                    />
                    <div className="p-6 rounded-xl bg-surface-container-low border-2 border-transparent peer-checked:border-primary peer-checked:bg-surface-container-lowest transition-all">
                      <span className="material-symbols-outlined text-3xl mb-2 block text-primary">
                        {opt.icon}
                      </span>
                      <p className="font-bold text-primary">{opt.label}</p>
                      <p className="text-xs text-on-surface-variant">{opt.sub}</p>
                    </div>
                  </label>
                ))}
              </div>
            </section>
          </div>

          {/* Right: Receipt */}
          <div className="col-span-12 lg:col-span-4">
            <div className="sticky top-10 space-y-6">
              <div className="bg-surface-container-lowest rounded-xl shadow-modal overflow-hidden border border-outline-variant/10">
                {/* Amount Due header */}
                <div className="bg-primary p-8 text-on-primary text-center">
                  <p className="text-xs uppercase tracking-[0.2em] opacity-70 mb-2 font-bold">
                    Total Amount Due
                  </p>
                  <h3 className="font-headline text-4xl font-bold tracking-tighter">
                    ₹{subtotal.toLocaleString('en-IN')}.00
                  </h3>
                </div>

                {/* Breakdown */}
                <div className="p-8 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Subtotal</span>
                    <span className="font-bold text-primary">₹{subtotal.toLocaleString('en-IN')}.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">GST (18%)</span>
                    <span className="font-bold text-primary">₹{gst.toLocaleString('en-IN')}.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Service Charge (5%)</span>
                    <span className="font-bold text-primary">₹{serviceCharge.toLocaleString('en-IN')}.00</span>
                  </div>
                  <div className="pt-4 border-t border-dashed border-outline-variant/30 mt-6">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs uppercase font-bold text-on-surface-variant tracking-widest">
                          Grand Total
                        </p>
                        <h4 className="font-headline text-3xl font-bold text-primary mt-1">
                          ₹{grandTotal.toLocaleString('en-IN')}.00
                        </h4>
                      </div>
                      <span className="material-symbols-outlined text-4xl text-primary/10">receipt</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-8 pb-8 space-y-3">
                  <button className="w-full btn-primary py-4 flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-xl">check_circle</span>
                    Complete Checkout
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="py-3 rounded-xl bg-surface-container-high text-primary font-bold text-sm flex items-center justify-center gap-2 hover:bg-surface-variant transition-all">
                      <span className="material-symbols-outlined text-lg">print</span>
                      Print Bill
                    </button>
                    <button className="py-3 rounded-xl bg-surface-container-high text-primary font-bold text-sm flex items-center justify-center gap-2 hover:bg-surface-variant transition-all">
                      <span className="material-symbols-outlined text-lg">mail</span>
                      Email PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* Policy note */}
              <div className="p-6 bg-tertiary-fixed rounded-xl flex gap-4">
                <span className="material-symbols-outlined text-primary">info</span>
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">
                    Billing Policy
                  </p>
                  <p className="text-sm text-on-tertiary-fixed-variant leading-relaxed">
                    Early checkout penalties may apply for changes made after 12:00 PM. All charges include applicable taxes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
