import api from "@/api/client"
import type { Permission, UserPermission } from "@/types/auth"

export async function getPermissions(): Promise<Permission[]> {
  const res = await api.get("/permissions")
  return res.data
}

export async function getPermissionModules(): Promise<string[]> {
  const res = await api.get("/permissions/modules")
  return res.data
}

export async function getUserPermissions(
  userId: string
): Promise<UserPermission[]> {
  const res = await api.get(`/permissions/${userId}/permissions`)
  return res.data
}

export async function setUserPermissions(
  userId: string,
  permissionIds: string[]
): Promise<void> {
  await api.put(`/permissions/${userId}/permissions`, {
    permission_ids: permissionIds,
  })
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
