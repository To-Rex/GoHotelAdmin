import api from "@/api/client"
import type {
  Room,
  RoomCreateRequest,
  RoomUpdateRequest,
  RoomStatusUpdate,
  RoomStatusHistory,
  Floor,
  FloorCreateRequest,
  FloorUpdateRequest,
  RoomType,
  RoomTypeCreateRequest,
  RoomTypeUpdateRequest,
} from "@/types/room"

export async function getRooms(params?: Record<string, string>) {
  const res = await api.get("/rooms", { params })
  return res.data
}

export async function getAvailableRooms(params?: Record<string, string>) {
  const res = await api.get("/rooms/available", { params })
  return res.data
}

export async function getRoom(id: string): Promise<Room> {
  const res = await api.get(`/rooms/${id}`)
  return res.data
}

export async function createRoom(data: RoomCreateRequest): Promise<Room> {
  const res = await api.post("/rooms", data)
  return res.data
}

export async function updateRoom(
  id: string,
  data: RoomUpdateRequest
): Promise<Room> {
  const res = await api.put(`/rooms/${id}`, data)
  return res.data
}

export async function updateRoomStatus(
  id: string,
  data: RoomStatusUpdate
): Promise<Room> {
  const res = await api.patch(`/rooms/${id}/status`, data)
  return res.data
}

export async function getRoomStatusHistory(
  id: string
): Promise<RoomStatusHistory[]> {
  const res = await api.get(`/rooms/${id}/status-history`)
  return res.data
}

export async function deleteRoom(id: string): Promise<void> {
  await api.delete(`/rooms/${id}`)
}

export async function getFloors(params?: Record<string, string>) {
  const res = await api.get("/floors", { params })
  return res.data
}

export async function createFloor(data: FloorCreateRequest): Promise<Floor> {
  const res = await api.post("/floors", data)
  return res.data
}

export async function updateFloor(
  id: string,
  data: FloorUpdateRequest
): Promise<Floor> {
  const res = await api.put(`/floors/${id}`, data)
  return res.data
}

export async function deleteFloor(id: string): Promise<void> {
  await api.delete(`/floors/${id}`)
}

export async function getRoomTypes(): Promise<RoomType[]> {
  const res = await api.get("/room-types")
  return res.data
}

export async function getRoomType(id: string): Promise<RoomType> {
  const res = await api.get(`/room-types/${id}`)
  return res.data
}

export async function createRoomType(
  data: RoomTypeCreateRequest
): Promise<RoomType> {
  const res = await api.post("/room-types", data)
  return res.data
}

export async function updateRoomType(
  id: string,
  data: RoomTypeUpdateRequest
): Promise<RoomType> {
  const res = await api.put(`/room-types/${id}`, data)
  return res.data
}

export async function updateRoomTypeStatus(
  id: string,
  isActive: boolean
): Promise<RoomType> {
  const res = await api.patch(`/room-types/${id}/status`, null, {
    params: { is_active: isActive },
  })
  return res.data
}

export async function deleteRoomType(id: string): Promise<void> {
  await api.delete(`/room-types/${id}`)
}

export async function getHotelRoomTypes(hotelId: string): Promise<RoomType[]> {
  const res = await api.get(`/hotels/${hotelId}/room-types`)
  return res.data
}

export async function addHotelRoomType(hotelId: string, roomTypeId: string): Promise<void> {
  await api.post(`/hotels/${hotelId}/room-types`, { room_type_id: roomTypeId })
}

export async function removeHotelRoomType(hotelId: string, roomTypeId: string): Promise<void> {
  await api.delete(`/hotels/${hotelId}/room-types/${roomTypeId}`)
}
