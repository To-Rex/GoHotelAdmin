import api from "@/api/client"
import type {
  Service,
  ServiceCreateRequest,
  ServiceUpdateRequest,
  HotelService,
  HotelServiceCreateRequest,
  HotelServiceUpdateRequest,
} from "@/types/service"

export async function getServices(): Promise<Service[]> {
  const res = await api.get("/services")
  return res.data
}

export async function createService(
  data: ServiceCreateRequest
): Promise<Service> {
  const res = await api.post("/services", data)
  return res.data
}

export async function updateService(
  id: string,
  data: ServiceUpdateRequest
): Promise<Service> {
  const res = await api.put(`/services/${id}`, data)
  return res.data
}

export async function getHotelServices(params?: Record<string, string>) {
  const res = await api.get("/hotel-services", { params })
  return res.data
}

export async function createHotelService(
  data: HotelServiceCreateRequest
): Promise<HotelService> {
  const res = await api.post("/hotel-services", data)
  return res.data
}

export async function updateHotelService(
  id: string,
  data: HotelServiceUpdateRequest
): Promise<HotelService> {
  const res = await api.put(`/hotel-services/${id}`, data)
  return res.data
}

export async function deleteHotelService(id: string): Promise<void> {
  await api.delete(`/hotel-services/${id}`)
}
