import api from "@/api/client"
import type { Permission } from "@/types/auth"

export async function getPermissions(): Promise<Permission[]> {
  const res = await api.get("/permissions")
  return res.data
}

export async function getPermissionModules(): Promise<string[]> {
  const res = await api.get("/permissions/modules")
  return res.data
}

export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const res = await api.get(`/permissions/${userId}/permissions`)
  const data = res.data
  if (Array.isArray(data)) return data
  return data?.permissions ?? []
}

export async function setUserPermissions(
  userId: string,
  permissionIds: string[]
): Promise<void> {
  await api.put(`/permissions/${userId}/permissions`, {
    permission_ids: permissionIds,
  })
}

/**
 * Replace a user's permissions. The bulk endpoint rejects an empty list, so
 * clearing everything falls back to revoking the currently granted ones.
 */
export async function syncUserPermissions(
  userId: string,
  permissionIds: string[],
  currentIds: string[] = []
): Promise<void> {
  if (permissionIds.length > 0) {
    await setUserPermissions(userId, permissionIds)
    return
  }
  for (const id of currentIds) {
    await revokePermission(userId, id)
  }
}

export async function grantPermission(
  userId: string,
  permissionId: string
): Promise<void> {
  await api.post(`/permissions/${userId}/permissions/${permissionId}`)
}

export async function revokePermission(
  userId: string,
  permissionId: string
): Promise<void> {
  await api.delete(`/permissions/${userId}/permissions/${permissionId}`)
}
