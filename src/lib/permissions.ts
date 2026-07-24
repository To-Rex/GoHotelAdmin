import { useAuthStore } from "@/store/auth"
import type { UserProfile } from "@/types/auth"

/**
 * Ruxsat kodlari backenddagi `permissions` jadvali bilan bir xil (55 ta, 13 modul).
 * `/auth/me` EMPLOYEE uchun shu kodlar ro'yxatini qaytaradi; SUPER_ADMIN va ADMIN
 * uchun ro'yxat bo'sh keladi — ular o'z mehmonxonasida to'liq huquqli.
 *
 * Qoida:
 *   SUPER_ADMIN — hamma narsa, barcha mehmonxonalar.
 *   ADMIN       — o'z mehmonxonasida to'liq (barcha ruxsatlar berilgan deb hisoblanadi).
 *   EMPLOYEE    — faqat berilgan ruxsat kodlari (manager = keng to'plamli EMPLOYEE).
 */

// SUPER_ADMIN va ADMIN barcha tekshiruvlarni chetlab o'tadi (to'liq huquq)
export function hasFullAccess(user: UserProfile | null | undefined): boolean {
  return user?.user_type === "SUPER_ADMIN" || user?.user_type === "ADMIN"
}

export function userCan(user: UserProfile | null | undefined, ...codes: string[]): boolean {
  if (!user) return false
  if (hasFullAccess(user)) return true
  if (codes.length === 0) return true
  const owned = user.permissions || []
  return codes.some((c) => owned.includes(c))
}

/**
 * Admin panelga kirishga ruxsat: SUPER_ADMIN, ADMIN, yoki kamida bitta ruxsatga
 * ega EMPLOYEE (manager/reception). Ruxsatsiz xodimlar kiritilmaydi.
 */
export function isAllowedInAdminPanel(user: UserProfile | null | undefined): boolean {
  if (!user) return false
  if (user.user_type === "SUPER_ADMIN" || user.user_type === "ADMIN") return true
  if (user.user_type === "EMPLOYEE") return (user.permissions?.length || 0) > 0
  return false
}

// Faqat SUPER_ADMIN uchun ochiq marshrutlar (platforma darajasi)
export const SUPER_ADMIN_ROUTES = ["/hotels", "/audit-logs"]

// Har bir marshrut uchun ruxsat kodlari (bittasi bo'lsa yetarli — OR).
// Bo'sh massiv yoki ro'yxatda yo'q marshrut — har qanday kirgan foydalanuvchiga ochiq.
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/": [], // Dashboard — hamma ko'radi
  "/hotels": [], // SUPER_ADMIN_ROUTES orqali cheklanadi
  "/branches": ["branch.create", "branch.update"],
  "/rooms": ["room.view", "room.manage", "room.create", "room.update", "room.status.update"],
  "/room-types": ["room.view", "room_type.create", "room_type.update", "room_type.delete"],
  "/amenities": ["room.view", "room.manage"],
  "/floors": ["floor.create", "floor.update", "floor.delete"],
  "/guests": ["guest.view", "guest.create", "guest.update"],
  "/reservations": ["reservation.view", "reservation.create"],
  "/booking": ["reservation.create", "reservation.view"],
  "/housekeeping": [
    "housekeeping.task.create",
    "housekeeping.task.assign",
    "housekeeping.task.update",
    "housekeeping.cleaning.start",
    "housekeeping.cleaning.complete",
  ],
  "/employees": ["employee.view", "employee.create", "employee.update"],
  "/permissions": ["permission.view", "permission.assign", "employee.manage"],
  "/services": ["service.view", "service.manage", "service.create", "hotel_service.manage"],
  "/finance/invoices": ["finance.view", "finance.invoice.create", "finance.invoice.manage"],
  "/finance/payments": ["finance.view", "finance.payment.create"],
  "/finance/ledger": ["finance.view", "finance.journal.create"],
  "/reports": ["report.view", "report.generate", "report.export"],
  "/audit-logs": [], // SUPER_ADMIN_ROUTES orqali cheklanadi
  "/notifications": [], // hamma ko'radi
}

export function usePermissions() {
  const user = useAuthStore((s) => s.user)

  const isSuperAdmin = user?.user_type === "SUPER_ADMIN"
  const isAdmin = user?.user_type === "ADMIN"
  const fullAccess = hasFullAccess(user)

  // Bitta yoki bir nechta kod — bittasi bo'lsa true (OR)
  const can = (...codes: string[]): boolean => userCan(user, ...codes)

  const canRoute = (path: string): boolean => {
    if (SUPER_ADMIN_ROUTES.includes(path)) return !!isSuperAdmin
    if (fullAccess) return true
    const required = ROUTE_PERMISSIONS[path]
    if (!required || required.length === 0) return true
    return can(...required)
  }

  // Ruxsati yo'q sahifaga kirilganda yo'naltiriladigan birinchi ochiq marshrut
  const firstAllowedRoute = (): string => {
    const order = [
      "/",
      "/booking",
      "/reservations",
      "/guests",
      "/rooms",
      "/housekeeping",
      "/finance/invoices",
      "/reports",
      "/notifications",
    ]
    return order.find((p) => canRoute(p)) ?? "/"
  }

  return {
    user,
    isSuperAdmin,
    isAdmin,
    hasFullAccess: fullAccess,
    permissions: user?.permissions ?? [],
    can,
    canRoute,
    firstAllowedRoute,
  }
}
