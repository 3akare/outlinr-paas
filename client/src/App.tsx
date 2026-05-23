import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router"
import { protectedLoader } from "./routes/loaders"
import { OAuthCallback } from "./pages/OAuthCallback"
import Dashboard from "./pages/Dashboard"

const apiUrl = import.meta.env.VITE_API_URL

const Login = () => (
  <div>
    <h2>Login Page</h2>
    <a href={`${apiUrl}/oauth2/authorization/github`}>Login with GitHub</a>
  </div>
)

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
