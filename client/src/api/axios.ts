import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios"
import { useAuthStore } from "@/store/auth_store"

const apiUrl = import.meta.env.VITE_API_URL as string

export const api = axios.create({
  baseURL: `${apiUrl}/api`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

interface FailedQueueItem {
  resolve: (token: string | null) => void
  reject: (reason?: unknown) => void
}

let isRefreshing = false
let failedQueue: FailedQueueItem[] = []

const processQueue = (
  error: AxiosError | null,
  token: string | null = null
) => {
  failedQueue.forEach((item) => {
    if (error) item.reject(error)
    else item.resolve(token)
  })
  failedQueue = []
}

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequest

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise<string | null>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const response = await axios.post<{
          success: boolean
          data: { accessToken: string }
        }>(`${apiUrl}/api/auth/refresh`, {}, { withCredentials: true })
        const accessToken = response.data?.data?.accessToken
        if (!accessToken) throw new Error("No access token in refresh response")

        useAuthStore.getState().setAccessToken(accessToken)
        processQueue(null, accessToken)

        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null)
        useAuthStore.getState().clearAuth()
        window.location.href = "/login"
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)
