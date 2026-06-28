import type { UserType, UserStatus } from "./common"

export interface Permission {
  id: string
  name: string
  code: string
  description: string | null
  module: string
  is_active: boolean
  created_at: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: UserProfile
}

export interface RefreshRequest {
  refresh_token: string
}

export interface UserProfile {
  id: string
  user_type: UserType
  hotel_id: string | null
  branch_id: string | null
  username: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  status: UserStatus
  hire_date: string | null
  last_login_at: string | null
  permissions: string[]
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  user_type: UserType
  hotel_id: string | null
  branch_id: string | null
  username: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  status: UserStatus
  hire_date: string | null
  termination_date: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface EmployeeCreateRequest {
  user_type: UserType
  hotel_id?: string
  branch_id?: string
  username: string
  password: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  hire_date?: string
}

export interface EmployeeUpdateRequest {
  user_type?: UserType
  branch_id?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  status?: UserStatus
  hire_date?: string
  termination_date?: string
}

export interface UserPermission {
  id: string
  user_id: string
  permission_id: string
  hotel_id: string
  granted_by: string
  expires_at: string | null
  created_at: string
  permission?: Permission
}
