import api from "@/api/client"
import type {
  Guest,
  GuestCreateRequest,
  GuestUpdateRequest,
} from "@/types/guest"

export async function getGuests(params?: Record<string, string>) {
  const res = await api.get("/guests", { params })
  return res.data
}

export async function getGuest(id: string): Promise<Guest> {
  const res = await api.get(`/guests/${id}`)
  return res.data
}

export async function createGuest(data: GuestCreateRequest, params?: Record<string, string>): Promise<Guest> {
  const res = await api.post("/guests", data, { params })
  return res.data
}

export async function updateGuest(
  id: string,
  data: GuestUpdateRequest
): Promise<Guest> {
  const res = await api.put(`/guests/${id}`, data)
  return res.data
}

export async function deleteGuest(id: string): Promise<void> {
  await api.delete(`/guests/${id}`)
}

export async function getGuestReservations(id: string) {
  const res = await api.get(`/guests/${id}/reservations`)
  return res.data
}
