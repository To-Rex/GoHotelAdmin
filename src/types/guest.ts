export interface Guest {
  id: string
  hotel_id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  passport_number: string | null
  nationality: string | null
  birth_date: string | null
  id_document_type: string | null
  id_document_number: string | null
  address: string | null
  notes: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface GuestCreateRequest {
  hotel_id: string
  first_name: string
  last_name: string
  phone?: string
  email?: string
  passport_number?: string
  nationality?: string
  birth_date?: string
  id_document_type?: string
  id_document_number?: string
  address?: string
  notes?: string
}

export interface GuestUpdateRequest {
  first_name?: string
  last_name?: string
  phone?: string
  email?: string
  passport_number?: string
  nationality?: string
  birth_date?: string
  id_document_type?: string
  id_document_number?: string
  address?: string
  notes?: string
}
