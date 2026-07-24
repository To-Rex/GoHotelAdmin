import { Outlet, Navigate, useLocation } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { useState } from "react"
import { usePermissions } from "@/lib/permissions"

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const { canRoute, firstAllowedRoute } = usePermissions()

  // Ruxsati yo'q sahifaga to'g'ridan-to'g'ri URL orqali kirilsa — ruxsat berilgan
  // birinchi sahifaga qaytaramiz (sidebar filtrlangan bo'lsa-da, bu qo'lda URL
  // yozishdan himoya qiladi).
  if (!canRoute(location.pathname)) {
    return <Navigate to={firstAllowedRoute()} replace />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${collapsed ? "ml-[68px]" : "ml-[260px]"}`}>
        <Header />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
