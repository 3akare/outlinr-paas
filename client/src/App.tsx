import { createBrowserRouter, Navigate, RouterProvider, useNavigate } from "react-router"
import { protectedLoader } from "./routes/loaders"
import { OAuthCallback } from "./pages/OAuthCallback"
import { useClearAuth } from "@/store/auth_store"
import { api } from "@/api/axios"

const Login = () => (
  <div>
    <h2>Login Page</h2>
    <a href="http://localhost:8080/oauth2/authorization/github">
      Login with GitHub
    </a>
  </div>
)

const Dashboard = () => {
  const clearAuth = useClearAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (e) {
      // Ignore network errors
    } finally {
      clearAuth()
      navigate('/login', { replace: true })
    }
  }

  return (
    <div>
      <h2>Dashboard (Protected Area)</h2>
      <button onClick={handleLogout}>Logout</button>
    </div>
  )
}

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/auth/callback", element: <OAuthCallback /> },
  {
    path: "/dashboard",
    element: <Dashboard />,
    loader: protectedLoader,
    HydrateFallback: () => <div>Loading dashboard...</div>,
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
