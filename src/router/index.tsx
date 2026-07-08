import { createBrowserRouter, Navigate } from "react-router-dom"
import { lazy, Suspense } from "react"
import { DashboardLayout } from "@/components/layout"
import { AuthGuard, GuestGuard, SuperAdminGuard } from "@/components/shared/AuthGuard"
import { PageLoader } from "@/components/ui"

const LoginPage = lazy(() => import("@/pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })))
const AccessDeniedPage = lazy(() => import("@/pages/auth/AccessDeniedPage").then((m) => ({ default: m.AccessDeniedPage })))
const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })))
const HotelsPage = lazy(() => import("@/pages/hotels/HotelsPage").then((m) => ({ default: m.HotelsPage })))
const BranchesPage = lazy(() => import("@/pages/branches/BranchesPage").then((m) => ({ default: m.BranchesPage })))
const RoomsPage = lazy(() => import("@/pages/rooms/RoomsPage").then((m) => ({ default: m.RoomsPage })))
const RoomTypesPage = lazy(() => import("@/pages/rooms/RoomTypesPage").then((m) => ({ default: m.RoomTypesPage })))
const AmenitiesPage = lazy(() => import("@/pages/rooms/AmenitiesPage").then((m) => ({ default: m.AmenitiesPage })))
const GuestsPage = lazy(() => import("@/pages/guests/GuestsPage").then((m) => ({ default: m.GuestsPage })))
const ReservationsPage = lazy(() => import("@/pages/reservations/ReservationsPage").then((m) => ({ default: m.ReservationsPage })))
const BookingPage = lazy(() => import("@/pages/booking/BookingPage").then((m) => ({ default: m.BookingPage })))
const EmployeesPage = lazy(() => import("@/pages/employees/EmployeesPage").then((m) => ({ default: m.EmployeesPage })))
const PermissionsPage = lazy(() => import("@/pages/permissions/PermissionsPage").then((m) => ({ default: m.PermissionsPage })))
const ServicesPage = lazy(() => import("@/pages/services/ServicesPage").then((m) => ({ default: m.ServicesPage })))
const HousekeepingPage = lazy(() => import("@/pages/housekeeping/HousekeepingPage").then((m) => ({ default: m.HousekeepingPage })))
const InvoicesPage = lazy(() => import("@/pages/finance/InvoicesPage").then((m) => ({ default: m.InvoicesPage })))
const PaymentsPage = lazy(() => import("@/pages/finance/PaymentsPage").then((m) => ({ default: m.PaymentsPage })))
const LedgerPage = lazy(() => import("@/pages/finance/LedgerPage").then((m) => ({ default: m.LedgerPage })))
const ReportsPage = lazy(() => import("@/pages/reports/ReportsPage").then((m) => ({ default: m.ReportsPage })))
const AuditLogsPage = lazy(() => import("@/pages/audit-logs/AuditLogsPage").then((m) => ({ default: m.AuditLogsPage })))
const NotificationsPage = lazy(() => import("@/pages/notifications/NotificationsPage").then((m) => ({ default: m.NotificationsPage })))

function LazyFallback({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <GuestGuard>
        <LazyFallback>
          <LoginPage />
        </LazyFallback>
      </GuestGuard>
    ),
  },
  {
    path: "/access-denied",
    element: (
      <GuestGuard>
        <LazyFallback>
          <AccessDeniedPage />
        </LazyFallback>
      </GuestGuard>
    ),
  },
  {
    path: "/",
    element: (
      <AuthGuard>
        <DashboardLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <LazyFallback><DashboardPage /></LazyFallback> },
      { path: "hotels", element: <LazyFallback><HotelsPage /></LazyFallback> },
      { path: "branches", element: <LazyFallback><BranchesPage /></LazyFallback> },
      { path: "rooms", element: <LazyFallback><RoomsPage /></LazyFallback> },
      { path: "room-types", element: <LazyFallback><RoomTypesPage /></LazyFallback> },
      { path: "amenities", element: <LazyFallback><AmenitiesPage /></LazyFallback> },
      { path: "guests", element: <LazyFallback><GuestsPage /></LazyFallback> },
      { path: "reservations", element: <LazyFallback><ReservationsPage /></LazyFallback> },
      { path: "booking", element: <LazyFallback><BookingPage /></LazyFallback> },
      { path: "employees", element: <LazyFallback><EmployeesPage /></LazyFallback> },
      { path: "permissions", element: <LazyFallback><PermissionsPage /></LazyFallback> },
      { path: "services", element: <LazyFallback><ServicesPage /></LazyFallback> },
      { path: "housekeeping", element: <LazyFallback><HousekeepingPage /></LazyFallback> },
      { path: "finance/invoices", element: <LazyFallback><InvoicesPage /></LazyFallback> },
      { path: "finance/payments", element: <LazyFallback><PaymentsPage /></LazyFallback> },
      { path: "finance/ledger", element: <LazyFallback><LedgerPage /></LazyFallback> },
      { path: "reports", element: <LazyFallback><ReportsPage /></LazyFallback> },
      { path: "audit-logs", element: <LazyFallback><SuperAdminGuard><AuditLogsPage /></SuperAdminGuard></LazyFallback> },
      { path: "notifications", element: <LazyFallback><NotificationsPage /></LazyFallback> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
])
