import type {
  HousekeepingTaskType,
  HousekeepingStatus,
  HousekeepingPriority,
} from "./common"

export interface HousekeepingTask {
  id: string
  hotel_id: string
  branch_id: string
  room_id: string
  task_type: HousekeepingTaskType
  status: HousekeepingStatus
  priority: HousekeepingPriority
  assigned_to: string | null
  notes: string | null
  scheduled_date: string | null
  started_at: string | null
  completed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  photo_count: number
  room?: { id: string; room_number: string }
  assigned_user?: { id: string; first_name: string; last_name: string }
  branch?: { id: string; name: string }
}

export interface HousekeepingTaskCreateRequest {
  hotel_id?: string
  branch_id: string
  room_id: string
  task_type: HousekeepingTaskType
  priority?: HousekeepingPriority
  assigned_to?: string
  notes?: string
  scheduled_date?: string
}

export interface HousekeepingTaskUpdateRequest {
  task_type?: HousekeepingTaskType
  priority?: HousekeepingPriority
  assigned_to?: string
  notes?: string
  scheduled_date?: string
}

export interface HousekeepingStatusUpdate {
  status: HousekeepingStatus
  notes?: string
}

export interface HousekeepingAssignRequest {
  assigned_to: string
}

export interface TaskPhoto {
  id: string
  file_name: string
  mime_type: string
  file_size: number
  uploaded_by: string
  created_at: string | null
  download_url: string
}
