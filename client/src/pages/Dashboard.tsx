import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { useClearAuth } from "@/store/auth_store"
import { api } from "@/api/axios"
import type { UserProfile, Repo } from "@/api/types"

export default function Dashboard() {
  const clearAuth = useClearAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const [reposLoading, setReposLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const params = new URLSearchParams(window.location.search)
    const installationId = params.get("installation_id")

    const bootstrap = async () => {
      try {
        if (installationId) {
          await api.post(
            `/github/installation/save?installation_id=${installationId}`
          )
          window.history.replaceState({}, "", "/dashboard")
        }

        const profileRes = await api.get<{ data: UserProfile }>("/user/profile")
        const userProfile =
          profileRes.data.data ?? (profileRes.data as unknown as UserProfile)
        setProfile(userProfile)

        if (userProfile.hasGithubInstallation) {
          setReposLoading(true)
          const reposRes = await api.get<{ data: Repo[] }>(
            "/github/repository/list"
          )
          const data =
            reposRes.data.data ?? (reposRes.data as unknown as Repo[])
          setRepos(Array.isArray(data) ? data : [])
        }
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { message?: string } } }
        setError(axiosErr?.response?.data?.message ?? "Something went wrong")
      } finally {
        setLoading(false)
        setReposLoading(false)
      }
    }

    bootstrap()
  }, [])

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout")
    } finally {
      clearAuth()
      navigate("/login", { replace: true })
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="flex items-center gap-3 text-white/40">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400/40 border-t-emerald-400" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/6 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/20">
              <div className="h-2 w-2 rounded-sm bg-emerald-400" />
            </div>
            <span className="text-sm font-semibold tracking-wide">Outlinr</span>
          </div>
          <div className="flex items-center gap-4">
            {profile && (
              <span className="text-sm text-white/40">
                {profile.name ?? profile.email}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-white/40 transition-colors hover:text-white/80"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="mb-8">
          <h1 className="mb-1 text-2xl font-light tracking-tight text-white">
            Repositories
          </h1>
          <p className="text-sm text-white/40">Select a repository to deploy</p>
        </div>

        {!profile?.hasGithubInstallation && (
          <div className="rounded-2xl border border-white/8 bg-white/2 p-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/8 bg-white/4">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-white/40"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
            </div>
            <p className="mb-1 text-sm text-white/60">
              No GitHub App installed
            </p>
            <p className="mb-6 text-xs text-white/30">
              Install the Outlinr GitHub App to connect your repositories
            </p>
            <a
              href={`https://github.com/apps/${import.meta.env.VITE_GITHUB_APP_NAME}/installations/new`}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
            >
              Install GitHub App
            </a>
          </div>
        )}

        {profile?.hasGithubInstallation && reposLoading && (
          <div className="flex items-center gap-3 py-8 text-white/40">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400/40 border-t-emerald-400" />
            <span className="text-sm">Loading repositories...</span>
          </div>
        )}

        {profile?.hasGithubInstallation &&
          !reposLoading &&
          repos.length === 0 && (
            <div className="rounded-2xl border border-white/8 bg-white/2 p-10 text-center">
              <p className="text-sm text-white/40">
                No repositories found for this installation.
              </p>
            </div>
          )}

        {profile?.hasGithubInstallation &&
          !reposLoading &&
          repos.length > 0 && (
            <div className="grid gap-2">
              {repos.map((repo) => (
                <div
                  key={repo.id}
                  className="group flex items-center justify-between rounded-xl border border-white/6 bg-white/2 px-5 py-4 transition-all duration-150 hover:border-white/12 hover:bg-white/4"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-white/4">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="text-white/40"
                      >
                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white/90">
                        {repo.full_name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-xs text-white/30">
                          {repo.default_branch}
                        </span>
                        <span className="text-white/10">·</span>
                        <span
                          className={`text-xs ${repo.private ? "text-amber-400/60" : "text-emerald-400/60"}`}
                        >
                          {repo.private ? "Private" : "Public"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/deploy", { state: { repo } })}
                    className="ml-4 shrink-0 rounded-lg border border-white/6 px-3 py-1.5 text-xs font-medium text-white/40 transition-all duration-150 group-hover:border-white/15 group-hover:text-white/80"
                  >
                    Deploy
                  </button>
                </div>
              ))}
            </div>
          )}
      </main>

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-60 -right-60 h-125 w-125 rounded-full bg-emerald-500/4 blur-3xl" />
        <div className="absolute -bottom-60 -left-60 h-125 w-125 rounded-full bg-emerald-500/2 blur-3xl" />
      </div>
    </div>
  )
}
