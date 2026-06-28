import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { useState } from "react"

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)

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
