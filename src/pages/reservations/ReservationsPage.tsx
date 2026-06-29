import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, List, Calendar, ChevronDown, ChevronRight, Search, X, Building2, DoorOpen, CalendarCheck } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Button,
  Input,
  Badge,
  Card,
  CardContent,
  DataTable,
  Modal,
  PageLoader,
} from "@/components/ui"
import type { Column } from "@/components/ui"
import {
  getReservations,
  createReservation,
  checkInReservation,
  checkOutReservation,
  cancelReservation,
} from "@/api/modules/reservations"
import type { Reservation, ReservationCreateRequest } from "@/types/reservation"
import type { Room } from "@/types/room"
import { getHotels } from "@/api/modules/hotels"
import { getBranches } from "@/api/modules/branches"
import { formatDate, cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { ReservationCalendar } from "./ReservationCalendar"
import { useScope } from "@/hooks/useScope"

export function ReservationsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { scopeMerge, isSuperAdmin, hotelId, branchId } = useScope()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [cancelModal, setCancelModal] = useState<Reservation | null>(null)
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(new Set())
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set())

  const reservationSchema = z.object({
    hotel_id: z.string().min(1, t("reservations.hotelRequired")),
    branch_id: z.string().min(1, t("reservations.branchRequired")),
    guest_id: z.string().min(1, t("reservations.guestRequired")),
    room_id: z.string().min(1, t("reservations.roomRequired")),
    check_in_date: z.string().min(1, t("reservations.checkInRequired")),
    check_out_date: z.string().min(1, t("reservations.checkOutRequired")),
    adults: z.number().min(1),
    children: z.number().min(0).optional(),
    notes: z.string().optional(),
    payment_amount: z.number().min(0).optional(),
    payment_method: z.enum(["CASH", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "MOBILE_PAYMENT", "ONLINE"]).nullable().optional(),
  })

  type ReservationForm = z.infer<typeof reservationSchema>

  const { data, isLoading } = useQuery({
    queryKey: ["reservations", search, page],
    queryFn: () => {
      const params: Record<string, string> = { page: String(page), page_size: "10" }
      if (search) params.search = search
      return getReservations(scopeMerge(params))
    },
  })

  const { data: hotelsData } = useQuery({
    queryKey: ["hotels", "select"],
    queryFn: () => getHotels({ page_size: "200" }),
    enabled: isSuperAdmin && viewMode === "list",
  })

  const { data: allBranchesData } = useQuery({
    queryKey: ["branches", "all"],
    queryFn: () => getBranches({ page_size: "500" }),
    enabled: isSuperAdmin && viewMode === "list",
  })

  const { data: allReservationsData } = useQuery({
    queryKey: ["reservations", "all-list"],
    queryFn: () => getReservations(scopeMerge({ page_size: "2000" })),
    enabled: isSuperAdmin && viewMode === "list",
  })

  const hotelsList = useMemo(() => {
    const raw = (hotelsData as any)?.items ?? (Array.isArray(hotelsData) ? hotelsData : [])
    return Array.isArray(raw) ? raw : (raw as any)?.items ?? []
  }, [hotelsData])

  const allBranches = useMemo(() => {
    const raw = (allBranchesData as any)?.items ?? (Array.isArray(allBranchesData) ? allBranchesData : [])
    return Array.isArray(raw) ? raw : (raw as any)?.items ?? []
  }, [allBranchesData])

  const allReservations: Reservation[] = useMemo(
    () => (Array.isArray(allReservationsData) ? allReservationsData : (allReservationsData as any)?.items ?? []),
    [allReservationsData]
  )

  const reservations = Array.isArray(data) ? data : (data as any)?.items ?? []
  const filteredReservations = isSuperAdmin ? reservations : reservations.filter((r: Reservation) => r.hotel_id === hotelId)
  const paginationData =
    data && !Array.isArray(data) && (data as any)?.total_pages
      ? {
          page: (data as any).page,
          totalPages: (data as any).total_pages,
          total: (data as any).total,
          onPageChange: setPage,
        }
      : undefined

  const q = search.toLowerCase().trim()

  const hotelTree = useMemo(() => {
    if (!isSuperAdmin || viewMode !== "list") return []
    return hotelsList
      .map((hotel: any) => {
        const hotelBranches = allBranches.filter((b: any) => b.hotel_id === hotel.id)
        const branchesWithRes = hotelBranches
          .map((branch: any) => {
            let branchRes = allReservations.filter((r) => r.branch_id === branch.id)
            if (q) {
              branchRes = branchRes.filter(
                (r) =>
                  r.reservation_number?.toLowerCase().includes(q) ||
                  r.guest?.first_name?.toLowerCase().includes(q) ||
                  r.guest?.last_name?.toLowerCase().includes(q) ||
                  r.room?.room_number?.toLowerCase().includes(q)
              )
              if (branchRes.length === 0) return null
            }
            return { branch, reservations: branchRes }
          })
          .filter(Boolean) as { branch: any; reservations: Reservation[] }[]

        if (q && branchesWithRes.length === 0) {
          if (!hotel.name.toLowerCase().includes(q)) return null
        }
        return { hotel, branches: branchesWithRes }
      })
      .filter(Boolean) as { hotel: any; branches: { branch: any; reservations: Reservation[] }[] }[]
  }, [hotelsList, allBranches, allReservations, q, isSuperAdmin, viewMode])

  const toggleHotel = (id: string) => {
    setExpandedHotels((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleBranch = (id: string) => {
    setExpandedBranches((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const createMutation = useMutation({
    mutationFn: (data: ReservationCreateRequest) => createReservation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] })
      setModalOpen(false)
    },
  })

  const checkInMutation = useMutation({
    mutationFn: (id: string) => checkInReservation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reservations"] }),
  })

  const checkOutMutation = useMutation({
    mutationFn: (id: string) => checkOutReservation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reservations"] }),
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cancelReservation(id, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] })
      setCancelModal(null)
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ReservationForm>({
    resolver: zodResolver(reservationSchema),
  })

  const openCreate = (hId?: string, bId?: string) => {
    reset({
      hotel_id: hId || hotelId || "",
      branch_id: bId || branchId || "",
      guest_id: "",
      room_id: "",
      check_in_date: "",
      check_out_date: "",
      adults: 1,
      children: 0,
      payment_amount: 0,
      payment_method: null,
    })
    setModalOpen(true)
  }

  const handleCalendarSelect = (room: Room, checkIn: string, checkOut: string) => {
    reset({
      hotel_id: room.hotel_id,
      branch_id: room.branch_id,
      guest_id: "",
      room_id: room.id,
      check_in_date: checkIn,
      check_out_date: checkOut,
      adults: 1,
      children: 0,
      payment_amount: 0,
      payment_method: null,
    })
    setModalOpen(true)
  }

  const onSubmit = (values: ReservationForm) => {
    createMutation.mutate(values as ReservationCreateRequest)
  }

  const columns: Column<Reservation>[] = [
    { key: "reservation_number", header: t("reservations.reservationNumber") },
    {
      key: "guest",
      header: t("reservations.guest"),
      render: (r) =>
        r.guest ? `${r.guest.first_name} ${r.guest.last_name}` : t("reservations.na"),
    },
    {
      key: "room",
      header: t("reservations.room"),
      render: (r) => r.room?.room_number || t("reservations.na"),
    },
    {
      key: "dates",
      header: t("reservations.dates"),
      render: (r) => `${r.check_in_date} → ${r.check_out_date}`,
    },
    { key: "adults", header: t("reservations.adults") },
    {
      key: "status",
      header: t("reservations.status"),
      render: (r) => <Badge variant={r.status} />,
    },
    {
      key: "payment_status",
      header: "To'lov",
      render: (r) => {
        const labels: Record<string, string> = { UNPAID: "To'lanmagan", PARTIALLY_PAID: "Qisman", PAID: "To'langan" }
        const colors: Record<string, string> = { UNPAID: "bg-red-100 text-red-700", PARTIALLY_PAID: "bg-amber-100 text-amber-700", PAID: "bg-emerald-100 text-emerald-700" }
        return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[r.payment_status] || "bg-gray-100 text-gray-600"}`}>{labels[r.payment_status] || r.payment_status}</span>
      },
    },
    {
      key: "total_amount",
      header: "Summa",
      render: (r) => r.total_amount > 0 ? `${r.total_amount.toLocaleString()} so'm` : "—",
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex gap-1">
          {r.status === "CONFIRMED" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-600"
              onClick={() => checkInMutation.mutate(r.id)}
              disabled={checkInMutation.isPending}
            >
              {t("reservations.checkIn")}
            </Button>
          )}
          {r.status === "CHECKED_IN" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600"
              onClick={() => checkOutMutation.mutate(r.id)}
              disabled={checkOutMutation.isPending}
            >
              {t("reservations.checkOut")}
            </Button>
          )}
          {(r.status === "PENDING" || r.status === "CONFIRMED") && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600"
              onClick={() => setCancelModal(r)}
            >
              {t("reservations.cancel")}
            </Button>
          )}
        </div>
      ),
    },
  ]

  const renderSuperAdminList = () => (
    <div className="space-y-2">
      {hotelTree.map(({ hotel, branches }) => {
        const isHotelExpanded = expandedHotels.has(hotel.id)
        const totalReservations = branches.reduce((sum, b) => sum + b.reservations.length, 0)

        return (
          <Card key={hotel.id}>
            <button
              onClick={() => toggleHotel(hotel.id)}
              className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors rounded-lg text-left"
            >
              {isHotelExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
              )}
              <Building2 className="h-5 w-5 text-primary-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-gray-900">{hotel.name}</span>
                {hotel.code && (
                  <span className="text-xs text-gray-400 ml-2">({hotel.code})</span>
                )}
              </div>
              <span className="text-xs text-gray-400 shrink-0">
                {branches.length} {t("rooms.branch")} / {totalReservations} {t("reservations.title")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  if (!isHotelExpanded) toggleHotel(hotel.id)
                  const firstBranch = branches[0]
                  openCreate(hotel.id, firstBranch?.branch.id)
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </button>

            {isHotelExpanded && (
              <div className="border-t border-gray-100">
                {branches.length === 0 ? (
                  <div className="p-4 text-sm text-gray-400 text-center">
                    {t("reservations.noReservations", "No reservations")}
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {branches.map(({ branch, reservations: branchRes }) => {
                      const isBranchExpanded = expandedBranches.has(branch.id)

                      return (
                        <div key={branch.id}>
                          <button
                            onClick={() => toggleBranch(branch.id)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors rounded-lg text-left ml-2"
                          >
                            {isBranchExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            )}
                            <DoorOpen className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span className="font-medium text-gray-700">{branch.name}</span>
                            {branch.code && (
                              <span className="text-xs text-gray-400">({branch.code})</span>
                            )}
                            <span className="text-xs text-gray-400 ml-auto shrink-0">
                              {branchRes.length} {t("reservations.title")}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (!isBranchExpanded) toggleBranch(branch.id)
                                openCreate(hotel.id, branch.id)
                              }}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </button>

                          {isBranchExpanded && (
                            <div className="ml-6 border-l-2 border-gray-100 pl-4">
                              {branchRes.length === 0 ? (
                                <div className="py-3 text-sm text-gray-400">
                                  {t("reservations.noReservations", "No reservations")}
                                </div>
                              ) : (
                                <div className="space-y-1 py-1">
                                  <div className="grid grid-cols-12 gap-2 px-3 py-1 text-xs font-medium text-gray-400 uppercase">
                                    <span className="col-span-2">{t("reservations.reservationNumber")}</span>
                                    <span className="col-span-2">{t("reservations.guest")}</span>
                                    <span className="col-span-1">{t("reservations.room")}</span>
                                    <span className="col-span-2">{t("reservations.dates")}</span>
                                    <span className="col-span-1">{t("reservations.status")}</span>
                                    <span className="col-span-1">To'lov</span>
                                    <span className="col-span-1">Summa</span>
                                    <span className="col-span-2" />
                                  </div>
                                  {branchRes.map((r) => (
                                    <div
                                      key={r.id}
                                      className={cn(
                                        "grid grid-cols-12 gap-2 px-3 py-2 rounded-md items-center",
                                        "hover:bg-gray-50 transition-colors"
                                      )}
                                    >
                                      <span className="col-span-2 font-medium text-gray-900 text-sm truncate">
                                        {r.reservation_number}
                                      </span>
                                      <span className="col-span-2 text-sm text-gray-600 truncate">
                                        {r.guest
                                          ? `${r.guest.first_name} ${r.guest.last_name}`
                                          : t("reservations.na")}
                                      </span>
                                      <span className="col-span-1 text-sm text-gray-600">
                                        {r.room?.room_number || t("reservations.na")}
                                      </span>
                                      <span className="col-span-2 text-xs text-gray-500">
                                        {r.check_in_date} → {r.check_out_date}
                                      </span>
                                      <span className="col-span-1">
                                        <Badge variant={r.status} />
                                      </span>
                                      <span className="col-span-1">
                                        {(() => {
                                          const labels: Record<string, string> = { UNPAID: "To'lanmagan", PARTIALLY_PAID: "Qisman", PAID: "To'langan" }
                                          const colors: Record<string, string> = { UNPAID: "bg-red-100 text-red-700", PARTIALLY_PAID: "bg-amber-100 text-amber-700", PAID: "bg-emerald-100 text-emerald-700" }
                                          return <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${colors[r.payment_status] || "bg-gray-100 text-gray-600"}`}>{labels[r.payment_status] || r.payment_status}</span>
                                        })()}
                                      </span>
                                      <span className="col-span-1 text-sm text-gray-700">
                                        {r.total_amount > 0 ? `${r.total_amount.toLocaleString()} so'm` : "—"}
                                      </span>
                                      <span className="col-span-2 flex gap-1 justify-end">
                                        {r.status === "CONFIRMED" && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-emerald-600"
                                            onClick={() => checkInMutation.mutate(r.id)}
                                            disabled={checkInMutation.isPending}
                                          >
                                            {t("reservations.checkIn")}
                                          </Button>
                                        )}
                                        {r.status === "CHECKED_IN" && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-blue-600"
                                            onClick={() => checkOutMutation.mutate(r.id)}
                                            disabled={checkOutMutation.isPending}
                                          >
                                            {t("reservations.checkOut")}
                                          </Button>
                                        )}
                                        {(r.status === "PENDING" || r.status === "CONFIRMED") && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600"
                                            onClick={() => setCancelModal(r)}
                                          >
                                            {t("reservations.cancel")}
                                          </Button>
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </Card>
        )
      })}
      {hotelTree.length === 0 && allReservations.length > 0 && (
        <div className="text-center py-12 text-gray-400">
          <CalendarCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>{t("reservations.noReservations", "No reservations found")}</p>
        </div>
      )}
    </div>
  )

  const showSuperAdminTree = isSuperAdmin && viewMode === "list"

  if (isLoading && !showSuperAdminTree) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("reservations.title")}</h1>
          <p className="text-gray-500 mt-1">{t("reservations.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <List className="h-4 w-4" />
              {t("reservations.listView")}
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === "calendar"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Calendar className="h-4 w-4" />
              {t("reservations.calendarView")}
            </button>
          </div>
          <Button onClick={() => navigate("/booking")}>
            <Plus className="h-4 w-4" />
            {t("reservations.newReservation")}
          </Button>
        </div>
      </div>

      {viewMode === "list" ? (
        showSuperAdminTree ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("reservations.searchPlaceholder")}
                className="pl-10"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {renderSuperAdminList()}
          </>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <DataTable
                columns={columns}
                data={filteredReservations}
                keyField="id"
                isLoading={isLoading}
                searchable
                searchPlaceholder={t("reservations.searchPlaceholder")}
                onSearch={setSearch}
                pagination={paginationData}
              />
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="pt-6">
            <ReservationCalendar onSelectRange={handleCalendarSelect} hotelId={hotelId || undefined} branchId={branchId || undefined} />
          </CardContent>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("reservations.newReservation")}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="hotel_id"
              label={t("reservations.hotelId") + " *"}
              placeholder={t("reservations.uuid")}
              error={errors.hotel_id?.message}
              disabled={!isSuperAdmin}
              {...register("hotel_id")}
            />
            <Input
              id="branch_id"
              label={t("reservations.branchId") + " *"}
              placeholder={t("reservations.uuid")}
              error={errors.branch_id?.message}
              disabled={!isSuperAdmin && !!branchId}
              {...register("branch_id")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="guest_id"
              label={t("reservations.guestId") + " *"}
              placeholder={t("reservations.uuid")}
              error={errors.guest_id?.message}
              {...register("guest_id")}
            />
            <Input
              id="room_id"
              label={t("reservations.roomId") + " *"}
              placeholder={t("reservations.uuid")}
              error={errors.room_id?.message}
              {...register("room_id")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="check_in_date"
              label={t("reservations.checkInDate") + " *"}
              type="date"
              error={errors.check_in_date?.message}
              {...register("check_in_date")}
            />
            <Input
              id="check_out_date"
              label={t("reservations.checkOutDate") + " *"}
              type="date"
              error={errors.check_out_date?.message}
              {...register("check_out_date")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="adults"
              label={t("reservations.adults")}
              type="number"
              error={errors.adults?.message}
              {...register("adults", { valueAsNumber: true })}
            />
            <Input
              id="children"
              label={t("reservations.children")}
              type="number"
              {...register("children", { valueAsNumber: true })}
            />
          </div>

          <Input id="notes" label={t("reservations.notes")} {...register("notes")} />

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="payment_amount"
              label="To'lov summasi"
              type="number"
              min={0}
              {...register("payment_amount", { valueAsNumber: true })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To'lov turi
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                {...register("payment_method")}
              >
                <option value="">Tanlanmagan</option>
                <option value="CASH">Naqd</option>
                <option value="CREDIT_CARD">Kredit karta</option>
                <option value="DEBIT_CARD">Debet karta</option>
                <option value="BANK_TRANSFER">Bank o'tkazmasi</option>
                <option value="MOBILE_PAYMENT">Mobil to'lov</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              {t("reservations.cancel")}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {t("reservations.create")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!cancelModal}
        onClose={() => setCancelModal(null)}
        title={t("reservations.cancelReservation")}
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const form = e.target as HTMLFormElement
            const reason = (form.elements.namedItem("reason") as HTMLInputElement).value
            cancelMutation.mutate({ id: cancelModal!.id, reason })
          }}
          className="space-y-4"
        >
          <p className="text-sm text-gray-600">
            {t("reservations.cancelConfirm")}{" "}
            <strong>{cancelModal?.reservation_number}</strong>?
          </p>
          <Input id="reason" label={t("reservations.cancellationReason") + " *"} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setCancelModal(null)}>
              {t("reservations.back")}
            </Button>
            <Button type="submit" variant="danger" disabled={cancelMutation.isPending}>
              {t("reservations.cancelReservation")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
