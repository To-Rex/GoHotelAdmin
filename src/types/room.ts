import type { RoomStatus } from "./common"

export interface RoomType {
  id: string
  name: string
  description: string | null
  capacity: number
  base_price: number
  amenities: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RoomTypeCreateRequest {
  name: string
  description?: string
  capacity?: number
  base_price: number
  amenities?: string[]
}

export interface RoomTypeUpdateRequest {
  name?: string
  description?: string
  capacity?: number
  base_price?: number
  amenities?: string[]
}

export interface RoomTypeStatusUpdate {
  is_active: boolean
}

export interface Floor {
  id: string
  hotel_id: string
  branch_id: string
  floor_number: number
  name: string | null
  created_at: string
  updated_at: string
}

export interface FloorCreateRequest {
  hotel_id: string
  branch_id: string
  floor_number: number
  name?: string
}

export interface FloorUpdateRequest {
  floor_number?: number
  name?: string
}

export interface Room {
  id: string
  hotel_id: string
  branch_id: string
  floor_id: string | null
  room_type_id: string | null
  room_number: string
  base_price: number
  capacity: number | null
  current_status: RoomStatus
  notes: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
  floor?: Floor
  room_type?: RoomType
  branch?: { id: string; name: string }
  amenities?: Amenity[]
}

export interface Amenity {
  id: string
  name: string
  icon: string | null
  is_active: boolean
  created_at: string
}

export interface AmenityCreateRequest {
  name: string
  icon?: string | null
}

export interface AmenityUpdateRequest {
  name?: string
  icon?: string | null
  is_active?: boolean
}

export interface RoomCreateRequest {
  hotel_id: string
  branch_id: string
  floor_id?: string
  room_type_id?: string
  room_number: string
  base_price?: number
  capacity?: number | null
  notes?: string
}

export interface RoomUpdateRequest {
  branch_id?: string
  floor_id?: string
  room_type_id?: string
  room_number?: string
  base_price?: number | null
  capacity?: number | null
  notes?: string
}

export interface RoomStatusUpdate {
  status: RoomStatus
  notes?: string
}

export interface RoomStatusHistory {
  id: string
  hotel_id: string
  room_id: string
  status: RoomStatus
  changed_by: string | null
  notes: string | null
  created_at: string
}
