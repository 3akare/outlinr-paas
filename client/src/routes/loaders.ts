import { redirect } from "react-router"
import axios from "axios"
import { useAuthStore } from "@/store/auth_store"

export const protectedLoader = async () => {
  const token = useAuthStore.getState().accessToken
  if (token) return null

  try {
    const response = await axios.post<{ data?: { accessToken: string }, accessToken?: string }>(
      `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
      {},
      { withCredentials: true }
    )
    const token = response.data?.data?.accessToken || response.data?.accessToken
    if (!token) throw new Error("Missing token")
    useAuthStore.getState().setAccessToken(token)
    return null
  } catch {
    useAuthStore.getState().clearAuth()
    return redirect("/login")
  }
}
