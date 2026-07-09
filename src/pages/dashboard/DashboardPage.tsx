import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Building2,
  Users,
  DoorOpen,
  CalendarCheck,
  LogIn,
  LogOut,
  Percent,
  ClipboardList,
} from "lucide-react"
import {
  StatCard,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  PageLoader,
} from "@/components/ui"
import { getHotels } from "@/api/modules/hotels"
import { getRooms } from "@/api/modules/rooms"
import { getGuests } from "@/api/modules/guests"
import { getReservations } from "@/api/modules/reservations"
import { getInvoices } from "@/api/modules/finance"
import { getHousekeepingTasks } from "@/api/modules/housekeeping"
import { useTranslation } from "react-i18next"
import { useScope } from "@/hooks/useScope"

const ROOM_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-emerald-500",
  RESERVED: "bg-blue-500",
  OCCUPIED: "bg-purple-500",
  CLEANING: "bg-orange-500",
  MAINTENANCE: "bg-yellow-500",
  INSPECTION: "bg-cyan-500",
  OUT_OF_SERVICE: "bg-red-500",
}

const RESERVATION_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
  "NO_SHOW",
]

function toArray(data: unknown): any[] {
  if (Array.isArray(data)) return data
  return (data as any)?.items ?? (data as any)?.data ?? []
}

export function DashboardPage() {
  const { t } = useTranslation()
  const { scopeMerge, isSuperAdmin, hotelId } = useScope()

  const filter = scopeMerge({ page_size: "2000" })

  const { data: hotels, isLoading: hotelsLoading } = useQuery({
    queryKey: ["hotels", filter],
    queryFn: () => getHotels(filter),
  })

  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ["rooms", filter],
    queryFn: () => getRooms(filter),
  })

  const { data: guests, isLoading: guestsLoading } = useQuery({
    queryKey: ["guests", filter],
    queryFn: () => getGuests(filter),
  })

  const { data: resData, isLoading: resLoading } = useQuery({
    queryKey: ["reservations", filter],
    queryFn: () => getReservations(filter),
  })

  const { data: invData, isLoading: invLoading } = useQuery({
    queryKey: ["invoices", filter],
    queryFn: () => getInvoices(filter),
  })

  const { data: hkData } = useQuery({
    queryKey: ["housekeeping", "dashboard", filter],
    queryFn: () => getHousekeepingTasks(filter),
    retry: false,
  })

  const isLoading = hotelsLoading || roomsLoading || guestsLoading || resLoading || invLoading

  const hotelsArr = toArray(hotels)
  const roomsArr = useMemo(() => {
    const arr = toArray(rooms)
    return isSuperAdmin ? arr : arr.filter((r: any) => r.hotel_id === hotelId)
  }, [rooms, isSuperAdmin, hotelId])
  const guestsArr = toArray(guests)

  const reservations = useMemo(() => {
    const arr = toArray(resData)
    return isSuperAdmin ? arr : arr.filter((r: any) => r.hotel_id === hotelId)
  }, [resData, isSuperAdmin, hotelId])

  const invoices = useMemo(() => {
    const arr = toArray(invData)
    return isSuperAdmin ? arr : arr.filter((i: any) => i.hotel_id === hotelId)
  }, [invData, isSuperAdmin, hotelId])

  const hkTasks = toArray(hkData)

  const hotelsTotal = isSuperAdmin
    ? ((hotels as any)?.total ?? hotelsArr.length)
    : hotelsArr.filter((h: any) => h.id === hotelId).length
  const roomsTotal = isSuperAdmin ? ((rooms as any)?.total ?? roomsArr.length) : roomsArr.length
  const guestsTotal = isSuperAdmin
    ? ((guests as any)?.total ?? guestsArr.length)
    : guestsArr.filter((g: any) => g.hotel_id === hotelId).length
  const reservationTotal = isSuperAdmin
    ? ((resData as any)?.total ?? reservations.length)
    : reservations.length

  // room occupancy
  const roomStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of roomsArr) counts[r.status] = (counts[r.status] || 0) + 1
    return counts
  }, [roomsArr])

  const occupiedCount = (roomStatusCounts.OCCUPIED || 0) + (roomStatusCounts.RESERVED || 0)
  const occupancyRate = roomsArr.length > 0 ? Math.round((occupiedCount / roomsArr.length) * 100) : 0

  // today's movements
  const today = new Date().toISOString().split("T")[0]
  const todayCheckIns = reservations.filter(
    (r: any) =>
      String(r.check_in_date || "").startsWith(today) &&
      ["PENDING", "CONFIRMED", "CHECKED_IN"].includes(r.status)
  )
  const todayCheckOuts = reservations.filter(
    (r: any) =>
      String(r.check_out_date || "").startsWith(today) &&
      ["CHECKED_IN", "CHECKED_OUT"].includes(r.status)
  )

  // housekeeping
  const openTasks = hkTasks.filter((task: any) =>
    ["OPEN", "IN_PROGRESS"].includes(task.status)
  ).length

  // reservation status breakdown
  const reservationStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of reservations) counts[r.status] = (counts[r.status] || 0) + 1
    return counts
  }, [reservations])

  // finance
  const paidTotal = invoices
    .filter((i: any) => ["PAID", "PARTIALLY_PAID"].includes(i.status))
    .reduce((sum: number, i: any) => sum + Number(i.paid_amount ?? i.total_amount ?? 0), 0)
  const outstandingTotal = invoices
    .filter((i: any) => ["ISSUED", "PARTIALLY_PAID"].includes(i.status))
    .reduce(
      (sum: number, i: any) =>
        sum + Number(i.balance_due ?? Math.max(Number(i.total_amount ?? 0) - Number(i.paid_amount ?? 0), 0)),
      0
    )

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("dashboard.title")}</h1>
        <p className="text-gray-500 mt-1">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("dashboard.totalHotels")}
          value={hotelsTotal}
          icon={Building2}
          className="border-l-4 border-l-primary-500"
        />
        <StatCard
          title={t("dashboard.totalRooms")}
          value={roomsTotal}
          icon={DoorOpen}
          className="border-l-4 border-l-emerald-500"
        />
        <StatCard
          title={t("dashboard.totalGuests")}
          value={guestsTotal}
          icon={Users}
          className="border-l-4 border-l-purple-500"
        />
        <StatCard
          title={t("dashboard.activeReservations")}
          value={reservationTotal}
          icon={CalendarCheck}
          className="border-l-4 border-l-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("dashboard.occupancy")}
          value={`${occupancyRate}%`}
          description={`${occupiedCount}/${roomsArr.length} ${t("dashboard.roomsOccupied")}`}
          icon={Percent}
          className="border-l-4 border-l-indigo-500"
        />
        <StatCard
          title={t("dashboard.todayCheckIns")}
          value={todayCheckIns.length}
          icon={LogIn}
          className="border-l-4 border-l-teal-500"
        />
        <StatCard
          title={t("dashboard.todayCheckOuts")}
          value={todayCheckOuts.length}
          icon={LogOut}
          className="border-l-4 border-l-rose-500"
        />
        <StatCard
          title={t("dashboard.openTasks")}
          value={openTasks}
          icon={ClipboardList}
          className="border-l-4 border-l-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.roomStatus")}</CardTitle>
          </CardHeader>
          <CardContent>
            {roomsArr.length > 0 ? (
              <div className="space-y-3">
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
                  {Object.entries(roomStatusCounts).map(([status, count]) => (
                    <div
                      key={status}
                      className={ROOM_STATUS_COLORS[status] || "bg-gray-400"}
                      style={{ width: `${(count / roomsArr.length) * 100}%` }}
                    />
                  ))}
                </div>
                {Object.entries(roomStatusCounts).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${ROOM_STATUS_COLORS[status] || "bg-gray-400"}`}
                      />
                      <Badge variant={status} />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">{t("dashboard.noData")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.reservationStatus")}</CardTitle>
          </CardHeader>
          <CardContent>
            {reservations.length > 0 ? (
              <div className="space-y-3">
                {RESERVATION_STATUSES.filter((s) => reservationStatusCounts[s]).map((status) => (
                  <div key={status} className="flex items-center justify-between">
                    <Badge variant={status} />
                    <span className="text-sm font-medium text-gray-900">
                      {reservationStatusCounts[status]}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">{t("dashboard.noData")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.finance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">{t("dashboard.paidTotal")}</p>
                <p className="text-2xl font-bold text-emerald-600">
                  ${paidTotal.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t("dashboard.outstanding")}</p>
                <p className="text-2xl font-bold text-red-600">
                  ${outstandingTotal.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t("dashboard.totalInvoices")}</p>
                <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.recentReservations")}</CardTitle>
          </CardHeader>
          <CardContent>
            {reservations.length > 0 ? (
              <div className="space-y-3">
                {reservations.slice(0, 5).map((r: Record<string, unknown>) => (
                  <div
                    key={String(r.id)}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {String(r.reservation_number)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {r.guest && typeof r.guest === "object"
                          ? `${(r.guest as Record<string, string>).first_name} ${(r.guest as Record<string, string>).last_name}`
                          : t("dashboard.na")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={String(r.status)} />
                      <span className="text-xs text-gray-500">
                        {String(r.check_in_date)} - {String(r.check_out_date)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">{t("dashboard.noReservations")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.recentInvoices")}</CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length > 0 ? (
              <div className="space-y-3">
                {invoices.slice(0, 5).map((inv: Record<string, unknown>) => (
                  <div
                    key={String(inv.id)}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {String(inv.invoice_number)}
                      </p>
                      <Badge variant={String(inv.status)} className="mt-1" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      ${Number(inv.total_amount).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">{t("dashboard.noInvoices")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
