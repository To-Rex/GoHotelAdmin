import api from "@/api/client"
import type {
  HousekeepingTask,
  HousekeepingTaskCreateRequest,
  HousekeepingTaskUpdateRequest,
  HousekeepingStatusUpdate,
  HousekeepingAssignRequest,
  TaskPhoto,
} from "@/types/housekeeping"

export async function getHousekeepingTasks(params?: Record<string, string>) {
  const res = await api.get("/housekeeping/tasks", { params })
  return res.data
}

export async function getMyHousekeepingTasks() {
  const res = await api.get("/housekeeping/tasks/my-tasks")
  return res.data
}

export async function getOpenHousekeepingTasks() {
  const res = await api.get("/housekeeping/tasks/open")
  return res.data
}

export async function getHousekeepingTask(
  id: string
): Promise<HousekeepingTask> {
  const res = await api.get(`/housekeeping/tasks/${id}`)
  return res.data
}

export async function createHousekeepingTask(
  data: HousekeepingTaskCreateRequest
): Promise<HousekeepingTask> {
  const { hotel_id, ...body } = data
  const params: Record<string, string> = {}
  if (hotel_id) params.hotel_id = hotel_id
  const res = await api.post("/housekeeping/tasks", body, { params })
  return res.data
}

export async function updateHousekeepingTask(
  id: string,
  data: HousekeepingTaskUpdateRequest
): Promise<HousekeepingTask> {
  const res = await api.put(`/housekeeping/tasks/${id}`, data)
  return res.data
}

export async function updateHousekeepingTaskStatus(
  id: string,
  data: HousekeepingStatusUpdate
): Promise<HousekeepingTask> {
  const res = await api.patch(`/housekeeping/tasks/${id}/status`, data)
  return res.data
}

export async function assignHousekeepingTask(
  id: string,
  data: HousekeepingAssignRequest
): Promise<HousekeepingTask> {
  const res = await api.post(`/housekeeping/tasks/${id}/assign`, data)
  return res.data
}

export async function getTaskPhotos(taskId: string, params?: Record<string, string>): Promise<TaskPhoto[]> {
  const res = await api.get(`/tasks/${taskId}/photos`, { params })
  return res.data
}
