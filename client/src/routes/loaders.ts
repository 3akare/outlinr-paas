import { redirect } from "react-router"
import axios from "axios"
import { useAuthStore } from "@/store/auth_store"

export const protectedLoader = async () => {
  const token = useAuthStore.getState().accessToken
  if (token) return null

  try {
    const response = await axios.post<{ accessToken: string }>(
      "http://localhost:8080/api/auth/refresh",
      {},
      { withCredentials: true }
    )
    useAuthStore.getState().setAccessToken(response.data.accessToken)
    return null
  } catch {
    useAuthStore.getState().clearAuth()
    return redirect("/login")
  }
}
