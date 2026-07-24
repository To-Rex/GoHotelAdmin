import { useState, useMemo, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  X,
  CheckCircle2,
  Clock,
  BedDouble,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameDay,
  isWithinInterval,
  parseISO,
  isToday,
} from "date-fns"
import { getReservations, createReservation } from "@/api/modules/reservations"
import { getRooms, getRoomTypes } from "@/api/modules/rooms"
import { getGuests, createGuest } from "@/api/modules/guests"
import { Button, Input, Modal, Spinner } from "@/components/ui"
import { useScope } from "@/hooks/useScope"
import { usePermissions } from "@/lib/permissions"
import { cn } from "@/lib/utils"
import type { Reservation } from "@/types/reservation"
import type { Room } from "@/types/room"
import type { Guest } from "@/types/guest"
import type { PaginatedResponse } from "@/types/common"

const DAY_WIDTH = 120
const ROOM_COL_WIDTH = 200
const ROW_HEIGHT = 72

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-400 text-gray-900",
  CONFIRMED: "bg-blue-600 text-white",
  CHECKED_IN: "bg-emerald-600 text-white",
  CHECKED_OUT: "bg-gray-400 text-white",
  NO_SHOW: "bg-gray-500 text-white",
  CANCELLED: "bg-red-100 text-red-500 line-through",
}

export function BookingPage() {
  const { t } = useTranslation()
  const weekDays = t("calendar.weekDays", { returnObjects: true }) as string[]
  const { scopeMerge, hotelId, branchId } = useScope()
  const { can } = usePermissions()
  const queryClient = useQueryClient()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [selectionStart, setSelectionStart] = useState<string | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [guestSearch, setGuestSearch] = useState("")
  const [showNewGuest, setShowNewGuest] = useState(false)
  const [selectedGuestId, setSelectedGuestId] = useState<string>("")

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const monthStartStr = format(monthStart, "yyyy-MM-dd")
  const monthEndStr = format(monthEnd, "yyyy-MM-dd")

  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ["rooms", "booking-calendar", hotelId, branchId],
    queryFn: () => getRooms(scopeMerge({ page_size: "200" })),
  })

  const { data: resData } = useQuery({
    queryKey: ["reservations", "booking", monthStartStr, monthEndStr, hotelId, branchId],
    queryFn: () =>
      getReservations(
        scopeMerge({
          from_date: monthStartStr,
          to_date: monthEndStr,
          page_size: "1000",
        })
      ),
  })

  const { data: guestsData } = useQuery({
    queryKey: ["guests", "booking"],
    queryFn: () => getGuests(scopeMerge({ page_size: "500" })),
  })

  const { data: roomTypesData } = useQuery({
    queryKey: ["roomTypes"],
    queryFn: getRoomTypes,
  })

  const rooms: Room[] = useMemo(() => {
    if (!roomsData) return []
    if (Array.isArray(roomsData)) return roomsData as Room[]
    return (roomsData as PaginatedResponse<Room>)?.items ?? []
  }, [roomsData])

  const reservations: Reservation[] = useMemo(() => {
    if (!resData) return []
    if (Array.isArray(resData)) return resData as Reservation[]
    return (resData as PaginatedResponse<Reservation>)?.items ?? []
  }, [resData])

  const guests: Guest[] = useMemo(() => {
    if (!guestsData) return []
    if (Array.isArray(guestsData)) return guestsData as Guest[]
    return (guestsData as PaginatedResponse<Guest>)?.items ?? []
  }, [guestsData])

  const priceMap = useMemo(() => {
    const map: Record<string, number> = {}
    if (!roomTypesData) return map
    const types: { id: string; base_price: number }[] = Array.isArray(roomTypesData)
      ? roomTypesData as { id: string; base_price: number }[]
      : []
    for (const rt of types) {
      map[rt.id] = rt.base_price ?? 0
    }
    return map
  }, [roomTypesData])

  const getRoomPrice = useCallback(
    (room: Room): number => {
      if (room.base_price && room.base_price > 0) return room.base_price
      if (room.room_type_id && priceMap[room.room_type_id]) return priceMap[room.room_type_id]
      return 0
    },
    [priceMap]
  )

  const filteredGuests = useMemo(() => {
    let list = guests
    if (selectedRoom?.hotel_id) {
      list = list.filter((g) => g.hotel_id === selectedRoom.hotel_id)
    }
    if (!guestSearch.trim()) return list.slice(0, 20)
    const q = guestSearch.toLowerCase()
    return list
      .filter(
        (g) =>
          g.first_name.toLowerCase().includes(q) ||
          g.last_name.toLowerCase().includes(q) ||
          g.phone?.includes(q)
      )
      .slice(0, 20)
  }, [guests, guestSearch, selectedRoom?.hotel_id])

  const reservationSchema = z
    .object({
      hotel_id: z.string().min(1),
      branch_id: z.string().min(1),
      guest_id: z.string().optional(),
      room_id: z.string().min(1, t("reservations.roomRequired")),
      check_in_date: z.string().min(1, t("reservations.checkInRequired")),
      check_out_date: z.string().min(1, t("reservations.checkOutRequired")),
      adults: z.number().min(1),
      children: z.number().min(0).optional(),
      notes: z.string().optional(),
      new_guest_first_name: z.string().optional(),
      new_guest_last_name: z.string().optional(),
      new_guest_phone: z.string().optional(),
      payment_amount: z.number().min(0).optional(),
      payment_method: z.enum(["CASH", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "MOBILE_PAYMENT", "ONLINE"]).nullable().optional(),
    })
    .refine(
      (data) => {
        if (!data.guest_id && !data.new_guest_first_name) return false
        return true
      },
      { message: t("reservations.guestRequired"), path: ["guest_id"] }
    )

  type BookingForm = z.infer<typeof reservationSchema>

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<BookingForm>({
    resolver: zodResolver(reservationSchema),
  })

  const roomReservations = useMemo(() => {
    const map: Record<string, Reservation[]> = {}
    for (const r of reservations) {
      if (r.status === "CANCELLED") continue
      if (!map[r.room_id]) map[r.room_id] = []
      map[r.room_id].push(r)
    }
    return map
  }, [reservations])

  const getReservationForDay = useCallback(
    (roomId: string, date: Date): Reservation | null => {
      const roomRes = roomReservations[roomId] || []
      for (const r of roomRes) {
        const checkIn = parseISO(r.check_in_date)
        const checkOut = parseISO(r.check_out_date)
        if (
          isWithinInterval(date, { start: checkIn, end: checkOut }) ||
          isSameDay(date, checkIn) ||
          isSameDay(date, checkOut)
        ) {
          return r
        }
      }
      return null
    },
    [roomReservations]
  )

  const isDateOccupied = useCallback(
    (roomId: string, date: Date): boolean => {
      return getReservationForDay(roomId, date) !== null
    },
    [getReservationForDay]
  )

  const handleCellClick = (room: Room, date: Date) => {
    if (isDateOccupied(room.id, date)) return

    const dateStr = format(date, "yyyy-MM-dd")

    if (!selectedRoom || selectedRoom.id !== room.id) {
      setSelectedRoom(room)
      setSelectionStart(dateStr)
      setSelectionEnd(dateStr)
      return
    }

    if (!selectionStart) {
      setSelectionStart(dateStr)
      setSelectionEnd(dateStr)
      return
    }

    const startDate = parseISO(selectionStart)
    if (date < startDate) {
      setSelectionStart(dateStr)
      setSelectionEnd(dateStr)
      return
    }

    const rangeEnd = eachDayOfInterval({ start: startDate, end: date })
    const hasOccupied = rangeEnd.some((d) => isDateOccupied(room.id, d))
    if (hasOccupied) {
      setSelectionStart(dateStr)
      setSelectionEnd(dateStr)
      return
    }

    setSelectionEnd(dateStr)
  }

  const isInSelectionRange = (roomId: string, date: Date): boolean => {
    if (!selectedRoom || selectedRoom.id !== roomId) return false
    if (!selectionStart || !selectionEnd) return false
    const start = parseISO(selectionStart)
    const end = parseISO(selectionEnd)
    return (
      isWithinInterval(date, { start, end }) ||
      isSameDay(date, start) ||
      isSameDay(date, end)
    )
  }

  const isSelectionStartDay = (date: Date): boolean => {
    if (!selectionStart) return false
    return isSameDay(date, parseISO(selectionStart))
  }

  const isSelectionEndDay = (date: Date): boolean => {
    if (!selectionEnd) return false
    return isSameDay(date, parseISO(selectionEnd))
  }

  const getGuestName = (reservation: Reservation): string => {
    if (reservation.guest) {
      return `${reservation.guest.first_name} ${reservation.guest.last_name}`
    }
    const g = guests.find((x) => x.id === reservation.guest_id)
    return g ? `${g.first_name} ${g.last_name}` : reservation.reservation_number
  }

  const openBookingModal = () => {
    setValue("room_id", selectedRoom?.id || "")
    if (selectedRoom) {
      setValue("hotel_id", selectedRoom.hotel_id)
      setValue("branch_id", selectedRoom.branch_id)
    }
    setValue("check_in_date", selectionStart || "")
    setValue("check_out_date", selectionEnd ? addDaysStr(selectionEnd, 1) : "")
    setValue("adults", 1)
    setValue("children", 0)
    setValue("guest_id", "")
    setValue("payment_amount", 0)
    setValue("payment_method", null)
    setSelectedGuestId("")
    setGuestSearch("")
    setModalOpen(true)
  }

  const createMutation = useMutation({
    mutationFn: async (values: BookingForm) => {
      let guestId = values.guest_id

      if (!guestId && values.new_guest_first_name) {
        const guest = await createGuest(
          {
            hotel_id: values.hotel_id,
            first_name: values.new_guest_first_name,
            last_name: values.new_guest_last_name || "",
            phone: values.new_guest_phone || undefined,
          },
          { hotel_id: values.hotel_id }
        )
        guestId = guest.id
      }

      return createReservation(
        {
          hotel_id: values.hotel_id,
          branch_id: values.branch_id,
          guest_id: guestId || "",
          room_id: values.room_id,
          check_in_date: values.check_in_date,
          check_out_date: values.check_out_date,
          adults: values.adults,
          children: values.children || 0,
          notes: values.notes,
          payment_amount: values.payment_amount || 0,
          payment_method: values.payment_method || null,
        },
        { hotel_id: values.hotel_id }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] })
      queryClient.invalidateQueries({ queryKey: ["rooms"] })
      queryClient.removeQueries({ queryKey: ["guests"] })
      setModalOpen(false)
      setSelectedRoom(null)
      setSelectionStart(null)
      setSelectionEnd(null)
      setShowNewGuest(false)
      setSelectedGuestId("")
      reset()
    },
  })

  const onSubmit = (values: BookingForm) => {
    createMutation.mutate(values)
  }

  const clearSelection = () => {
    setSelectedRoom(null)
    setSelectionStart(null)
    setSelectionEnd(null)
  }

  const nightCount =
    selectionStart && selectionEnd
      ? dayDiff(selectionStart, selectionEnd) + 1
      : 0

  const roomPrice = selectedRoom ? getRoomPrice(selectedRoom) : 0
  const totalPrice = nightCount * roomPrice

  const calendarWidth = days.length * DAY_WIDTH

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] -m-6">
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-bold text-gray-900 min-w-[200px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>
            {t("calendar.today") || "Bugun"}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {selectedRoom && selectionStart && selectionEnd && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">
              <span className="font-semibold text-gray-900">{selectedRoom.room_number}</span>
              <span>·</span>
              <span>{selectionStart} → {selectionEnd}</span>
              <span>·</span>
              <span>{nightCount} {t("booking.nights")}</span>
              <span>·</span>
              <span className="font-medium text-primary-700">{totalPrice.toLocaleString()} {t("common.som")}</span>
              <button
                onClick={clearSelection}
                className="ml-2 p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {can("reservation.create") && (
            <Button
              onClick={openBookingModal}
              disabled={!selectedRoom || !selectionStart || !selectionEnd}
              className="disabled:opacity-100 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
            >
              <Plus className="h-4 w-4" />
              {t("booking.newBooking")}
            </Button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex-shrink-0 flex items-center gap-5 px-6 py-2 bg-white border-b border-gray-100 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-600" />
          <span>{t("status.CONFIRMED") || "Tasdiqlangan"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-600" />
          <span>{t("status.CHECKED_IN") || "Kirgan"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-400" />
          <span>{t("status.PENDING") || "Kutilmoqda"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-primary-100 border border-primary-300" />
          <span>{t("booking.selected")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-gray-400" />
          <span>{t("status.CHECKED_OUT") || "Chiqgan"}</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-auto bg-gray-50">
        {roomsLoading ? (
          <div className="flex items-center justify-center h-full">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <div className="min-w-max h-full">
            {/* Header row */}
            <div className="sticky top-0 z-20 flex bg-white border-b border-gray-200 shadow-sm">
              <div
                className="flex-shrink-0 h-14 flex items-center px-4 bg-gray-50 border-r border-gray-200 sticky left-0 z-30"
                style={{ width: ROOM_COL_WIDTH }}
              >
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t("booking.rooms")}
                </span>
              </div>
              <div className="flex" style={{ width: calendarWidth }}>
                {days.map((day) => {
                  const weekend = day.getDay() === 0 || day.getDay() === 6
                  const today = isToday(day)
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "flex-shrink-0 border-r border-gray-200 flex flex-col items-center justify-center h-14",
                        today && "bg-primary-50",
                        weekend && !today && "bg-gray-50"
                      )}
                      style={{ width: DAY_WIDTH }}
                    >
                      <span
                        className={cn(
                          "text-xs font-medium",
                          today ? "text-primary-700" : weekend ? "text-red-400" : "text-gray-400"
                        )}
                      >
                        {weekDays[(day.getDay() + 6) % 7]}
                      </span>
                      <span
                        className={cn(
                          "text-lg font-bold",
                          today ? "text-primary-700" : weekend ? "text-red-500" : "text-gray-900"
                        )}
                      >
                        {format(day, "dd")}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Room rows */}
            <div>
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex border-b border-gray-100 bg-white hover:bg-gray-50/50 transition-colors"
                  style={{ height: ROW_HEIGHT }}
                >
                  {/* Room info - sticky left */}
                  <div
                    className="flex-shrink-0 flex flex-col justify-center px-4 bg-white border-r border-gray-200 sticky left-0 z-10"
                    style={{ width: ROOM_COL_WIDTH }}
                  >
                    <span className="text-sm font-bold text-gray-900">
                      {room.room_number}
                    </span>
                    <span className="text-xs text-gray-400 truncate">
                      {room.room_type?.name || ""}
                    </span>
                    {getRoomPrice(room) > 0 && (
                      <span className="text-[10px] text-primary-600 font-medium">
                        {getRoomPrice(room).toLocaleString()} {t("common.som")}
                      </span>
                    )}
                  </div>

                  {/* Day cells */}
                  <div
                    className="flex relative"
                    style={{ width: calendarWidth }}
                  >
                    {/* Grid lines */}
                    {days.map((day) => (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "flex-shrink-0 border-r border-gray-50 h-full",
                          isToday(day) && "bg-primary-50/30",
                          isInSelectionRange(room.id, day) && "bg-primary-100/70"
                        )}
                        style={{ width: DAY_WIDTH }}
                        onClick={() => handleCellClick(room, day)}
                      />
                    ))}

                    {/* Booking bars */}
                    {reservations
                      .filter(
                        (r) =>
                          r.room_id === room.id && r.status !== "CANCELLED"
                      )
                      .map((res) => {
                        const checkIn = parseISO(res.check_in_date)
                        const checkOut = parseISO(res.check_out_date)
                        const startDayIdx = days.findIndex((d) =>
                          isSameDay(d, checkIn)
                        )
                        const endDayIdx = days.findIndex((d) =>
                          isSameDay(d, checkOut)
                        )
                        if (startDayIdx === -1 && endDayIdx === -1) return null

                        const left =
                          startDayIdx >= 0
                            ? startDayIdx * DAY_WIDTH + 4
                            : 4
                        const width =
                          startDayIdx >= 0 && endDayIdx >= 0
                            ? (endDayIdx - startDayIdx + 1) * DAY_WIDTH - 8
                            : startDayIdx >= 0
                              ? (days.length - startDayIdx) * DAY_WIDTH - 8
                              : endDayIdx >= 0
                                ? (endDayIdx + 1) * DAY_WIDTH - 8
                                : calendarWidth - 8

                        const colorClass =
                          statusColors[res.status] || statusColors.PENDING

                        return (
                          <div
                            key={res.id}
                            className={cn(
                              "absolute top-2 h-12 rounded-xl shadow-sm flex items-center px-3 gap-2 cursor-pointer hover:scale-[1.01] transition-transform z-10",
                              colorClass
                            )}
                            style={{ left, width }}
                            title={`${res.reservation_number} - ${getGuestName(res)}`}
                          >
                            {res.status === "CONFIRMED" || res.status === "CHECKED_IN" ? (
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                            ) : res.status === "PENDING" ? (
                              <Clock className="h-4 w-4 flex-shrink-0" />
                            ) : (
                              <BedDouble className="h-4 w-4 flex-shrink-0" />
                            )}
                            <div className="overflow-hidden min-w-0">
                              <p className="text-sm font-semibold truncate">
                                {getGuestName(res)}
                              </p>
                              <p className="text-[10px] opacity-80 truncate">
                                {t(`status.${res.status}`, res.status)} · {res.check_in_date} → {res.check_out_date}
                              </p>
                            </div>
                          </div>
                        )
                      })}

                    {/* Selection indicator */}
                    {selectedRoom?.id === room.id &&
                      selectionStart &&
                      selectionEnd &&
                      days.map((day) => {
                        if (!isInSelectionRange(room.id, day)) return null
                        const start = isSelectionStartDay(day)
                        const end = isSelectionEndDay(day)
                        const idx = days.findIndex((d) => isSameDay(d, day))
                        return (
                          <div
                            key={`sel-${day.toISOString()}`}
                            className={cn(
                              "absolute top-2 h-12 z-20 flex items-center justify-center text-xs font-medium",
                              start && end
                                ? "bg-primary-500 text-white rounded-xl"
                                : start
                                  ? "bg-primary-500 text-white rounded-l-xl"
                                  : end
                                    ? "bg-primary-500 text-white rounded-r-xl"
                                    : "bg-primary-200/80 text-primary-800"
                            )}
                            style={{
                              left: idx * DAY_WIDTH + (start ? 4 : 0),
                              width:
                                start && end
                                  ? DAY_WIDTH - 8
                                  : start
                                    ? DAY_WIDTH - 4
                                    : end
                                      ? DAY_WIDTH - 4
                                      : DAY_WIDTH,
                            }}
                          >
                            {start && t("booking.checkIn")}
                            {end && !start && t("booking.checkOut")}
                          </div>
                        )
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="text-sm text-gray-500">
          {rooms.length} {t("booking.totalRooms")} · {format(currentMonth, "MMMM yyyy")}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={clearSelection} disabled={!selectedRoom}>
            {t("booking.cancel")}
          </Button>
          {can("reservation.create") && (
            <Button
              onClick={openBookingModal}
              disabled={!selectedRoom || !selectionStart || !selectionEnd}
              className="disabled:opacity-100 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
            >
              <CheckCircle2 className="h-4 w-4" />
              {t("booking.confirm")}
            </Button>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setShowNewGuest(false)
          setSelectedGuestId("")
        }}
        title={t("booking.newBooking")}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {selectedRoom && (
            <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg">
              <BedDouble className="h-5 w-5 text-primary-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {selectedRoom.room_number}
                  {selectedRoom.room_type?.name && (
                    <span className="text-gray-500 font-normal ml-2">
                      {selectedRoom.room_type.name}
                    </span>
                  )}
                </p>
                {selectionStart && selectionEnd && (
                  <p className="text-xs text-gray-500">
                    {selectionStart} → {selectionEnd} ({nightCount} {t("booking.nights")})
                  </p>
                )}
              </div>
            </div>
          )}

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

          {/* Guest selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t("reservations.guest")} *
            </label>

            {!showNewGuest ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder={t("booking.searchGuest")}
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {filteredGuests.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
                        selectedGuestId === g.id && "bg-primary-50 text-primary-700"
                      )}
                      onClick={() => {
                        setValue("guest_id", g.id)
                        setSelectedGuestId(g.id)
                        setGuestSearch("")
                      }}
                    >
                      <span className="font-medium">
                        {g.first_name} {g.last_name}
                      </span>
                      {g.phone && (
                        <span className="text-gray-400 ml-2">{g.phone}</span>
                      )}
                    </button>
                  ))}
                  {filteredGuests.length === 0 && (
                    <p className="px-3 py-4 text-sm text-gray-400 text-center">
                      {t("booking.noGuests")}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  onClick={() => setShowNewGuest(true)}
                >
                  + {t("booking.newGuest")}
                </button>
              </div>
            ) : (
              <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    id="new_guest_first_name"
                    label={t("guests.firstName") + " *"}
                    placeholder={t("guests.firstName")}
                    {...register("new_guest_first_name")}
                  />
                  <Input
                    id="new_guest_last_name"
                    label={t("guests.lastName")}
                    placeholder={t("guests.lastName")}
                    {...register("new_guest_last_name")}
                  />
                </div>
                <Input
                  id="new_guest_phone"
                  label={t("guests.phone")}
                  placeholder="+998"
                  {...register("new_guest_phone")}
                />
                <button
                  type="button"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  onClick={() => {
                    setShowNewGuest(false)
                    setValue("new_guest_first_name", "")
                    setValue("new_guest_last_name", "")
                    setValue("new_guest_phone", "")
                  }}
                >
                  ← {t("booking.existingGuest")}
                </button>
              </div>
            )}
            {errors.guest_id && (
              <p className="text-xs text-red-600 mt-1">{errors.guest_id.message}</p>
            )}
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

          <Input
            id="notes"
            label={t("reservations.notes")}
            placeholder={t("booking.notesPlaceholder")}
            {...register("notes")}
          />

          <div className="p-3 bg-gray-50 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t("booking.roomPrice")} ({nightCount} {t("booking.nights")})</span>
              <span className="text-sm font-semibold text-gray-900">{totalPrice.toLocaleString()} {t("common.som")}</span>
            </div>
            <div className="border-t border-gray-200 pt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t("booking.paymentAmount")}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="payment_amount"
                  label=""
                  type="number"
                  min={0}
                  max={totalPrice}
                  placeholder="0"
                  {...register("payment_amount", { valueAsNumber: true })}
                />
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  {...register("payment_method")}
                >
                  <option value="">{t("booking.paymentMethodPlaceholder")}</option>
                  <option value="CASH">{t("status.CASH")}</option>
                  <option value="CREDIT_CARD">{t("status.CREDIT_CARD")}</option>
                  <option value="DEBIT_CARD">{t("status.DEBIT_CARD")}</option>
                  <option value="BANK_TRANSFER">{t("status.BANK_TRANSFER")}</option>
                  <option value="MOBILE_PAYMENT">{t("status.MOBILE_PAYMENT")}</option>
                  <option value="ONLINE">{t("status.ONLINE")}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setModalOpen(false)
                setShowNewGuest(false)
                setSelectedGuestId("")
              }}
            >
              {t("booking.cancel")}
            </Button>
            {can("reservation.create") && (
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? t("booking.booking") : t("booking.bookNow")}
              </Button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  )
}

function dayDiff(start: string, end: string): number {
  const s = parseISO(start)
  const e = parseISO(end)
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
}

function addDaysStr(dateStr: string, days: number): string {
  const d = parseISO(dateStr)
  d.setDate(d.getDate() + days)
  return format(d, "yyyy-MM-dd")
}
