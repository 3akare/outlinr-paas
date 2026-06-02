import { useEffect, useRef, useState, useMemo } from "react"
import { useNavigate } from "react-router"
import { useClearAuth } from "@/store/auth_store"
import { api } from "@/api/axios"
import type { UserProfile, Repo, Deployment } from "@/api/types"

function formatRelativeTime(dateString: string) {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMs < 0) return "Just now"
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  } catch {
    return "Recently"
  }
}

export default function Dashboard() {
  const clearAuth = useClearAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const [deploymentsLoading, setDeploymentsLoading] = useState(false)
  const [reposLoading, setReposLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<"deployments" | "repos">("deployments")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const itemsPerPage = 8

  const initialized = useRef(false)

  const fetchDeployments = async () => {
    try {
      const res = await api.get<{ data: Deployment[] }>("/apps")
      const data = res.data.data ?? (res.data as unknown as Deployment[])
      setDeployments(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Failed to fetch deployments", err)
    }
  }

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

        setDeploymentsLoading(true)
        await fetchDeployments()

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
        setDeploymentsLoading(false)
        setReposLoading(false)
      }
    }

    bootstrap()
  }, [])

  // Auto-polling deployments when there are active/building ones
  useEffect(() => {
    const hasActiveBuilds = deployments.some(
      (d) =>
        d.status === "STARTED" ||
        d.status === "BUILDING" ||
        d.status === "STARTING"
    )
    if (!hasActiveBuilds) return

    const interval = setInterval(fetchDeployments, 4000)
    return () => clearInterval(interval)
  }, [deployments])

  // Reset page to 1 on search change to avoid empty pages
  useEffect(() => {
    setPage(1)
  }, [search])

  const filteredRepos = useMemo(() => {
    if (!search.trim()) return repos
    const s = search.toLowerCase()
    return repos.filter(
      (r) =>
        r.full_name?.toLowerCase().includes(s) ||
        (r.description && r.description.toLowerCase().includes(s))
    )
  }, [repos, search])

  const paginatedRepos = useMemo(() => {
    return filteredRepos.slice(0, page * itemsPerPage)
  }, [filteredRepos, page])

  const hasMoreRepos = filteredRepos.length > paginatedRepos.length

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
          <span className="text-sm">Loading Outlinr...</span>
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
              <div className="flex items-center gap-2">
                {profile.avatarUrl && (
                  <img
                    src={profile.avatarUrl}
                    alt="avatar"
                    className="h-6 w-6 rounded-full border border-white/10"
                  />
                )}
                <span className="text-sm text-white/50">
                  {profile.name ?? profile.email}
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-white/40 transition-colors hover:text-white/85"
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

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mb-1 text-2xl font-light tracking-tight text-white">
              PaaS Dashboard
            </h1>
            <p className="text-sm text-white/40">
              Manage your deployments and applications locally
            </p>
          </div>
          <div className="flex items-center gap-2">
            {profile?.hasGithubInstallation && (
              <a
                href={`https://github.com/apps/${import.meta.env.VITE_GITHUB_APP_NAME}/installations/new`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/3 px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/8"
              >
                Configure GitHub Access
              </a>
            )}
          </div>
        </div>

        {/* Tab Controls */}
        <div className="mb-8 border-b border-white/6 flex items-center gap-6">
          <button
            onClick={() => setActiveTab("deployments")}
            className={`pb-3 text-sm font-medium transition-all relative ${
              activeTab === "deployments"
                ? "text-emerald-400"
                : "text-white/40 hover:text-white/80"
            }`}
          >
            Deployments
            {deployments.length > 0 && (
              <span className="ml-1.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-400 font-semibold">
                {deployments.length}
              </span>
            )}
            {activeTab === "deployments" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("repos")}
            className={`pb-3 text-sm font-medium transition-all relative ${
              activeTab === "repos"
                ? "text-emerald-400"
                : "text-white/40 hover:text-white/80"
            }`}
          >
            Deploy New Service
            {activeTab === "repos" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
            )}
          </button>
        </div>

        {/* Tab Content: Deployments */}
        {activeTab === "deployments" && (
          <div>
            {deploymentsLoading && deployments.length === 0 ? (
              <div className="flex items-center gap-3 py-10 text-white/40">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400/40 border-t-emerald-400" />
                <span className="text-sm">Loading active deployments...</span>
              </div>
            ) : deployments.length === 0 ? (
              <div className="rounded-2xl border border-white/6 bg-white/2 p-12 text-center max-w-lg mx-auto mt-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <h3 className="mb-1 text-base font-medium text-white/90">
                  No services deployed
                </h3>
                <p className="mb-6 text-xs text-white/40 leading-relaxed">
                  Connect your GitHub repositories, configure environment variables, and launch your containerized services instantly on port 80.
                </p>
                <button
                  onClick={() => setActiveTab("repos")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-semibold text-gray-950 transition-all hover:bg-emerald-300 active:scale-[0.98]"
                >
                  Deploy your first app
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {deployments.map((deployment) => {
                  const isActive = deployment.status === "ACTIVE"
                  const isBuilding =
                    deployment.status === "STARTED" ||
                    deployment.status === "BUILDING" ||
                    deployment.status === "STARTING"
                  const isFailed = deployment.status === "FAILED"

                  return (
                    <div
                      key={deployment.id}
                      className="group flex flex-col justify-between rounded-2xl border border-white/6 bg-white/2 p-5 transition-all duration-200 hover:border-white/12 hover:bg-white/4"
                    >
                      <div>
                        {/* Title and Badge */}
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            {isActive ? (
                              <a
                                href={`http://${deployment.appName}.localhost`}
                                target="_blank"
                                rel="noreferrer"
                                className="truncate text-base font-medium text-white hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
                              >
                                {deployment.appName}
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  className="text-white/20 group-hover:text-emerald-400/60"
                                >
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6m4-3h6v6m-11 5L21 3" />
                                </svg>
                              </a>
                            ) : (
                              <span className="truncate text-base font-medium text-white/90">
                                {deployment.appName}
                              </span>
                            )}
                            <p className="mt-0.5 text-xs text-white/30 truncate">
                              {deployment.repoFullName}
                            </p>
                          </div>

                          {/* Dynamic Status Badge */}
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                              isActive
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : isBuilding
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isActive
                                  ? "bg-emerald-400 animate-pulse"
                                  : isBuilding
                                  ? "bg-amber-400 animate-spin border border-t-transparent rounded-full border-amber-400/40"
                                  : "bg-rose-400"
                              }`}
                            />
                            {deployment.status}
                          </span>
                        </div>

                        {/* Metadata grid */}
                        <div className="mt-4 grid grid-cols-2 gap-y-2 text-xs text-white/40">
                          <div>
                            <span className="text-[10px] text-white/20 block uppercase tracking-wider">
                              Branch / Port
                            </span>
                            <span className="text-white/70 font-medium">
                              {deployment.branch} · {deployment.appPort}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-white/20 block uppercase tracking-wider">
                              Deployed
                            </span>
                            <span className="text-white/70 font-medium">
                              {formatRelativeTime(deployment.createdAt)}
                            </span>
                          </div>
                          {deployment.commitSha && (
                            <div className="col-span-2 mt-1">
                              <span className="text-[10px] text-white/20 block uppercase tracking-wider">
                                Commit hash
                              </span>
                              <code className="text-white/60 font-mono text-[10px]">
                                {deployment.commitSha.substring(0, 7)}
                              </code>
                            </div>
                          )}
                        </div>

                        {/* Failed error preview */}
                        {isFailed && deployment.errorMessage && (
                          <div className="mt-3 rounded-lg border border-red-500/10 bg-red-500/5 p-2.5 text-xs text-red-400/90 leading-relaxed font-mono whitespace-pre-wrap max-h-16 overflow-y-auto">
                            {deployment.errorMessage}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="mt-5 border-t border-white/4 pt-3.5 flex items-center justify-between gap-3">
                        <button
                          onClick={() =>
                            navigate(`/deployments/${deployment.id}`)
                          }
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-white/40 hover:text-white/80 transition-colors"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <rect x="2" y="3" width="20" height="14" rx="2" />
                            <path d="M6 21h12M12 17v4" />
                          </svg>
                          Console Log
                        </button>

                        {isActive && (
                          <a
                            href={`http://${deployment.appName}.localhost`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition-all hover:bg-emerald-500/20 active:scale-[0.97]"
                          >
                            Launch Service
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Repositories (Deploy New Service) */}
        {activeTab === "repos" && (
          <div>
            {!profile?.hasGithubInstallation && (
              <div className="rounded-2xl border border-white/6 bg-white/2 p-10 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/6 bg-white/3 text-white/40">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                  </svg>
                </div>
                <p className="mb-1 text-sm font-medium text-white/70">
                  No GitHub App Installed
                </p>
                <p className="mb-6 text-xs text-white/30 max-w-sm mx-auto leading-relaxed">
                  Install the Outlinr local GitHub App to grant permission to clone, build, and deploy your repositories.
                </p>
                <a
                  href={`https://github.com/apps/${import.meta.env.VITE_GITHUB_APP_NAME}/installations/new`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-semibold text-gray-950 transition-all hover:bg-emerald-300 active:scale-[0.98]"
                >
                  Install GitHub App
                </a>
              </div>
            )}

            {profile?.hasGithubInstallation && reposLoading && (
              <div className="flex items-center gap-3 py-10 text-white/40">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400/40 border-t-emerald-400" />
                <span className="text-sm">Loading GitHub repositories...</span>
              </div>
            )}

            {profile?.hasGithubInstallation &&
              !reposLoading &&
              repos.length === 0 && (
                <div className="rounded-2xl border border-white/6 bg-white/2 p-10 text-center">
                  <p className="text-sm text-white/40">
                    No repositories found in connected GitHub installations.
                  </p>
                </div>
              )}

            {profile?.hasGithubInstallation &&
              !reposLoading &&
              repos.length > 0 && (
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search repositories..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-white/3 border border-white/6 rounded-xl px-4 py-3 pl-10 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                    <svg
                      className="absolute left-3.5 top-3.5 text-white/30"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                  </div>

                  {filteredRepos.length === 0 ? (
                    <div className="rounded-2xl border border-white/6 bg-white/2 p-10 text-center">
                      <p className="text-sm text-white/40">
                        No repositories match "{search}"
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-2.5">
                      {paginatedRepos.map((repo) => (
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
                                  className={`text-xs ${
                                    repo.private
                                      ? "text-amber-400/60"
                                      : "text-emerald-400/60"
                                  }`}
                                >
                                  {repo.private ? "Private" : "Public"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              navigate("/deploy", { state: { repo } })
                            }
                            className="ml-4 shrink-0 rounded-lg border border-white/6 px-3.5 py-1.5 text-xs font-semibold text-white/50 transition-all duration-150 group-hover:border-white/15 group-hover:text-white/90 hover:bg-white/4 active:scale-[0.97]"
                          >
                            Deploy
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {hasMoreRepos && (
                    <div className="flex justify-center pt-4">
                      <button
                        onClick={() => setPage((p) => p + 1)}
                        className="rounded-lg border border-white/8 bg-white/2 px-4 py-2 text-xs font-medium text-white/60 hover:bg-white/4 hover:text-white/80 transition-colors"
                      >
                        Load More Repositories
                      </button>
                    </div>
                  )}
                </div>
              )}
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
