import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
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
import { getReservations } from "@/api/modules/reservations"
import { getRooms } from "@/api/modules/rooms"
import { getGuests } from "@/api/modules/guests"
import { Button, Spinner, Badge } from "@/components/ui"
import type { Reservation } from "@/types/reservation"
import type { Room } from "@/types/room"
import type { Guest } from "@/types/guest"

interface ReservationCalendarProps {
  hotelId?: string
  branchId?: string
  onSelectRange: (room: Room, checkIn: string, checkOut: string) => void
}

export function ReservationCalendar({ hotelId, branchId, onSelectRange }: ReservationCalendarProps) {
  const { t } = useTranslation()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [selectionStart, setSelectionStart] = useState<string | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; reservation: Reservation } | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const monthStartStr = format(monthStart, "yyyy-MM-dd")
  const monthEndStr = format(monthEnd, "yyyy-MM-dd")

  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ["rooms", "calendar", hotelId, branchId],
    queryFn: () => getRooms({ hotel_id: hotelId || "", branch_id: branchId || "", page_size: "200" }),
    enabled: !!hotelId || !!branchId,
  })

  const { data: resData, isLoading: resLoading } = useQuery({
    queryKey: ["reservations", "calendar", monthStartStr, monthEndStr, hotelId, branchId],
    queryFn: () =>
      getReservations({
        hotel_id: hotelId || "",
        branch_id: branchId || "",
        from_date: monthStartStr,
        to_date: monthEndStr,
        page_size: "1000",
      }),
  })

  const { data: guestsData } = useQuery({
    queryKey: ["guests", "calendar-res"],
    queryFn: () => getGuests({ page_size: "500" }),
  })

  const rooms: Room[] = useMemo(() => {
    if (!roomsData) return []
    return Array.isArray(roomsData) ? roomsData : (roomsData as any)?.items ?? []
  }, [roomsData])

  const reservations: Reservation[] = useMemo(() => {
    if (!resData) return []
    return Array.isArray(resData) ? resData : (resData as any)?.items ?? []
  }, [resData])

  const guests: Guest[] = useMemo(() => {
    if (!guestsData) return []
    return Array.isArray(guestsData) ? guestsData : (guestsData as any)?.items ?? []
  }, [guestsData])

  const roomReservations = useMemo(() => {
    const map: Record<string, Reservation[]> = {}
    for (const r of reservations) {
      if (!map[r.room_id]) map[r.room_id] = []
      map[r.room_id].push(r)
    }
    return map
  }, [reservations])

  const getGuestName = (guestId: string) => {
    const g = guests.find((g) => g.id === guestId)
    return g ? `${g.first_name} ${g.last_name}` : ""
  }

  const getReservationForDay = (roomId: string, date: Date): Reservation | null => {
    const roomRes = roomReservations[roomId] || []
    for (const r of roomRes) {
      if (r.status === "CANCELLED") continue
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
  }

  const isDateOccupied = (roomId: string, date: Date): boolean => {
    return getReservationForDay(roomId, date) !== null
  }

  const isDateSelectable = (roomId: string, date: Date): boolean => {
    return !isDateOccupied(roomId, date)
  }

  const handleDayClick = (room: Room, date: Date) => {
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

    if (selectionStart === dateStr) {
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

  const handleBookClick = () => {
    if (selectedRoom && selectionStart && selectionEnd) {
      const checkOutDate = format(addDays(parseISO(selectionEnd), 1), "yyyy-MM-dd")
      onSelectRange(selectedRoom, selectionStart, checkOutDate)
      setSelectionStart(null)
      setSelectionEnd(null)
    }
  }

  const isInSelectionRange = (roomId: string, date: Date): boolean => {
    if (!selectedRoom || selectedRoom.id !== roomId) return false
    if (!selectionStart || !selectionEnd) return false
    const start = parseISO(selectionStart)
    const end = parseISO(selectionEnd)
    return isWithinInterval(date, { start, end }) || isSameDay(date, start) || isSameDay(date, end)
  }

  const isSelectionStart = (date: Date): boolean => {
    if (!selectionStart) return false
    return isSameDay(date, parseISO(selectionStart))
  }

  const isSelectionEnd = (date: Date): boolean => {
    if (!selectionEnd) return false
    return isSameDay(date, parseISO(selectionEnd))
  }

  const getResStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      PENDING: "bg-yellow-400",
      CONFIRMED: "bg-blue-500",
      CHECKED_IN: "bg-emerald-500",
      CHECKED_OUT: "bg-gray-400",
      NO_SHOW: "bg-gray-500",
      CANCELLED: "bg-red-300",
    }
    return colors[status] || "bg-gray-400"
  }

  const getStatusLabel = (status: string): string => {
    return t(`status.${status}`) || status
  }

  const isLoading = roomsLoading || resLoading

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold text-gray-900">
            {(t("calendar.months", { returnObjects: true }) as unknown as string[])[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>
            {t("calendar.today")}
          </Button>
        </div>
        {selectedRoom && selectionStart && selectionEnd && (
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{selectedRoom.room_number}</span>
              <span className="mx-2">·</span>
              <span>{selectionStart} → {selectionEnd}</span>
              <span className="mx-2">·</span>
              <span>{dayCount(selectionStart, selectionEnd)} {t("reservations.dates").toLowerCase()}</span>
            </div>
            <Button size="sm" onClick={handleBookClick}>
              {t("reservations.newReservation")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setSelectedRoom(null); setSelectionStart(null); setSelectionEnd(null) }}>
              {t("common.cancel")}
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-white border border-gray-200" />
          <span className="text-gray-500">{t("status.AVAILABLE") || "Available"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-500" />
          <span className="text-gray-500">{t("status.CONFIRMED") || "Confirmed"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span className="text-gray-500">{t("status.CHECKED_IN") || "Checked In"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-yellow-400" />
          <span className="text-gray-500">{t("status.PENDING") || "Pending"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-primary-100 border border-primary-400" />
          <span className="text-gray-500">{t("reservations.selectDates")}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t("reservations.noRooms")}</p>
        </div>
      ) : (
        <div className="overflow-auto rounded-xl border border-gray-200">
          <div className="min-w-max">
            <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
              <div className="w-28 min-w-[112px] flex-shrink-0 px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase border-r border-gray-200">
                {t("reservations.room")}
              </div>
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`w-9 min-w-[36px] flex-shrink-0 py-2.5 text-center text-xs font-medium border-r border-gray-100 ${
                    isToday(day) ? "bg-primary-50" : ""
                  }`}
                >
                  <div className="text-gray-400 mb-0.5">
                    {(t("calendar.weekDays", { returnObjects: true }) as unknown as string[])[(day.getDay() + 6) % 7]}
                  </div>
                  <div className={isToday(day) ? "text-primary-700 font-bold" : "text-gray-700"}>
                    {day.getDate()}
                  </div>
                </div>
              ))}
            </div>

            <div className="divide-y divide-gray-100">
              {rooms.map((room) => (
                <div key={room.id} className="flex hover:bg-gray-50/50 transition-colors">
                  <div className="w-28 min-w-[112px] flex-shrink-0 px-3 py-2 flex items-center border-r border-gray-200">
                    <div className="truncate">
                      <p className="text-sm font-medium text-gray-900">{room.room_number}</p>
                      {room.room_type && (
                        <p className="text-xs text-gray-400 truncate">{room.room_type.name}</p>
                      )}
                    </div>
                  </div>
                  {days.map((day) => {
                    const occupied = isDateOccupied(room.id, day)
                    const inRange = isInSelectionRange(room.id, day)
                    const selStart = isSelectionStart(day)
                    const selEnd = isSelectionEnd(day)
                    const reservation = getReservationForDay(room.id, day)
                    const today = isToday(day)

                    return (
                      <div
                        key={day.toISOString()}
                        className={`w-9 min-w-[36px] flex-shrink-0 h-10 flex items-center justify-center border-r border-gray-50 relative ${
                          today ? "bg-primary-50/50" : ""
                        } ${
                          inRange
                            ? "bg-primary-100 border-primary-200"
                            : ""
                        } ${
                          !occupied && !inRange
                            ? "cursor-pointer hover:bg-gray-100"
                            : ""
                        }`}
                        onClick={() => handleDayClick(room, day)}
                        onMouseEnter={(e) => {
                          if (reservation) {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                            setTooltip({
                              x: rect.left + rect.width / 2,
                              y: rect.bottom + 4,
                              reservation,
                            })
                          }
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        {occupied && reservation ? (
                          <div
                            className={`w-full h-6 rounded-sm px-0.5 flex items-center justify-center ${getResStatusColor(reservation.status)}`}
                            title={`${reservation.reservation_number} - ${getGuestName(reservation.guest_id)}`}
                          >
                            <span className="text-[9px] text-white font-medium truncate">
                              {getGuestName(reservation.guest_id).split(" ")[0] || reservation.reservation_number}
                            </span>
                          </div>
                        ) : inRange ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className={`w-full h-5 ${selStart || selEnd ? "bg-primary-400 rounded-md" : "bg-primary-200"}`}>
                              {(selStart || selEnd) && (
                                <span className="text-[9px] text-white flex items-center justify-center h-full font-medium">
                                  {selStart ? "in" : "out"}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : today ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-xs"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translateX(-50%)" }}
        >
          <div className="font-medium">{tooltip.reservation.reservation_number}</div>
          <div className="text-gray-300 mt-0.5">
            {getGuestName(tooltip.reservation.guest_id)}
          </div>
          <div className="text-gray-400 mt-0.5">
            {tooltip.reservation.check_in_date} → {tooltip.reservation.check_out_date}
          </div>
          <div className="mt-1">
            <Badge variant={tooltip.reservation.status} />
          </div>
        </div>
      )}
    </div>
  )
}

function dayCount(start: string, end: string): number {
  const s = parseISO(start)
  const e = parseISO(end)
  const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(1, diff + 1)
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}
