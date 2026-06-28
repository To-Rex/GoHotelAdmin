import api from "@/api/client"
import type { Amenity, AmenityCreateRequest, AmenityUpdateRequest } from "@/types/room"

export async function getAmenities(): Promise<Amenity[]> {
  const res = await api.get("/amenities")
  return res.data
}

export async function createAmenity(data: AmenityCreateRequest): Promise<Amenity> {
  const res = await api.post("/amenities", data)
  return res.data
}

export async function updateAmenity(id: string, data: AmenityUpdateRequest): Promise<Amenity> {
  const res = await api.put(`/amenities/${id}`, data)
  return res.data
}

export async function deleteAmenity(id: string): Promise<void> {
  await api.delete(`/amenities/${id}`)
}

export async function getHotelAmenities(hotelId: string): Promise<Amenity[]> {
  const res = await api.get(`/hotels/${hotelId}/amenities`)
  return res.data
}

export async function addHotelAmenity(hotelId: string, amenityId: string): Promise<void> {
  await api.post(`/hotels/${hotelId}/amenities`, { amenity_id: amenityId })
}

export async function removeHotelAmenity(hotelId: string, amenityId: string): Promise<void> {
  await api.delete(`/hotels/${hotelId}/amenities/${amenityId}`)
}

export async function addRoomAmenity(
  roomId: string,
  amenityId: string,
  params?: Record<string, string>
): Promise<void> {
  await api.post(`/rooms/${roomId}/amenities`, { amenity_id: amenityId }, { params })
}

export async function removeRoomAmenity(
  roomId: string,
  amenityId: string,
  params?: Record<string, string>
): Promise<void> {
  await api.delete(`/rooms/${roomId}/amenities/${amenityId}`, { params })
}
