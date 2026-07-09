import { useQuery } from "@tanstack/react-query"
import { Building2, Users, DoorOpen, CalendarCheck, Receipt } from "lucide-react"
import { StatCard, Card, CardHeader, CardTitle, CardContent, PageLoader } from "@/components/ui"
import { getHotels } from "@/api/modules/hotels"
import { getRooms } from "@/api/modules/rooms"
import { getGuests } from "@/api/modules/guests"
import { getReservations } from "@/api/modules/reservations"
import { getInvoices } from "@/api/modules/finance"
import { useTranslation } from "react-i18next"
import { useScope } from "@/hooks/useScope"

export function DashboardPage() {
  const { t } = useTranslation()
  const { scopeMerge, isSuperAdmin, hotelId } = useScope()

  const filter = scopeMerge()

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

  const isLoading = hotelsLoading || roomsLoading || guestsLoading || resLoading || invLoading

  const hotelsArr = Array.isArray(hotels) ? hotels : (hotels as any)?.items ?? []
  const roomsArr = Array.isArray(rooms) ? rooms : (rooms as any)?.items ?? []
  const guestsArr = Array.isArray(guests) ? guests : (guests as any)?.items ?? []

  const hotelsTotal = isSuperAdmin
    ? (hotels?.total ?? hotels?.length ?? 0)
    : hotelsArr.filter((h: any) => h.id === hotelId).length
  const roomsTotal = isSuperAdmin
    ? (rooms?.total ?? rooms?.length ?? 0)
    : roomsArr.filter((r: any) => r.hotel_id === hotelId).length
  const guestsTotal = isSuperAdmin
    ? (guests?.total ?? guests?.length ?? 0)
    : guestsArr.filter((g: any) => g.hotel_id === hotelId).length

  const reservations = Array.isArray(resData) ? resData : (resData as any)?.items ?? []
  const filteredReservations = isSuperAdmin ? reservations : reservations.filter((r: any) => r.hotel_id === hotelId)
  const reservationTotal = isSuperAdmin ? ((resData as any)?.total ?? reservations.length) : filteredReservations.length

  const invoices = Array.isArray(invData) ? invData : (invData as any)?.items ?? []
  const filteredInvoices = isSuperAdmin ? invoices : invoices.filter((i: any) => i.hotel_id === hotelId)

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("dashboard.title")}</h1>
        <p className="text-gray-500 mt-1">
          {isSuperAdmin
            ? t("dashboard.subtitle")
            : `${hotelId ? t("dashboard.subtitle") : ""}`}
        </p>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.recentReservations")}</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredReservations.length > 0 ? (
              <div className="space-y-3">
                {filteredReservations.slice(0, 5).map((r: Record<string, unknown>) => (
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
                    <span className="text-xs text-gray-500">
                      {String(r.check_in_date)} - {String(r.check_out_date)}
                    </span>
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
            {filteredInvoices.length > 0 ? (
              <div className="space-y-3">
                {filteredInvoices.slice(0, 5).map((inv: Record<string, unknown>) => (
                  <div
                    key={String(inv.id)}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {String(inv.invoice_number)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t("dashboard.status")}: {String(inv.status)}
                      </p>
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
