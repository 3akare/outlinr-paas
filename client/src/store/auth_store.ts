import { create } from "zustand"

interface AuthState {
  accessToken: string | null
  isAuthenticated: boolean
  setAccessToken: (token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  isAuthenticated: false,
  setAccessToken: (token) => set({ accessToken: token, isAuthenticated: true }),
  clearAuth: () => set({ accessToken: null, isAuthenticated: false }),
}))

export const useAuthAccessToken = () =>
  useAuthStore((state) => state.accessToken)
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated)
export const useSetAccessToken = () =>
  useAuthStore((state) => state.setAccessToken)
export const useClearAuth = () => useAuthStore((state) => state.clearAuth)
