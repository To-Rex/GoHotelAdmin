import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { UserProfile } from "@/types/auth"
import * as authApi from "@/api/modules/auth"

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
        try {
          const data = await authApi.login({ username, password })
          set({
            token: data.access_token,
            refreshToken: data.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          })
          try {
            const user = await authApi.getMe()
            set({ user })
          } catch {
            // user profile fetch failed but login succeeded
          }
        } catch {
          set({ isLoading: false })
          throw new Error("Invalid credentials")
        }
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
