import type { HotelStatus } from "./common"

export interface Hotel {
  id: string
  name: string
  code: string
  description: string | null
  stars: number
  phone: string | null
  email: string | null
  address_line1: string | null
  city: string | null
  state: string | null
  country: string | null
  postal_code: string | null
  status: HotelStatus
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface HotelCreateRequest {
  name: string
  code: string
  description?: string
  stars?: number
  phone?: string
  email?: string
  address_line1?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
}

export interface HotelUpdateRequest {
  name?: string
  description?: string
  stars?: number
  phone?: string
  email?: string
  address_line1?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
}

export interface HotelStatusUpdate {
  status: HotelStatus
}
