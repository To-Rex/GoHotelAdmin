import {
  BellRing,
  Briefcase,
  Calculator,
  ClipboardList,
  Eye,
  ShieldCheck,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import type { Permission } from "@/types/auth"

export interface PermissionTemplate {
  /** i18n key suffix under `permissions.templates.*` */
  id: string
  icon: LucideIcon
  /** classes for the icon chip */
  accent: string
  /** exact permission codes or wildcard patterns ("housekeeping.*", "*.view", "*") */
  codes: string[]
}

/**
 * Role presets. Matching is done by permission *code*, not id, so a template
 * keeps working across environments and tolerates codes the backend adds later.
 */
export const PERMISSION_TEMPLATES: PermissionTemplate[] = [
  {
    id: "housekeeper",
    icon: Sparkles,
    accent: "bg-sky-50 text-sky-600",
    codes: [
      "room.view",
      "room.status.update",
      "housekeeping.task.update",
      "housekeeping.cleaning.*",
    ],
  },
  {
    id: "housekeepingLead",
    icon: ClipboardList,
    accent: "bg-teal-50 text-teal-600",
    codes: [
      "housekeeping.*",
      "room.view",
      "room.status.update",
      "room.manage",
      "employee.view",
      "report.view",
    ],
  },
  {
    id: "receptionist",
    icon: BellRing,
    accent: "bg-indigo-50 text-indigo-600",
    codes: [
      "reservation.*",
      "guest.*",
      "room.view",
      "room.status.update",
      "service.view",
      "finance.invoice.create",
      "finance.payment.create",
    ],
  },
  {
    id: "manager",
    icon: Briefcase,
    accent: "bg-violet-50 text-violet-600",
    codes: [
      "reservation.*",
      "guest.*",
      "room.*",
      "housekeeping.*",
      "service.*",
      "report.*",
      "finance.view",
      "finance.invoice.*",
      "finance.payment.*",
      "employee.view",
      "employee.create",
      "employee.update",
    ],
  },
  {
    id: "accountant",
    icon: Calculator,
    accent: "bg-amber-50 text-amber-600",
    codes: ["finance.*", "report.*", "reservation.view", "guest.view", "service.view"],
  },
  {
    id: "maintenance",
    icon: Wrench,
    accent: "bg-orange-50 text-orange-600",
    codes: [
      "room.view",
      "room.status.update",
      "housekeeping.task.create",
      "housekeeping.task.update",
    ],
  },
  {
    id: "viewer",
    icon: Eye,
    accent: "bg-slate-100 text-slate-600",
    codes: ["*.view"],
  },
  {
    id: "fullAccess",
    icon: ShieldCheck,
    accent: "bg-emerald-50 text-emerald-600",
    codes: ["*"],
  },
]

function matchesPattern(code: string, pattern: string): boolean {
  if (pattern === code) return true
  if (!pattern.includes("*")) return false
  const source = pattern
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*")
  return new RegExp(`^${source}$`).test(code)
}

/** Permissions from `list` that the template grants. */
export function resolveTemplatePermissions(
  template: PermissionTemplate,
  list: Permission[]
): Permission[] {
  return list.filter((p) => template.codes.some((pattern) => matchesPattern(p.code, pattern)))
}

export function templatePermissionIds(
  template: PermissionTemplate,
  list: Permission[]
): string[] {
  return resolveTemplatePermissions(template, list).map((p) => p.id)
}

/** The template whose resolved permission set is exactly `selectedIds`, if any. */
export function findMatchingTemplate(
  selectedIds: string[],
  list: Permission[]
): PermissionTemplate | null {
  if (selectedIds.length === 0) return null
  const selected = new Set(selectedIds)
  return (
    PERMISSION_TEMPLATES.find((template) => {
      const ids = templatePermissionIds(template, list)
      return ids.length === selected.size && ids.every((id) => selected.has(id))
    }) ?? null
  )
}
