import { Navigate, useLocation } from "react-router-dom"
import { useAuthStore } from "@/store/auth"
import { FullPageLoader } from "@/components/ui"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized } = useAuthStore()
  const location = useLocation()

  if (!isInitialized) return <FullPageLoader />
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <>{children}</>
}

export function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized, user } = useAuthStore()

  if (!isInitialized) return <FullPageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.user_type !== "SUPER_ADMIN") return <Navigate to="/" replace />
  return <>{children}</>
}

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized } = useAuthStore()

  if (!isInitialized) return <FullPageLoader />
  if (isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}
