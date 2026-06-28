import api from "@/api/client"
import type {
  Reservation,
  ReservationCreateRequest,
  ReservationUpdateRequest,
  CheckInRequest,
  CheckOutRequest,
  CancelRequest,
  ReservationService,
  ReservationServiceCreateRequest,
} from "@/types/reservation"

export async function getReservations(params?: Record<string, string>) {
  const res = await api.get("/reservations", { params })
  return res.data
}

export async function getReservation(id: string): Promise<Reservation> {
  const res = await api.get(`/reservations/${id}`)
  return res.data
}

export async function createReservation(
  data: ReservationCreateRequest,
  params?: Record<string, string>
): Promise<Reservation> {
  const res = await api.post("/reservations", data, { params })
  return res.data
}

export async function updateReservation(
  id: string,
  data: ReservationUpdateRequest
): Promise<Reservation> {
  const res = await api.put(`/reservations/${id}`, data)
  return res.data
}

export async function checkInReservation(
  id: string,
  data?: CheckInRequest
): Promise<Reservation> {
  const res = await api.post(`/reservations/${id}/check-in`, data || {})
  return res.data
}

export async function checkOutReservation(
  id: string,
  data?: CheckOutRequest
): Promise<Reservation> {
  const res = await api.post(`/reservations/${id}/check-out`, data || {})
  return res.data
}

export async function cancelReservation(
  id: string,
  data: CancelRequest
): Promise<Reservation> {
  const res = await api.post(`/reservations/${id}/cancel`, data)
  return res.data
}

export async function noShowReservation(id: string): Promise<Reservation> {
  const res = await api.post(`/reservations/${id}/no-show`)
  return res.data
}

export async function getReservationCalendar(params?: Record<string, string>) {
  const res = await api.get("/reservations/calendar", { params })
  return res.data
}

export async function checkAvailability(params?: Record<string, string>) {
  const res = await api.get("/reservations/availability", { params })
  return res.data
}

export async function getReservationServices(
  id: string
): Promise<ReservationService[]> {
  const res = await api.get(`/reservations/${id}/services`)
  return res.data
}

export async function addReservationService(
  id: string,
  data: ReservationServiceCreateRequest
): Promise<ReservationService> {
  const res = await api.post(`/reservations/${id}/services`, data)
  return res.data
}

export async function removeReservationService(
  reservationId: string,
  serviceId: string
): Promise<void> {
  await api.delete(`/reservations/${reservationId}/services/${serviceId}`)
}
