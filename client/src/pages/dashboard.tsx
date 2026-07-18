import { useEffect, useRef, useState, useMemo } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { api } from "@/api/axios"
import type { UserProfile, Repo, Deployment } from "@/api/types"
import Header from "@/components/Header"
import { GithubIcon } from "@/components/GithubIcon"
import {
  Search,
  ExternalLink,
  Plus,
  AlertCircle,
  Loader2,
  XCircle,
  GitBranch,
  Terminal
} from "lucide-react"

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
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const [deploymentsLoading, setDeploymentsLoading] = useState(false)
  const [reposLoading, setReposLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initialTab = searchParams.get("tab") === "repos" ? "repos" : "deployments"
  const [activeTab, setActiveTab] = useState<"deployments" | "repos">(initialTab)
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

  // Auto-polling active/building deployments
  useEffect(() => {
    const hasActiveBuilds = deployments.some(
      (d) =>
        d.status === "STARTED" ||
        d.status === "QUEUED" ||
        d.status === "BUILDING" ||
        d.status === "STARTING"
    )
    if (!hasActiveBuilds) return

    const interval = setInterval(fetchDeployments, 3500)
    return () => clearInterval(interval)
  }, [deployments])

  const filteredDeployments = useMemo(() => {
    return deployments.filter((d) => {
      return (
        !search.trim() ||
        d.appName.toLowerCase().includes(search.toLowerCase()) ||
        d.repoFullName.toLowerCase().includes(search.toLowerCase())
      )
    })
  }, [deployments, search])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--color-text-secondary)] text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent-blue)]" />
          <span>Loading Outlinr...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex flex-col selection:bg-[var(--color-accent-blue)]/20">
      <Header profile={profile} />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 md:px-8 py-10 space-y-8">
        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-lg bg-[rgba(242,19,97,0.1)] border border-[rgba(242,19,97,0.2)] flex items-center justify-between text-sm text-[var(--color-status-error-text)]">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs font-medium hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Page Title & Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[var(--color-border-subtle)]">
          <div>
            <h1 className="text-3xl font-bold tracking-[-0.72px] text-[var(--color-text-primary)]">
              Applications
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Manage and deploy your web applications with Outlinr.
            </p>
          </div>

          <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] pb-1 sm:pb-0 sm:border-none">
            <button
              onClick={() => {
                setActiveTab("deployments")
                setSearchParams({})
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "deployments"
                  ? "text-[var(--color-text-primary)] border-b-2 border-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              All Applications ({deployments.length})
            </button>

            <button
              onClick={() => {
                setActiveTab("repos")
                setSearchParams({ tab: "repos" })
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "repos"
                  ? "text-[var(--color-text-primary)] border-b-2 border-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              Deploy New App
            </button>
          </div>
        </div>

        {/* Search Input & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-secondary)]" />
            <input
              type="text"
              placeholder={
                activeTab === "deployments"
                  ? "Search applications..."
                  : "Search GitHub repositories..."
              }
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] rounded-md pl-10 pr-4 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus-ring transition-colors"
            />
          </div>

          {activeTab === "repos" && profile?.hasGithubInstallation && (
            <a
              href={`https://github.com/apps/${import.meta.env.VITE_GITHUB_APP_NAME}/installations/new`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary py-2 px-4 text-xs shrink-0 inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <GithubIcon className="h-3.5 w-3.5" />
              <span>Adjust GitHub Access</span>
            </a>
          )}
        </div>

        {/* Tab 1: Deployed Apps Grid */}
        {activeTab === "deployments" && (
          <div>
            {deploymentsLoading && deployments.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-[var(--color-text-secondary)]">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--color-accent-blue)] mr-3" />
                <span className="text-sm">Loading applications...</span>
              </div>
            ) : filteredDeployments.length === 0 ? (
              <div className="p-12 outlinr-card text-center max-w-lg mx-auto my-8 space-y-4">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {search ? `No apps matching "${search}"` : "No applications deployed yet"}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  Select a repository to deploy your web application.
                </p>
                <button
                  onClick={() => {
                    setActiveTab("repos")
                    setSearchParams({ tab: "repos" })
                  }}
                  className="btn-primary text-xs inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Deploy your first app</span>
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-5">
                {filteredDeployments.map((d) => {
                  const isActive = d.status === "ACTIVE"
                  const isBuilding =
                    d.status === "STARTED" ||
                    d.status === "QUEUED" ||
                    d.status === "BUILDING" ||
                    d.status === "STARTING"
                  const isFailed = d.status === "FAILED"

                  return (
                    <div
                      key={d.id}
                      className="outlinr-card flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        {/* Title & Status Tag */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            {isActive ? (
                              <a
                                href={`http://${d.appName}.localhost`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-base font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-accent-blue)] transition-colors flex items-center gap-1.5 truncate"
                              >
                                <span>{d.appName}</span>
                                <ExternalLink className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
                              </a>
                            ) : (
                              <span className="text-base font-semibold text-[var(--color-text-primary)] truncate block">
                                {d.appName}
                              </span>
                            )}
                            <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] truncate">
                              <GithubIcon className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-tertiary)]" />
                              <span className="truncate">{d.repoFullName}</span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <span
                            className={`badge-pill shrink-0 ${
                              isActive
                                ? "bg-[rgba(23,201,100,0.1)] text-[var(--color-status-success-text)]"
                                : isBuilding
                                ? "bg-[rgba(245,166,35,0.15)] text-[var(--color-status-warning-text)]"
                                : isFailed
                                ? "bg-[rgba(242,19,97,0.1)] text-[var(--color-status-error-text)]"
                                : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]"
                            }`}
                          >
                            {isActive && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-status-success)]" />
                            )}
                            {isBuilding && (
                              <Loader2 className="h-3 w-3 animate-spin text-[var(--color-status-warning)]" />
                            )}
                            {isFailed && <XCircle className="h-3 w-3 text-[var(--color-status-error)]" />}
                            <span>{d.status}</span>
                          </span>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)]">
                          <div>
                            <span className="text-[11px] text-[var(--color-text-tertiary)] block">
                              Branch
                            </span>
                            <span className="text-[var(--color-text-primary)] font-medium">
                              {d.branch}
                            </span>
                          </div>

                          <div>
                            <span className="text-[11px] text-[var(--color-text-tertiary)] block">
                              Deployed
                            </span>
                            <span className="text-[var(--color-text-primary)] font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                              {formatRelativeTime(d.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Error snippet if failed */}
                        {isFailed && d.errorMessage && (
                          <div className="p-3 rounded-md bg-[rgba(242,19,97,0.06)] border border-[rgba(242,19,97,0.2)] text-xs text-[var(--color-status-error-text)] font-mono leading-relaxed overflow-x-auto max-h-20">
                            {d.errorMessage}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="pt-4 border-t border-[var(--color-border-subtle)] mt-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/deployments/${d.id}`)}
                            className="text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:underline flex items-center gap-1.5 transition-colors"
                          >
                            <Terminal className="h-3.5 w-3.5" />
                            <span>View Logs</span>
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to delete ${d.appName}? This will remove all associated resources and cannot be undone.`)) {
                                try {
                                  await api.delete(`/apps/${d.id}`)
                                  setDeployments(prev => prev.filter(dep => dep.id !== d.id))
                                } catch (err) {
                                  console.error("Failed to delete deployment", err)
                                  alert("Failed to delete deployment")
                                }
                              }
                            }}
                            className="text-xs font-medium text-[var(--color-status-error)] hover:text-[var(--color-status-error-text)] hover:underline flex items-center gap-1.5 transition-colors ml-3"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>

                        {isActive && (
                          <a
                            href={`http://${d.appName}.localhost`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-ghost text-xs py-1 px-3 inline-flex items-center gap-1.5"
                          >
                            <span>Launch App</span>
                            <ExternalLink className="h-3 w-3" />
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

        {/* Tab 2: Repositories (Deploy New App) */}
        {activeTab === "repos" && (
          <div className="space-y-6">
            {!profile?.hasGithubInstallation ? (
              <div className="p-10 outlinr-card text-center max-w-lg mx-auto space-y-4">
                <div className="h-12 w-12 rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] flex items-center justify-center mx-auto">
                  <GithubIcon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  Connect GitHub Repositories
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  Install Outlinr GitHub app to select and deploy your applications.
                </p>
                <a
                  href={`https://github.com/apps/${import.meta.env.VITE_GITHUB_APP_NAME}/installations/new`}
                  className="btn-primary text-xs inline-flex items-center gap-2"
                >
                  <GithubIcon className="h-4 w-4" />
                  <span>Connect GitHub</span>
                </a>
              </div>
            ) : reposLoading && repos.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-[var(--color-text-secondary)]">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--color-accent-blue)] mr-3" />
                <span className="text-sm">Fetching repositories from GitHub...</span>
              </div>
            ) : filteredRepos.length === 0 ? (
              <div className="p-10 outlinr-card text-center max-w-lg mx-auto space-y-2">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {search ? `No repositories match "${search}"` : "No repositories found."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3">
                  {paginatedRepos.map((r) => (
                    <div
                      key={r.id}
                      className="outlinr-card p-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-10 w-10 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] flex items-center justify-center shrink-0 text-[var(--color-text-primary)]">
                          <GithubIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                            {r.full_name}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                            <span className="flex items-center gap-1">
                              <GitBranch className="h-3 w-3" />
                              {r.default_branch}
                            </span>
                            <span>·</span>
                            <span>{r.private ? "Private" : "Public"}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate("/deploy", { state: { repo: r } })}
                        className="btn-primary text-xs shrink-0 inline-flex items-center gap-1.5"
                      >
                        <span>Deploy</span>
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {hasMoreRepos && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      className="btn-ghost text-xs"
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
    </div>
  )
}
