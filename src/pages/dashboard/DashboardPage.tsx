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
import { Card, CardHeader, CardTitle, CardContent, Badge, PageLoader } from "@/components/ui"
import { getHotels } from "@/api/modules/hotels"
import { getRooms } from "@/api/modules/rooms"
import { getGuests } from "@/api/modules/guests"
import { getReservations } from "@/api/modules/reservations"
import { getInvoices } from "@/api/modules/finance"
import { getHousekeepingTasks } from "@/api/modules/housekeeping"
import { useTranslation } from "react-i18next"
import { useScope } from "@/hooks/useScope"

// fixed render order, warm/cool interleaved — palette validated for CVD contrast
const ROOM_STATUS_ORDER: { status: string; color: string }[] = [
  { status: "AVAILABLE", color: "#059669" },
  { status: "CLEANING", color: "#ea580c" },
  { status: "RESERVED", color: "#3b82f6" },
  { status: "MAINTENANCE", color: "#b45309" },
  { status: "OCCUPIED", color: "#6d28d9" },
  { status: "OUT_OF_SERVICE", color: "#dc2626" },
  { status: "INSPECTION", color: "#0891b2" },
]

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

function StatTile({
  label,
  value,
  description,
  icon: Icon,
  iconClass,
}: {
  label: string
  value: string | number
  description?: string
  icon: React.ComponentType<{ className?: string }>
  iconClass: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
          {description && <p className="mt-1 text-xs text-gray-400">{description}</p>}
        </div>
        <div className={`shrink-0 rounded-lg p-2.5 ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
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

  const roomStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of roomsArr) counts[r.status] = (counts[r.status] || 0) + 1
    return counts
  }, [roomsArr])

  const occupiedCount = (roomStatusCounts.OCCUPIED || 0) + (roomStatusCounts.RESERVED || 0)
  const occupancyRate =
    roomsArr.length > 0 ? Math.round((occupiedCount / roomsArr.length) * 100) : 0

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

  const openTasks = hkTasks.filter((task: any) =>
    ["OPEN", "IN_PROGRESS"].includes(task.status)
  ).length

  const reservationStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of reservations) counts[r.status] = (counts[r.status] || 0) + 1
    return counts
  }, [reservations])

  const maxReservationCount = Math.max(
    1,
    ...RESERVATION_STATUSES.map((s) => reservationStatusCounts[s] || 0)
  )

  const paidTotal = invoices
    .filter((i: any) => ["PAID", "PARTIALLY_PAID"].includes(i.status))
    .reduce((sum: number, i: any) => sum + Number(i.paid_amount ?? i.total_amount ?? 0), 0)
  const outstandingTotal = invoices
    .filter((i: any) => ["ISSUED", "PARTIALLY_PAID"].includes(i.status))
    .reduce(
      (sum: number, i: any) =>
        sum +
        Number(
          i.balance_due ?? Math.max(Number(i.total_amount ?? 0) - Number(i.paid_amount ?? 0), 0)
        ),
      0
    )
  const financeTotal = paidTotal + outstandingTotal

  const visibleRoomStatuses = ROOM_STATUS_ORDER.filter((s) => roomStatusCounts[s.status])

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("dashboard.title")}</h1>
        <p className="text-gray-500 mt-1">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label={t("dashboard.totalHotels")}
          value={hotelsTotal}
          icon={Building2}
          iconClass="bg-blue-50 text-blue-600"
        />
        <StatTile
          label={t("dashboard.totalRooms")}
          value={roomsTotal}
          icon={DoorOpen}
          iconClass="bg-emerald-50 text-emerald-600"
        />
        <StatTile
          label={t("dashboard.totalGuests")}
          value={guestsTotal}
          icon={Users}
          iconClass="bg-violet-50 text-violet-600"
        />
        <StatTile
          label={t("dashboard.activeReservations")}
          value={reservationTotal}
          icon={CalendarCheck}
          iconClass="bg-orange-50 text-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label={t("dashboard.occupancy")}
          value={`${occupancyRate}%`}
          description={`${occupiedCount}/${roomsArr.length} ${t("dashboard.roomsOccupied")}`}
          icon={Percent}
          iconClass="bg-indigo-50 text-indigo-600"
        />
        <StatTile
          label={t("dashboard.todayCheckIns")}
          value={todayCheckIns.length}
          icon={LogIn}
          iconClass="bg-teal-50 text-teal-600"
        />
        <StatTile
          label={t("dashboard.todayCheckOuts")}
          value={todayCheckOuts.length}
          icon={LogOut}
          iconClass="bg-rose-50 text-rose-600"
        />
        <StatTile
          label={t("dashboard.openTasks")}
          value={openTasks}
          icon={ClipboardList}
          iconClass="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.roomStatus")}</CardTitle>
          </CardHeader>
          <CardContent>
            {roomsArr.length > 0 ? (
              <div className="space-y-4">
                <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
                  {visibleRoomStatuses.map(({ status, color }) => (
                    <div
                      key={status}
                      style={{
                        backgroundColor: color,
                        width: `${(roomStatusCounts[status] / roomsArr.length) * 100}%`,
                      }}
                    />
                  ))}
                </div>
                <div className="space-y-2.5">
                  {visibleRoomStatuses.map(({ status, color }) => {
                    const count = roomStatusCounts[status]
                    const pct = Math.round((count / roomsArr.length) * 100)
                    return (
                      <div key={status} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-sm text-gray-600 truncate">
                            {t(`status.${status}`)}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 shrink-0">
                          <span className="text-sm font-semibold text-gray-900 tabular-nums">
                            {count}
                          </span>
                          <span className="text-xs text-gray-400 tabular-nums w-9 text-right">
                            {pct}%
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
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
                {RESERVATION_STATUSES.filter((s) => reservationStatusCounts[s]).map((status) => {
                  const count = reservationStatusCounts[status]
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">{t(`status.${status}`)}</span>
                        <span className="text-sm font-semibold text-gray-900 tabular-nums">
                          {count}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-primary-500"
                          style={{ width: `${(count / maxReservationCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
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
            <div className="space-y-5">
              <div>
                <p className="text-sm text-gray-500">{t("dashboard.paidTotal")}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {paidTotal.toLocaleString()} {t("common.som")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t("dashboard.outstanding")}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {outstandingTotal.toLocaleString()} {t("common.som")}
                </p>
              </div>
              {financeTotal > 0 && (
                <div className="space-y-2">
                  <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
                    <div
                      className="bg-emerald-600"
                      style={{ width: `${(paidTotal / financeTotal) * 100}%` }}
                    />
                    <div
                      className="bg-red-600"
                      style={{ width: `${(outstandingTotal / financeTotal) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-600" />
                      {t("dashboard.paidTotal")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-600" />
                      {t("dashboard.outstanding")}
                    </span>
                  </div>
                </div>
              )}
              <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">{t("dashboard.totalInvoices")}</p>
                <p className="text-sm font-semibold text-gray-900 tabular-nums">
                  {invoices.length}
                </p>
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
              <div className="divide-y divide-gray-100">
                {reservations.slice(0, 5).map((r: Record<string, unknown>) => (
                  <div key={String(r.id)} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {String(r.reservation_number)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {r.guest && typeof r.guest === "object"
                          ? `${(r.guest as Record<string, string>).first_name} ${(r.guest as Record<string, string>).last_name}`
                          : t("dashboard.na")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-gray-400 tabular-nums hidden sm:inline">
                        {String(r.check_in_date)} — {String(r.check_out_date)}
                      </span>
                      <Badge variant={String(r.status)} />
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
              <div className="divide-y divide-gray-100">
                {invoices.slice(0, 5).map((inv: Record<string, unknown>) => (
                  <div key={String(inv.id)} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {String(inv.invoice_number)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant={String(inv.status)} />
                      <span className="text-sm font-semibold text-gray-900 tabular-nums">
                        {Number(inv.total_amount).toLocaleString()} {t("common.som")}
                      </span>
                    </div>
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
