import type { ServiceCategory } from "./common"

export interface Service {
  id: string
  name: string
  code: string
  description: string | null
  category: ServiceCategory
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ServiceCreateRequest {
  name: string
  code: string
  description?: string
  category: string
}

export interface ServiceUpdateRequest {
  name?: string
  code?: string
  description?: string
  category?: string
  is_active?: boolean
}

export interface HotelService {
  id: string
  hotel_id: string
  service_id: string
  price: number
  is_active: boolean
  created_at: string
  updated_at: string
  service?: Service
}

export interface HotelServiceCreateRequest {
  hotel_id: string
  service_id: string
  price: number
}

export interface HotelServiceUpdateRequest {
  price?: number
  is_active?: boolean
}
