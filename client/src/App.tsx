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
      <div>Loading...</div>
    ),
  },
  {
    path: "/deploy",
    element: <Deploy />,
    loader: protectedLoader,
    HydrateFallback: () => (
      <div>Loading...</div>
    ),
  },
  {
    path: "/deployments/:id",
    element: <DeploymentStatus />,
    loader: protectedLoader,
    HydrateFallback: () => (
      <div>Loading...</div>
    ),
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
