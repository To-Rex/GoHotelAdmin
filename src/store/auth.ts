import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { UserProfile } from "@/types/auth"
import * as authApi from "@/api/modules/auth"

// Admin panelga kirishga kim ruxsat etiladi:
//  - SUPER_ADMIN (barcha mehmonxonalar)
//  - ADMIN (o'z mehmonxonasida to'liq)
//  - EMPLOYEE — kamida bitta ruxsatga ega bo'lsa (manager/reception)
// (aylanma importdan qochish uchun bu yerda inline, permissions.ts bilan bir xil qoida)
function isAllowedInAdminPanel(u: UserProfile | null | undefined): boolean {
  if (!u) return false
  if (u.user_type === "SUPER_ADMIN" || u.user_type === "ADMIN") return true
  if (u.user_type === "EMPLOYEE") return (u.permissions?.length || 0) > 0
  return false
}

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  clearAuth: () => void
  fetchProfile: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,

      login: async (username, password) => {
        set({ isLoading: true })
        let data
        try {
          data = await authApi.login({ username, password })
        } catch {
          set({ isLoading: false })
          throw new Error("Invalid credentials")
        }

        set({
          token: data.access_token,
          refreshToken: data.refresh_token,
        })

        let user: UserProfile | null = data.user ?? null
        if (!user) {
          try {
            user = await authApi.getMe()
          } catch {
            user = null
          }
        }

        // SUPER_ADMIN, ADMIN va ruxsatli EMPLOYEE (manager) kirishi mumkin
        if (!isAllowedInAdminPanel(user)) {
          try {
            await authApi.logout()
          } catch {
            // ignore - token may already be invalid
          }
          set({
            token: null,
            refreshToken: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,
          })
          throw new Error("ACCESS_DENIED")
        }

        set({ user, isAuthenticated: true, isLoading: false })
      },

      logout: async () => {
        try {
          await authApi.logout()
        } catch {
          // ignore - token may already be invalid
        }
        set({
          token: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        })
      },

      clearAuth: () => {
        set({
          token: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        })
      },

      fetchProfile: async () => {
        try {
          const user = await authApi.getMe()
          if (!isAllowedInAdminPanel(user)) {
            get().clearAuth()
            return
          }
          set({ user, isAuthenticated: true })
        } catch {
          set({
            token: null,
            refreshToken: null,
            user: null,
            isAuthenticated: false,
          })
        }
      },

      initialize: async () => {
        const { token } = get()
        if (!token) {
          set({ isInitialized: true })
          return
        }
        try {
          const user = await authApi.getMe()
          if (!isAllowedInAdminPanel(user)) {
            set({
              token: null,
              refreshToken: null,
              user: null,
              isAuthenticated: false,
              isInitialized: true,
            })
            return
          }
          set({ user, isAuthenticated: true, isInitialized: true })
        } catch {
          set({
            token: null,
            refreshToken: null,
            user: null,
            isAuthenticated: false,
            isInitialized: true,
          })
        }
      },
    }),
    {
      name: "gohotel-auth",
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
