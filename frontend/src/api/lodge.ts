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
  status: 'available' | 'occupied' | 'dirty' | 'maintenance'
  housekeeping: 'clean' | 'dirty' | 'in_service'
  room_type: RoomType
}

export async function fetchRooms(): Promise<Room[]> {
  const res = await api.get<Room[]>('/lodge/rooms')
  return res.data
}

export async function fetchRoomTypes(): Promise<RoomType[]> {
  const res = await api.get<RoomType[]>('/lodge/room-types')
  return res.data
}
