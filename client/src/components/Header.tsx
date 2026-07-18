import { useClearAuth } from "@/store/auth_store"
import type { UserProfile } from "@/api/types"
import { api } from "@/api/axios"
import { useNavigate, Link, useLocation } from "react-router"
import { LogOut, Plus, ChevronRight } from "lucide-react"

interface HeaderProps {
  profile: UserProfile | null
}

export default function Header({ profile }: HeaderProps) {
  const clearAuth = useClearAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout")
    } finally {
      clearAuth()
      navigate("/login", { replace: true })
    }
  }

  const isDashboard = location.pathname === "/dashboard"
  const isDeploy = location.pathname === "/deploy"
  const isStatus = location.pathname.startsWith("/deployments/")

  return (
    <header className="sticky top-0 z-50 glass-nav px-4 md:px-8 flex items-center justify-between">
      <div className="mx-auto flex max-w-[1200px] w-full items-center justify-between h-full">
        {/* Brand Logo & Clean Nav */}
        <div className="flex items-center gap-6">
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 transition-opacity"
          >
            <span className="text-base font-semibold tracking-tight text-[#fafafa]">
              Outlinr
            </span>
          </Link>

          {/* Clean breadcrumb indicator */}
          <nav className="hidden sm:flex items-center gap-2 text-xs text-[#888888] border-l border-[#2e2e2e] pl-6">
            <Link
              to="/dashboard"
              className={`hover:text-[#fafafa] transition-colors ${
                isDashboard ? "text-[#fafafa] font-semibold" : ""
              }`}
            >
              Applications
            </Link>
            {isDeploy && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-[#454545]" />
                <span className="text-[#fafafa] font-semibold">New Deployment</span>
              </>
            )}
            {isStatus && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-[#454545]" />
                <span className="text-[#fafafa] font-semibold">Deployment Status</span>
              </>
            )}
          </nav>
        </div>

        {/* Action Controls & User Account */}
        <div className="flex items-center gap-4">
          {!isDeploy && (
            <Link
              to="/dashboard?tab=repos"
              className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5 focus-ring"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Deploy App</span>
            </Link>
          )}

          {profile && (
            <div className="flex items-center gap-3 border-l border-[#2e2e2e] pl-4">
              <div className="flex items-center gap-2">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt="avatar"
                    className="h-6 w-6 rounded-full border border-[#2e2e2e]"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-[#111111] text-[#fafafa] border border-[#2e2e2e] flex items-center justify-center text-xs font-semibold">
                    {(profile.name || profile.email)?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
                <span className="hidden md:inline text-xs text-[#888888] font-medium max-w-[140px] truncate">
                  {profile.name ?? profile.email}
                </span>
              </div>

              <button
                onClick={handleLogout}
                title="Sign Out"
                className="text-xs text-[#666666] hover:text-[#fafafa] transition-colors flex items-center gap-1 ml-1"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
