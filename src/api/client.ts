import axios, { type InternalAxiosRequestConfig } from "axios"
import { useAuthStore } from "@/store/auth"

const API_URL = "/api/v1"
const BACKEND_URL = import.meta.env.VITE_API_BASE || "https://gohotel-gohotel-backend-lhyen5-ecceab-13-140-185-49.sslip.io"

const api = axios.create({
  baseURL: import.meta.env.PROD ? `${BACKEND_URL}${API_URL}` : API_URL,
  headers: { "Content-Type": "application/json" },
})

const ROUTERS: Record<string, string> = {
  auth: "auth",
  hotels: "hotels",
  branches: "branches",
  floors: "floors",
  "room-types": "room-types",
  rooms: "rooms",
  guests: "guests",
  reservations: "reservations",
  employees: "employees",
  permissions: "permissions",
  services: "services",
  "hotel-services": "hotel-services",
  housekeeping: "housekeeping",
  finance: "finance",
  reports: "reports",
  "audit-logs": "audit-logs",
  files: "files",
  notifications: "notifications",
  amenities: "amenities",
}

let isLoggingOut = false

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (config.url) {
    const [path, query] = config.url.split("?")
    const cleanPath = path.endsWith("/") ? path.slice(0, -1) : path
    const segments = cleanPath.split("/").filter(Boolean)

    let corrected = cleanPath
    if (query) {
      config.url = `${corrected}?${query}`
    } else {
      if (segments.length === 1 && ROUTERS[segments[0]]) {
        corrected = cleanPath + "/"
      }
      config.url = corrected
    }
  }

  return config
})

const AUTH_URLS = ["/auth/login", "/auth/logout", "/auth/refresh"]

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requestUrl = (error.config as InternalAxiosRequestConfig)?.url ?? ""

    if (error.response?.status === 401 && !AUTH_URLS.includes(requestUrl)) {
      if (!isLoggingOut) {
        isLoggingOut = true
        useAuthStore.getState().clearAuth()
        isLoggingOut = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
