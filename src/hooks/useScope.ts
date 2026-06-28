import { useAuthStore } from "@/store/auth"

export function useScope() {
  const user = useAuthStore((s) => s.user)

  const isSuperAdmin = user?.user_type === "SUPER_ADMIN"
  const isAdmin = user?.user_type === "ADMIN"
  const isEmployee = user?.user_type === "EMPLOYEE"
  const hotelId = user?.hotel_id || null
  const branchId = user?.branch_id || null

  const scopeFilter = (): Record<string, string> => {
    if (isSuperAdmin) return {}
    const filter: Record<string, string> = {}
    if (hotelId) filter.hotel_id = hotelId
    if (branchId) filter.branch_id = branchId
    return filter
  }

  const scopeMerge = (params?: Record<string, string>): Record<string, string> => {
    return { ...(params || {}), ...scopeFilter() }
  }

  const canManageHotel = (targetHotelId: string): boolean => {
    if (isSuperAdmin) return true
    return hotelId === targetHotelId
  }

  const canManageBranch = (targetBranchId: string, targetHotelId: string): boolean => {
    if (isSuperAdmin) return true
    if (hotelId !== targetHotelId) return false
    if (isAdmin && !branchId) return true
    return branchId === targetBranchId
  }

  return {
    user,
    isSuperAdmin,
    isAdmin,
    isEmployee,
    hotelId,
    branchId,
    scopeFilter,
    scopeMerge,
    canManageHotel,
    canManageBranch,
  }
}
