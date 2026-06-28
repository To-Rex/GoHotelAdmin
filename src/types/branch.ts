import type { BranchStatus } from "./common"

export interface Branch {
  id: string
  hotel_id: string
  name: string
  code: string
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  postal_code: string | null
  phone: string | null
  email: string | null
  is_main_branch: boolean
  status: BranchStatus
  created_at: string
  updated_at: string
}

export interface BranchCreateRequest {
  hotel_id: string
  name: string
  code: string
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  phone?: string
  email?: string
  is_main_branch?: boolean
}

export interface BranchUpdateRequest {
  name?: string
  code?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  phone?: string
  email?: string
  is_main_branch?: boolean
  status?: BranchStatus
}
