import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import TopBar from '../components/shared/TopBar'
import {
  fetchRooms, fetchRoomTypes, updateRoom, createGuest, createBooking,
  listActiveBookings, checkOut,
  type Room, type Booking, type CheckoutSummary, type GuestCreate,
} from '../api/lodge'

// ── Housekeeping cycle ────────────────────────────────────────────────────────

const HK_CYCLE: Record<string, string> = {
  clean: 'dirty',
  dirty: 'in_progress',
  in_progress: 'clean',
}

const hkBadge: Record<string, string> = {
  clean: 'bg-emerald-100 text-emerald-700',
  dirty: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-rose-100 text-rose-700',
}

const hkLabel: Record<string, string> = {
  clean: 'Clean',
  dirty: 'Dirty',
  in_progress: 'Cleaning',
}

// ── Room card ─────────────────────────────────────────────────────────────────

function RoomCard({
  room,
  selected,
  onClick,
  onHkCycle,
}: {
  room: Room
  selected: boolean
  onClick: () => void
  onHkCycle: (e: React.MouseEvent) => void
}) {
  const isOccupied = room.status === 'occupied'

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl cursor-pointer transition-all border-2 ${
        selected
          ? 'border-primary shadow-lg scale-[1.02]'
          : isOccupied
          ? 'bg-primary border-primary/20 shadow-inner'
          : 'bg-surface-container-lowest border-outline-variant/15 hover:shadow-xl hover:border-outline-variant/40'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <span className={`text-lg font-bold font-headline ${isOccupied && !selected ? 'text-on-primary' : 'text-primary'}`}>
          {room.room_number}
        </span>
        {isOccupied ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary-container text-on-primary-container">
            Occupied
          </span>
        ) : (
          <button
            onClick={onHkCycle}
            title={`Mark as ${hkLabel[HK_CYCLE[room.housekeeping]] ?? room.housekeeping}`}
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-opacity hover:opacity-80 ${hkBadge[room.housekeeping] ?? 'bg-surface-variant text-on-surface-variant'}`}
          >
            {hkLabel[room.housekeeping] ?? room.housekeeping}
          </button>
        )}
      </div>
      <p className={`text-xs ${isOccupied && !selected ? 'text-on-primary/60' : 'text-on-surface-variant'}`}>
        Floor {room.floor}
      </p>
    </div>
  )
}

// ── Check-in form ─────────────────────────────────────────────────────────────

const ID_TYPES = [
  { value: 'aadhaar', label: 'Aadhaar' },
  { value: 'passport', label: 'Passport' },
  { value: 'driving_license', label: 'Driving Licence' },
  { value: 'voter_id', label: 'Voter ID' },
]

function fmtDt(iso: string) {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Renders a DD / MM / YYYY date input with a calendar icon that opens the
// native browser date picker. `value` / `onChange` use YYYY-MM-DD strings.
function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [yyyy, mm, dd] = value ? value.split('-') : ['', '', '']
  const hiddenRef = useRef<HTMLInputElement>(null)

  function update(newDd: string, newMm: string, newYyyy: string) {
    if (newDd && newMm && newYyyy && newYyyy.length === 4) {
      onChange(`${newYyyy}-${newMm.padStart(2, '0')}-${newDd.padStart(2, '0')}`)
    }
  }

  return (
    <div className="flex items-center gap-1 border-b border-outline-variant focus-within:border-primary transition-all py-2 flex-1">
      <input
        type="number" min={1} max={31} placeholder="DD"
        value={dd ? parseInt(dd, 10) : ''}
        onChange={(e) => update(e.target.value, mm, yyyy)}
        className="w-10 bg-transparent text-center text-sm text-primary font-medium focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="text-on-surface-variant/50 text-sm">/</span>
      <input
        type="number" min={1} max={12} placeholder="MM"
        value={mm ? parseInt(mm, 10) : ''}
        onChange={(e) => update(dd, e.target.value, yyyy)}
        className="w-10 bg-transparent text-center text-sm text-primary font-medium focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="text-on-surface-variant/50 text-sm">/</span>
      <input
        type="number" min={2024} max={2099} placeholder="YYYY"
        value={yyyy ? parseInt(yyyy, 10) : ''}
        onChange={(e) => update(dd, mm, e.target.value)}
        className="w-16 bg-transparent text-center text-sm text-primary font-medium focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      {/* Hidden native date picker triggered by the calendar icon */}
      <div className="relative ml-1">
        <button
          type="button"
          onClick={() => hiddenRef.current?.showPicker?.()}
          className="text-on-surface-variant hover:text-primary transition-colors"
          title="Open calendar"
        >
          <span className="material-symbols-outlined text-[18px]">calendar_month</span>
        </button>
        <input
          ref={hiddenRef}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 pointer-events-none w-0"
          tabIndex={-1}
        />
      </div>
    </div>
  )
}
function todayDateStr() { return toDateStr(new Date()) }
function tomorrowDateStr() { const d = new Date(); d.setDate(d.getDate() + 1); return toDateStr(d) }
function currentTimeStr() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function CheckInPanel({
  room,
  acUsed,
  setAcUsed,
  acRate,
  nonAcRate,
  onSuccess,
  onCancel,
  onHkUpdate,
}: {
  room: Room
  acUsed: boolean
  setAcUsed: (v: boolean) => void
  acRate: number
  nonAcRate: number
  onSuccess: () => void
  onCancel: () => void
  onHkUpdate: (hk: string) => void
}) {
  const [guestName, setGuestName] = useState('')
  const [phone, setPhone] = useState('')
  const [idType, setIdType] = useState<GuestCreate['id_type']>('aadhaar')
  const [idNumber, setIdNumber] = useState('')
  const [checkInDate, setCheckInDate] = useState(todayDateStr())
  const [checkInTime, setCheckInTime] = useState(currentTimeStr())
  const [checkOutDate, setCheckOutDate] = useState(tomorrowDateStr())
  const [checkOutTime, setCheckOutTime] = useState('12:00')
  const [numGuests, setNumGuests] = useState(1)
  const [advancePaid, setAdvancePaid] = useState(0)
  const [error, setError] = useState('')

  const qc = useQueryClient()

  const checkInMutation = useMutation({
    mutationFn: async () => {
      setError('')
      const guest = await createGuest({ name: guestName, phone, id_type: idType, id_number: idNumber })
      return createBooking({
        room_id: room.id,
        guest_id: guest.id,
        check_in_at: new Date(`${checkInDate}T${checkInTime}`).toISOString(),
        expected_check_out: new Date(`${checkOutDate}T${checkOutTime}`).toISOString(),
        num_guests: numGuests,
        advance_paid: advancePaid,
        ac_used: acUsed,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] })
      qc.invalidateQueries({ queryKey: ['bookings'] })
      onSuccess()
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail ?? 'Check-in failed. Please try again.')
    },
  })

  const rate = acUsed ? acRate : nonAcRate

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-headline font-bold text-primary">Check-In · Room {room.room_number}</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">Floor {room.floor}</p>
        </div>
        <button onClick={onCancel} className="text-on-surface-variant hover:text-primary">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Housekeeping status — prominent when room needs attention */}
      {room.housekeeping !== 'clean' && (
        <div className={`rounded-2xl p-4 border flex items-start gap-3 ${
          room.housekeeping === 'dirty'
            ? 'bg-amber-50 border-amber-200'
            : 'bg-rose-50 border-rose-200'
        }`}>
          <span className={`material-symbols-outlined mt-0.5 ${room.housekeeping === 'dirty' ? 'text-amber-600' : 'text-rose-600'}`}>
            cleaning_services
          </span>
          <div className="flex-1">
            <p className={`text-sm font-bold ${room.housekeeping === 'dirty' ? 'text-amber-800' : 'text-rose-800'}`}>
              Room is {room.housekeeping === 'dirty' ? 'dirty' : 'being cleaned'}
            </p>
            <p className="text-xs text-on-surface-variant mt-1">Update housekeeping status:</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onHkUpdate('in_progress')}
                className="text-xs font-bold px-3 py-1.5 rounded-full bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors"
              >
                Mark Cleaning
              </button>
              <button
                onClick={() => onHkUpdate('clean')}
                className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
              >
                Mark Clean
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AC toggle */}
      <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant/10">
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">AC Preference</p>
        <div className="flex rounded-full overflow-hidden border border-outline-variant/20">
          <button
            onClick={() => setAcUsed(true)}
            className={`flex-1 py-2 text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
              acUsed ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-base">ac_unit</span> AC
          </button>
          <button
            onClick={() => setAcUsed(false)}
            className={`flex-1 py-2 text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
              !acUsed ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-base">wind_power</span> Non-AC
          </button>
        </div>
        <p className="text-xs text-center mt-2 text-on-surface-variant">
          Rate: <span className="font-bold text-primary">₹{rate}/night</span>
          <span className="ml-1 opacity-60">+ 12% GST</span>
        </p>
      </div>

      {/* Guest details */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Guest Details</p>
        <input
          className="input-minimal"
          placeholder="Full Name *"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
        />
        <input
          className="input-minimal"
          placeholder="Phone *"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            className="input-minimal appearance-none"
            value={idType}
            onChange={(e) => setIdType(e.target.value as GuestCreate['id_type'])}
          >
            {ID_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input
            className="input-minimal"
            placeholder="ID Number *"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
          />
        </div>
      </div>

      {/* Stay details */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Stay</p>
        <div className="space-y-2">
          <label className="text-xs text-on-surface-variant">Check-In</label>
          <div className="flex items-center gap-3">
            <DateInput value={checkInDate} onChange={setCheckInDate} />
            <input
              className="input-minimal w-24"
              type="time"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-on-surface-variant">Expected Check-Out</label>
          <div className="flex items-center gap-3">
            <DateInput value={checkOutDate} onChange={setCheckOutDate} />
            <input
              className="input-minimal w-24"
              type="time"
              value={checkOutTime}
              onChange={(e) => setCheckOutTime(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-on-surface-variant">Guests</label>
            <input
              className="input-minimal"
              type="number"
              min={1}
              value={numGuests}
              onChange={(e) => setNumGuests(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs text-on-surface-variant">Advance (₹)</label>
            <input
              className="input-minimal"
              type="number"
              min={0}
              value={advancePaid}
              onChange={(e) => setAdvancePaid(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-error">{error}</p>}

      <button
        onClick={() => checkInMutation.mutate()}
        disabled={!guestName || !phone || !idNumber || checkInMutation.isPending}
        className="w-full btn-primary py-4 flex items-center justify-center gap-2 disabled:opacity-40"
      >
        <span className="material-symbols-outlined">login</span>
        {checkInMutation.isPending ? 'Checking In…' : 'Complete Check-In'}
      </button>
    </div>
  )
}

// ── Booking detail + checkout ─────────────────────────────────────────────────

function BookingPanel({
  booking,
  onCheckoutDone,
  onClose,
}: {
  booking: Booking
  onCheckoutDone: (summary: CheckoutSummary) => void
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [error, setError] = useState('')

  const checkOutMutation = useMutation({
    mutationFn: () => checkOut(booking.id),
    onSuccess: (summary) => {
      qc.invalidateQueries({ queryKey: ['rooms'] })
      qc.invalidateQueries({ queryKey: ['bookings'] })
      onCheckoutDone(summary)
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail ?? 'Checkout failed.')
    },
  })

  const checkInDate = new Date(booking.check_in_at)
  const expectedOut = new Date(booking.expected_check_out)
  const nights = Math.max(
    Math.ceil((expectedOut.getTime() - checkInDate.getTime()) / 86400000),
    1,
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-headline font-bold text-primary">
            Room {booking.room.room_number}
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">Active Booking</p>
        </div>
        <button onClick={onClose} className="text-on-surface-variant hover:text-primary">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Guest info */}
      <div className="bg-surface-container rounded-2xl p-5 space-y-2 border border-outline-variant/10">
        <div className="flex items-center gap-3 mb-3">
          <span className="material-symbols-outlined text-primary opacity-60 text-3xl">person</span>
          <div>
            <p className="font-bold text-primary">{booking.guest.name}</p>
            <p className="text-xs text-on-surface-variant">{booking.guest.phone}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-on-surface-variant uppercase tracking-widest font-bold">Check-In</p>
            <p className="text-primary font-medium mt-0.5">{fmtDt(booking.check_in_at)}</p>
          </div>
          <div>
            <p className="text-on-surface-variant uppercase tracking-widest font-bold">Expected Out</p>
            <p className="text-primary font-medium mt-0.5">{fmtDt(booking.expected_check_out)}</p>
          </div>
          <div>
            <p className="text-on-surface-variant uppercase tracking-widest font-bold">Guests</p>
            <p className="text-primary font-medium mt-0.5">{booking.num_guests}</p>
          </div>
          <div>
            <p className="text-on-surface-variant uppercase tracking-widest font-bold">AC</p>
            <p className="text-primary font-medium mt-0.5">{booking.ac_used ? 'Yes' : 'No'} · ₹{booking.nightly_rate}/night</p>
          </div>
        </div>
      </div>

      {/* Estimated charges */}
      <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant/10 space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">Estimated Bill</p>
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant">Room ({nights} night{nights !== 1 ? 's' : ''})</span>
          <span className="font-bold text-primary">₹{(booking.nightly_rate * nights).toLocaleString('en-IN')}</span>
        </div>
        {booking.advance_paid > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Advance Paid</span>
            <span className="font-bold text-emerald-600">−₹{booking.advance_paid.toLocaleString('en-IN')}</span>
          </div>
        )}
        <div className="flex justify-between text-sm border-t border-outline-variant/15 pt-2 mt-2">
          <span className="text-on-surface-variant">GST (12%)</span>
          <span className="font-bold text-primary">
            ₹{Math.round(booking.nightly_rate * nights * 0.12).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {error && <p className="text-xs text-error">{error}</p>}

      <button
        onClick={() => checkOutMutation.mutate()}
        disabled={checkOutMutation.isPending}
        className="w-full btn-primary py-4 flex items-center justify-center gap-2 disabled:opacity-40"
      >
        <span className="material-symbols-outlined">logout</span>
        {checkOutMutation.isPending ? 'Processing…' : 'Check Out & Generate Bill'}
      </button>
    </div>
  )
}

// ── Checkout receipt ──────────────────────────────────────────────────────────

function CheckoutReceipt({ summary, onDone }: { summary: CheckoutSummary; onDone: () => void }) {
  return (
    <div className="space-y-5 text-center">
      <span className="material-symbols-outlined text-6xl text-emerald-500 block">check_circle</span>
      <div>
        <h3 className="font-headline text-2xl font-bold text-primary">Checkout Complete</h3>
        <p className="text-on-surface-variant text-sm mt-1">
          Room {summary.booking.room.room_number} · {summary.booking.guest.name}
        </p>
      </div>

      <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant/10 text-left space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant">Nights</span>
          <span className="font-bold text-primary">{summary.nights}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant">Room charges</span>
          <span className="font-bold text-primary">₹{summary.room_charge.toLocaleString('en-IN')}</span>
        </div>
        {summary.other_charges !== 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Other / Advance</span>
            <span className={`font-bold ${summary.other_charges < 0 ? 'text-emerald-600' : 'text-primary'}`}>
              {summary.other_charges < 0 ? '−' : ''}₹{Math.abs(summary.other_charges).toLocaleString('en-IN')}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant">GST ({summary.gst_rate}%)</span>
          <span className="font-bold text-primary">₹{summary.gst_amount.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between border-t border-outline-variant/15 pt-2 mt-1">
          <span className="font-bold text-primary">Grand Total</span>
          <span className="font-headline text-xl font-bold text-primary">
            ₹{summary.grand_total.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      <button onClick={onDone} className="w-full btn-primary py-3">
        Done
      </button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type PanelState =
  | { type: 'none' }
  | { type: 'checkin'; room: Room }
  | { type: 'checkin_success'; roomNumber: string }
  | { type: 'booking'; booking: Booking }
  | { type: 'checkout'; summary: CheckoutSummary }

export default function LodgePage() {
  const qc = useQueryClient()
  const [acUsed, setAcUsed] = useState(true)
  const [panel, setPanel] = useState<PanelState>({ type: 'none' })

  const { data: rooms = [], isLoading } = useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: fetchRooms,
    refetchInterval: 30000,
  })

  const { data: roomTypes = [] } = useQuery({
    queryKey: ['room-types'],
    queryFn: fetchRoomTypes,
  })

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ['bookings'],
    queryFn: listActiveBookings,
    refetchInterval: 30000,
  })

  const hkMutation = useMutation({
    mutationFn: ({ roomId, hk }: { roomId: string; hk: string }) =>
      updateRoom(roomId, { housekeeping: hk }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  })

  const floor1 = rooms.filter((r) => r.floor === 1)
  const floor2 = rooms.filter((r) => r.floor === 2)
  const availableCount = rooms.filter((r) => r.status === 'available').length
  const occupiedCount = rooms.filter((r) => r.status === 'occupied').length
  const dirtyCount = rooms.filter((r) => r.housekeeping === 'dirty').length

  const acType = roomTypes.find((t) => t.name === 'AC Room')
  const nonAcType = roomTypes.find((t) => t.name === 'Non-AC Room')
  const acRate = acType?.base_rate ?? 1000
  const nonAcRate = nonAcType?.base_rate ?? 700

  function handleRoomClick(room: Room) {
    if (room.status === 'occupied') {
      const booking = bookings.find((b) => b.room_id === room.id)
      if (booking) setPanel({ type: 'booking', booking })
    } else if (room.status === 'available') {
      setPanel({ type: 'checkin', room })
    }
  }

  const selectedRoomId =
    panel.type === 'checkin' ? panel.room.id :
    panel.type === 'booking' ? panel.booking.room_id : null

  return (
    <div className="min-h-screen">
      <TopBar title="Lodge Management" />

      <div className="pt-6 px-10 pb-16 flex gap-10">
        {/* Left: Room grid */}
        <div className="flex-1 space-y-10">
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
                  <h3 className="text-3xl font-headline text-primary">{isLoading ? '—' : stat.count}</h3>
                </div>
                <span className={`material-symbols-outlined text-4xl opacity-40 ${stat.color}`}>{stat.icon}</span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 text-xs font-bold uppercase text-on-surface-variant">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Clean</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Dirty</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" />Cleaning</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary" />Occupied</span>
            <span className="ml-auto text-on-surface-variant/60 normal-case font-normal">
              Click available room to check in · Click occupied room to check out · Click status badge to cycle
            </span>
          </div>

          {isLoading ? (
            <div className="text-sm text-on-surface-variant animate-pulse">Loading rooms…</div>
          ) : (
            <>
              {floor1.length > 0 && (
                <section>
                  <h3 className="text-2xl font-headline text-primary mb-4">
                    Floor 1
                    <span className="text-sm font-sans font-normal text-on-surface-variant ml-3 italic">Rooms 101–105</span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {floor1.map((r) => (
                      <RoomCard
                        key={r.id}
                        room={r}
                        selected={r.id === selectedRoomId}
                        onClick={() => handleRoomClick(r)}
                        onHkCycle={(e) => {
                          e.stopPropagation()
                          hkMutation.mutate({ roomId: r.id, hk: HK_CYCLE[r.housekeeping] ?? 'clean' })
                        }}
                      />
                    ))}
                  </div>
                </section>
              )}

              {floor2.length > 0 && (
                <section>
                  <h3 className="text-2xl font-headline text-primary mb-4">
                    Floor 2
                    <span className="text-sm font-sans font-normal text-on-surface-variant ml-3 italic">Rooms 201–208</span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {floor2.map((r) => (
                      <RoomCard
                        key={r.id}
                        room={r}
                        selected={r.id === selectedRoomId}
                        onClick={() => handleRoomClick(r)}
                        onHkCycle={(e) => {
                          e.stopPropagation()
                          hkMutation.mutate({ roomId: r.id, hk: HK_CYCLE[r.housekeeping] ?? 'clean' })
                        }}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* Active bookings list */}
          {bookings.length > 0 && (
            <section>
              <h3 className="text-2xl font-headline text-primary mb-4">Active Bookings</h3>
              <div className="space-y-3">
                {bookings.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => setPanel({ type: 'booking', booking: b })}
                    className="card p-4 flex items-center gap-4 cursor-pointer hover:shadow-card-hover transition-all"
                  >
                    <span className="material-symbols-outlined text-primary opacity-50">bed</span>
                    <div className="flex-1">
                      <p className="font-bold text-primary text-sm">{b.guest.name}</p>
                      <p className="text-xs text-on-surface-variant">
                        Room {b.room.room_number} · {b.guest.phone}
                      </p>
                    </div>
                    <div className="text-right text-xs text-on-surface-variant">
                      <p>In: {fmtDt(b.check_in_at)}</p>
                      <p>Out: {fmtDt(b.expected_check_out)}</p>
                    </div>
                    <span className="material-symbols-outlined text-primary/30 text-sm">chevron_right</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right: Contextual panel */}
        <aside className="w-96 shrink-0">
          <div className="sticky top-24 bg-surface-container-low rounded-3xl p-7 border border-outline-variant/15 min-h-[300px]">
            {panel.type === 'none' && (
              <div className="text-center py-10 text-on-surface-variant">
                <span className="material-symbols-outlined text-5xl block mb-3 opacity-30">hotel</span>
                <p className="font-medium text-sm">Select a room to check in or check out a guest.</p>
              </div>
            )}

            {panel.type === 'checkin' && (
              <CheckInPanel
                room={panel.room}
                acUsed={acUsed}
                setAcUsed={setAcUsed}
                acRate={acRate}
                nonAcRate={nonAcRate}
                onSuccess={() => setPanel({ type: 'checkin_success', roomNumber: panel.room.room_number })}
                onCancel={() => setPanel({ type: 'none' })}
                onHkUpdate={(hk) => hkMutation.mutate({ roomId: panel.room.id, hk })}
              />
            )}

            {panel.type === 'checkin_success' && (
              <div className="text-center py-10 space-y-4">
                <span className="material-symbols-outlined text-6xl text-emerald-500 block">check_circle</span>
                <h3 className="font-headline text-2xl font-bold text-primary">Checked In!</h3>
                <p className="text-on-surface-variant text-sm">Room {panel.roomNumber} is now occupied.</p>
                <button onClick={() => setPanel({ type: 'none' })} className="btn-primary px-6 py-2.5">
                  Done
                </button>
              </div>
            )}

            {panel.type === 'booking' && (
              <BookingPanel
                booking={panel.booking}
                onCheckoutDone={(summary) => setPanel({ type: 'checkout', summary })}
                onClose={() => setPanel({ type: 'none' })}
              />
            )}

            {panel.type === 'checkout' && (
              <CheckoutReceipt
                summary={panel.summary}
                onDone={() => setPanel({ type: 'none' })}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
