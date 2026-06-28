import api from "@/api/client"
import type {
  Hotel,
  HotelCreateRequest,
  HotelUpdateRequest,
  HotelStatusUpdate,
} from "@/types/hotel"

export async function getHotels(params?: Record<string, string>) {
  const res = await api.get("/hotels", { params })
  return res.data
}

export async function getHotel(id: string): Promise<Hotel> {
  const res = await api.get(`/hotels/${id}`)
  return res.data
}

export async function createHotel(data: HotelCreateRequest): Promise<Hotel> {
  const res = await api.post("/hotels", data)
  return res.data
}

export async function updateHotel(
  id: string,
  data: HotelUpdateRequest
): Promise<Hotel> {
  const res = await api.put(`/hotels/${id}`, data)
  return res.data
}

export async function updateHotelStatus(
  id: string,
  data: HotelStatusUpdate
): Promise<Hotel> {
  const res = await api.patch(`/hotels/${id}/status`, data)
  return res.data
}

export async function deleteHotel(id: string): Promise<void> {
  await api.delete(`/hotels/${id}`)
}
