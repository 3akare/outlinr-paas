import { createBrowserRouter, Navigate, RouterProvider } from "react-router"
import { protectedLoader } from "./routes/loaders"
import Login from "@/pages/login"
import OAuthCallback from "@/pages/oauthcallback"
import Dashboard from "@/pages/dashboard"
import Deploy from "@/pages/deploy"
import DeploymentStatus from "@/pages/deployment-status"

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/auth/callback", element: <OAuthCallback /> },
  {
    path: "/dashboard",
    element: <Dashboard />,
    loader: protectedLoader,
    HydrateFallback: () => (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400/40 border-t-emerald-400" />
      </div>
    ),
  },
  {
    path: "/deploy",
    element: <Deploy />,
    loader: protectedLoader,
    HydrateFallback: () => (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400/40 border-t-emerald-400" />
      </div>
    ),
  },
  {
    path: "/deployments/:id",
    element: <DeploymentStatus />,
    loader: protectedLoader,
    HydrateFallback: () => (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400/40 border-t-emerald-400" />
      </div>
    ),
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
