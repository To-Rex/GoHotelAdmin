import type { ReportType } from "./common"

export interface Report {
  id: string
  hotel_id: string
  name: string
  report_type: ReportType
  parameters: Record<string, unknown>
  result_data: Record<string, unknown> | null
  generated_by: string | null
  generated_at: string | null
  created_at: string
}

export interface ReportGenerateRequest {
  hotel_id: string
  report_type: ReportType
  name?: string
  parameters?: Record<string, unknown>
}

export interface AuditLog {
  id: string
  hotel_id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  user?: { id: string; username: string; first_name: string; last_name: string }
}

export interface Notification {
  id: string
  hotel_id: string
  user_id: string | null
  title: string
  body: string
  entity_type: string | null
  entity_id: string | null
  is_read: boolean
  created_at: string
}
