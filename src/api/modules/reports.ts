import api from "@/api/client"
import type {
  Report,
  ReportGenerateRequest,
  AuditLog,
  Notification,
} from "@/types/other"

export async function getReports(params?: Record<string, string>) {
  const res = await api.get("/reports", { params })
  return res.data
}

export async function getReport(id: string): Promise<Report> {
  const res = await api.get(`/reports/${id}`)
  return res.data
}

export async function generateReport(
  data: ReportGenerateRequest
): Promise<Report> {
  const res = await api.post("/reports/generate", data)
  return res.data
}

export async function getAuditLogs(params?: Record<string, string>) {
  const res = await api.get("/audit-logs", { params })
  return res.data
}

export async function getNotifications(params?: Record<string, string>) {
  const res = await api.get("/notifications", { params })
  return res.data
}

export async function getBroadcastNotifications(params?: Record<string, string>) {
  const res = await api.get("/notifications/broadcasts", { params })
  return res.data
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`)
}
