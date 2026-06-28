import type { ReservationStatus, BookingType, PaymentStatus, PaymentMethod } from "./common"

export interface Reservation {
  id: string
  hotel_id: string
  branch_id: string
  reservation_number: string
  guest_id: string
  room_id: string
  booking_type: BookingType
  check_in_date: string
  check_out_date: string
  check_in_datetime: string | null
  check_out_datetime: string | null
  adults: number
  children: number
  status: ReservationStatus
  total_amount: number
  paid_amount: number
  payment_status: PaymentStatus
  discount_amount: number
  discount_percent: number
  notes: string | null
  created_by: string | null
  cancelled_reason: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  created_at: string
  updated_at: string
  guest?: { id: string; first_name: string; last_name: string }
  room?: { id: string; room_number: string }
  branch?: { id: string; name: string }
}

export interface ReservationCreateRequest {
  hotel_id: string
  branch_id: string
  guest_id: string
  room_id: string
  booking_type?: BookingType
  check_in_date: string
  check_out_date: string
  check_in_datetime?: string | null
  check_out_datetime?: string | null
  adults?: number
  children?: number
  discount_amount?: number
  discount_percent?: number
  notes?: string
  payment_amount?: number
  payment_method?: PaymentMethod | null
}

export interface ReservationUpdateRequest {
  guest_id?: string
  room_id?: string
  check_in_date?: string
  check_out_date?: string
  adults?: number
  children?: number
  discount_amount?: number
  discount_percent?: number
  notes?: string
}

export interface CheckInRequest {
  notes?: string
}

export interface CheckOutRequest {
  notes?: string
}

export interface CancelRequest {
  reason: string
}

export interface ReservationService {
  id: string
  hotel_id: string
  reservation_id: string
  hotel_service_id: string
  quantity: number
  unit_price: number
  total_price: number
  service_date: string
  notes: string | null
  created_at: string
}

export interface ReservationServiceCreateRequest {
  hotel_service_id: string
  quantity: number
  service_date?: string
  notes?: string
}
