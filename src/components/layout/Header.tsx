import { Bell, LogOut } from "lucide-react"
import { useAuthStore } from "@/store/auth"
import { Button } from "@/components/ui"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { getNotifications } from "@/api/modules/reports"
import { useTranslation } from "react-i18next"
import { LanguageSwitcher } from "./LanguageSwitcher"

export function Header() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const { data: notifications } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: async () => {
      const res = await getNotifications({ limit: "5" })
      return res
    },
    refetchInterval: 30000,
  })

  const unreadCount =
    notifications?.items?.filter((n: { is_read: boolean }) => !n.is_read)
      .length ?? 0

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-900">{t("header.adminPanel")}</h1>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSwitcher />

        <button
          onClick={() => navigate("/notifications")}
          className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <span className="text-sm text-gray-600">
            {user?.first_name} {user?.last_name}
          </span>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
