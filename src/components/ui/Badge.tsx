import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import i18n from "@/i18n"

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  INACTIVE: "bg-gray-100 text-gray-800",
  TERMINATED: "bg-red-100 text-red-800",
  SUSPENDED: "bg-yellow-100 text-yellow-800",
  CLOSED: "bg-red-100 text-red-800",
  AVAILABLE: "bg-emerald-100 text-emerald-800",
  RESERVED: "bg-blue-100 text-blue-800",
  OCCUPIED: "bg-purple-100 text-purple-800",
  CLEANING: "bg-orange-100 text-orange-800",
  MAINTENANCE: "bg-yellow-100 text-yellow-800",
  OUT_OF_SERVICE: "bg-red-100 text-red-800",
  INSPECTION: "bg-cyan-100 text-cyan-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  CHECKED_IN: "bg-emerald-100 text-emerald-800",
  CHECKED_OUT: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
  NO_SHOW: "bg-gray-200 text-gray-800",
  OPEN: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  DRAFT: "bg-gray-100 text-gray-800",
  ISSUED: "bg-blue-100 text-blue-800",
  PARTIALLY_PAID: "bg-yellow-100 text-yellow-800",
  PAID: "bg-emerald-100 text-emerald-800",
  REFUNDED: "bg-purple-100 text-purple-800",
  POSTED: "bg-emerald-100 text-emerald-800",
  VOIDED: "bg-red-100 text-red-800",
  LOW: "bg-gray-100 text-gray-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
  SUPER_ADMIN: "bg-red-100 text-red-800",
  ADMIN: "bg-purple-100 text-purple-800",
  EMPLOYEE: "bg-blue-100 text-blue-800",
}

function formatLabel(status: string): string {
  const key = `status.${status}`
  const translated = i18n.t(key)
  if (translated !== key) return translated
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function Badge({
  variant,
  className,
}: {
  variant: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusStyles[variant] || "bg-gray-100 text-gray-800",
        className
      )}
    >
      {formatLabel(variant)}
    </span>
  )
}
