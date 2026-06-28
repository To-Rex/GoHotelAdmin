import api from "@/api/client"
import type {
  LoginRequest,
  TokenResponse,
  RefreshRequest,
  UserProfile,
} from "@/types/auth"

export async function login(data: LoginRequest): Promise<TokenResponse> {
  const res = await api.post("/auth/login", data)
  return res.data
}

export async function refreshToken(
  data: RefreshRequest
): Promise<TokenResponse> {
  const res = await api.post("/auth/refresh", data)
  return res.data
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout")
}

export async function getMe(): Promise<UserProfile> {
  const res = await api.get("/auth/me")
  return res.data
}
