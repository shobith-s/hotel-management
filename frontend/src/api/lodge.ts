import api from './client'

export interface RoomType {
  id: string
  name: string
  base_rate: number
  gst_rate: number
}

export interface Room {
  id: string
  room_number: string
  floor: number
  status: 'available' | 'occupied' | 'maintenance' | 'reserved'
  housekeeping: 'clean' | 'dirty' | 'in_progress'
  room_type: RoomType
}

export interface Guest {
  id: string
  name: string
  phone: string
  id_type: string
  id_number: string
  address: string | null
  created_at: string
}

export interface BookingCharge {
  id: string
  booking_id: string
  charge_type: string
  description: string
  amount: number
  order_id: string | null
  created_at: string
}

export type PaymentMode = 'cash' | 'card' | 'upi' | 'complimentary'

export interface Booking {
  id: string
  room_id: string
  guest_id: string
  checked_in_by: string
  check_in_at: string
  expected_check_out: string
  check_out_at: string | null
  num_guests: number
  advance_paid: number
  ac_used: boolean
  nightly_rate: number
  status: 'active' | 'checked_out' | 'cancelled'
  payment_mode: PaymentMode | null
  created_at: string
  guest: Guest
  room: Room
  charges: BookingCharge[]
}

export interface CheckoutSummary {
  booking: Booking
  nights: number
  room_charge: number
  nightly_rate: number
  ac_used: boolean
  gst_rate: number
  gst_amount: number
  other_charges: number
  grand_total: number
  payment_mode: PaymentMode
}

export interface GuestCreate {
  name: string
  phone: string
  id_type: 'aadhaar' | 'passport' | 'driving_license' | 'voter_id'
  id_number: string
  address?: string
}

export interface BookingCreate {
  room_id: string
  guest_id: string
  check_in_at: string
  expected_check_out: string
  num_guests: number
  advance_paid: number
  ac_used: boolean
}

export async function fetchRooms(): Promise<Room[]> {
  const res = await api.get<Room[]>('/lodge/rooms')
  return res.data
}

export async function fetchRoomTypes(): Promise<RoomType[]> {
  const res = await api.get<RoomType[]>('/lodge/room-types')
  return res.data
}

export async function updateRoom(
  roomId: string,
  data: { status?: string; housekeeping?: string },
): Promise<Room> {
  const res = await api.patch<Room>(`/lodge/rooms/${roomId}`, data)
  return res.data
}

export async function createGuest(data: GuestCreate): Promise<Guest> {
  const res = await api.post<Guest>('/lodge/guests', data)
  return res.data
}

export async function createBooking(data: BookingCreate): Promise<Booking> {
  const res = await api.post<Booking>('/lodge/bookings', data)
  return res.data
}

export async function listActiveBookings(): Promise<Booking[]> {
  const res = await api.get<Booking[]>('/lodge/bookings')
  return res.data
}

export async function checkOut(bookingId: string, paymentMode: PaymentMode): Promise<CheckoutSummary> {
  const res = await api.post<CheckoutSummary>(`/lodge/bookings/${bookingId}/checkout`, {
    payment_mode: paymentMode,
  })
  return res.data
}
