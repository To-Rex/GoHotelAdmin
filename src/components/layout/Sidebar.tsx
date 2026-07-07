import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Building2,
  GitBranch,
  DoorOpen,
  Users,
  CalendarCheck,
  CalendarPlus,
  UserCog,
  Shield,
  Bell,
  Brush,
  Receipt,
  BarChart3,
  ClipboardList,
  Package,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
} from "lucide-react"
import { useAuthStore } from "@/store/auth"
import { useTranslation } from "react-i18next"

interface SidebarProps {
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}

export function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const { t } = useTranslation()

  const isSuperAdmin = user?.user_type === "SUPER_ADMIN"

  const navigation = [
    {
      section: t("sidebar.main"),
      items: [
        { name: t("sidebar.dashboard"), href: "/", icon: LayoutDashboard },
        { name: t("sidebar.hotels"), href: "/hotels", icon: Building2 },
        { name: t("sidebar.branches"), href: "/branches", icon: GitBranch },
      ],
    },
    {
      section: t("sidebar.operations"),
      items: [
        { name: t("sidebar.rooms"), href: "/rooms", icon: DoorOpen },
        { name: t("sidebar.roomTypes"), href: "/room-types", icon: Package },
        { name: t("sidebar.amenities"), href: "/amenities", icon: Package },
        { name: t("sidebar.guests"), href: "/guests", icon: Users },
        { name: t("sidebar.reservations"), href: "/reservations", icon: CalendarCheck },
        { name: t("sidebar.booking"), href: "/booking", icon: CalendarPlus },
        { name: t("sidebar.housekeeping"), href: "/housekeeping", icon: Brush },
      ],
    },
    {
      section: t("sidebar.administration"),
      items: [
        { name: t("sidebar.employees"), href: "/employees", icon: UserCog },
        { name: t("sidebar.permissions"), href: "/permissions", icon: Shield },
        { name: t("sidebar.services"), href: "/services", icon: Package },
      ],
    },
    {
      section: t("sidebar.finance"),
      items: [
        { name: t("sidebar.invoices"), href: "/finance/invoices", icon: Receipt },
        { name: t("sidebar.payments"), href: "/finance/payments", icon: Receipt },
        { name: t("sidebar.ledger"), href: "/finance/ledger", icon: ClipboardList },
      ],
    },
    {
      section: t("sidebar.reports"),
      items: [
        { name: t("sidebar.reports"), href: "/reports", icon: BarChart3 },
        ...(isSuperAdmin
          ? [{ name: t("sidebar.auditLogs"), href: "/audit-logs", icon: ClipboardList }]
          : []),
        { name: t("sidebar.notifications"), href: "/notifications", icon: Bell },
      ],
    },
  ]

  const initials = user
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : "?"

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Logo / Brand */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border px-4",
          collapsed ? "justify-center" : "gap-3"
        )}
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/20">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-1 items-center justify-between overflow-hidden">
            <span className="text-base font-bold tracking-tight text-white">
              GoHotel
            </span>
            <button
              onClick={() => onCollapsedChange(!collapsed)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-white"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        <div className="space-y-5">
          {navigation.map((group) => (
            <div key={group.section}>
              {!collapsed && (
                <div className="mb-1.5 px-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-sidebar-muted">
                    {group.section}
                  </span>
                </div>
              )}
              <ul className={cn("space-y-0.5", collapsed && "space-y-1")}>
                {group.items.map((item) => {
                  const isActive =
                    location.pathname === item.href ||
                    (item.href !== "/" && location.pathname.startsWith(item.href))
                  return (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all duration-200",
                          collapsed ? "justify-center px-0" : "px-3",
                          isActive
                            ? "text-white"
                            : "text-slate-400 hover:text-white"
                        )}
                        title={collapsed ? item.name : undefined}
                      >
                        {/* Active indicator bar */}
                        {isActive && !collapsed && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary-500" />
                        )}

                        {/* Icon wrapper */}
                        <span
                          className={cn(
                            "relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                            isActive
                              ? "bg-primary-500/15 text-primary-400 shadow-sm shadow-primary-500/10"
                              : "text-slate-400 group-hover:bg-sidebar-hover group-hover:text-slate-200",
                            collapsed && "h-10 w-10 rounded-xl"
                          )}
                        >
                          {isActive && collapsed && (
                            <span className="absolute -right-0.5 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-l-full bg-primary-500" />
                          )}
                          <item.icon
                            className={cn(
                              "h-[18px] w-[18px] transition-transform duration-200",
                              isActive && "scale-110"
                            )}
                          />
                        </span>

                        {!collapsed && (
                          <span className="truncate leading-none">
                            {item.name}
                          </span>
                        )}

                        {/* Active dot for collapsed */}
                        {isActive && collapsed && (
                          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary-500" />
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* User Section */}
      <div className="border-t border-sidebar-border p-3">
        {collapsed ? (
          <button
            onClick={() => onCollapsedChange(false)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-white"
            title={t("sidebar.expand")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-sidebar-hover">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-xs font-semibold text-white shadow-sm shadow-primary-500/20 ring-2 ring-primary-500/20">
              {initials}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="truncate text-[13px] font-medium leading-tight text-white">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="truncate text-[11px] leading-tight text-sidebar-muted">
                {user?.username}
              </p>
            </div>
            <button
              onClick={() => onCollapsedChange(!collapsed)}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-surface hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
