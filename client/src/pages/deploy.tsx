import { useEffect, useState, useRef } from "react"
import { useNavigate, useLocation, Link } from "react-router"
import { api } from "@/api/axios"
import type { Repo } from "@/api/types"
import { toast } from "sonner"
import Header from "@/components/Header"
import { GithubIcon } from "@/components/GithubIcon"
import {
  ArrowLeft,
  GitBranch,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Sliders
} from "lucide-react"

export default function Deploy() {
  const navigate = useNavigate()
  const location = useLocation()
  const repo = location.state?.repo as Repo | undefined
  const initialized = useRef(false)

  const [name, setName] = useState("")
  const [branch, setBranch] = useState(repo?.default_branch ?? "main")
  const [appPort, setAppPort] = useState<number>(80)
  const [environmentVars, setEnvironmentVars] = useState<
    { key: string; value: string; showValue?: boolean }[]
  >([])

  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null)
  const [isCheckingName, setIsCheckingName] = useState(false)
  const [repoValid, setRepoValid] = useState<boolean | null>(null)
  const [isValidatingRepo, setIsValidatingRepo] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!repo) {
      navigate("/dashboard", { replace: true })
      return
    }

    if (initialized.current) return
    initialized.current = true

    const validateRepo = async () => {
      try {
        const res = await api.get(
          `/apps/validate-repo?repoFullName=${encodeURIComponent(repo.full_name)}`
        )
        const data = res.data?.data
        if (data?.hasDockerFile) {
          setRepoValid(true)
        } else {
          setRepoValid(false)
          toast.error("Repository validation failed.")
        }
      } catch (err: unknown) {
        setRepoValid(false)
        const axiosErr = err as { response?: { data?: { message?: string } } }
        const msg =
          axiosErr.response?.data?.message ?? "Failed to validate repository"
        toast.error(msg)
      } finally {
        setIsValidatingRepo(false)
      }
    }

    validateRepo()
  }, [repo, navigate])

  // Real-time app name availability check
  useEffect(() => {
    if (!name.trim()) {
      return
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsCheckingName(true)
    const controller = new AbortController()

    const timeoutId = setTimeout(async () => {
      try {
        const res = await api.get(
          `/apps/check-name?name=${encodeURIComponent(name.trim())}`,
          {
            signal: controller.signal,
          }
        )
        const data = res.data?.data
        setNameAvailable(data?.available ?? false)
        if (data?.available === false) {
          toast.error("App name is already taken")
        }
      } catch (err: unknown) {
        const axiosErr = err as { name?: string }
        if (axiosErr.name !== "CanceledError" && axiosErr.name !== "AbortError") {
          setNameAvailable(null)
        }
      } finally {
        setIsCheckingName(false)
      }
    }, 450)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [name])

  const handleAddEnv = () => {
    setEnvironmentVars([
      ...environmentVars,
      { key: "", value: "", showValue: true },
    ])
  }

  const handleEnvChange = (
    index: number,
    field: "key" | "value",
    val: string
  ) => {
    const newVars = [...environmentVars]
    newVars[index][field] = val
    setEnvironmentVars(newVars)
  }

  const toggleShowValue = (index: number) => {
    const newVars = [...environmentVars]
    newVars[index].showValue = !newVars[index].showValue
    setEnvironmentVars(newVars)
  }

  const handleRemoveEnv = (index: number) => {
    const newVars = [...environmentVars]
    newVars.splice(index, 1)
    setEnvironmentVars(newVars)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !nameAvailable || !repoValid) return

    setIsSubmitting(true)
    try {
      const payload = {
        name: name.trim().toLowerCase(),
        repoFullName: repo?.full_name,
        branch: branch.trim(),
        appPort,
        environmentVars: environmentVars
          .filter((v) => v.key.trim() && v.value.trim())
          .map((v) => ({ key: v.key.trim(), value: v.value.trim() })),
      }
      const res = await api.post("/apps/deploy", payload)
      const deploymentId = res.data?.data
      if (deploymentId) {
        toast.success("Deployment started")
        navigate(`/deployments/${deploymentId}`)
      } else {
        toast.error("Failed to start deployment")
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      const msg = axiosErr.response?.data?.message ?? "Failed to start deployment"
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!repo) return null

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex flex-col selection:bg-[var(--color-accent-blue)]/20">
      <Header profile={null} />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 md:px-8 py-10 space-y-8">
        {/* Back navigation */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Applications</span>
        </Link>

        {/* Deploy Title */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-[-0.72px] text-[var(--color-text-primary)]">
            Deploy Application
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Configure deployment settings for <span className="font-semibold text-[var(--color-text-primary)]">{repo.full_name}</span>.
          </p>
        </div>

        {/* Selected Repository Summary Card */}
        <div className="outlinr-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] flex items-center justify-center text-[var(--color-text-primary)]">
                <GithubIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{repo.full_name}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Default branch: {repo.default_branch}</p>
              </div>
            </div>

            {/* Repository Status Badge */}
            <div>
              {isValidatingRepo ? (
                <span className="badge-pill bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]">
                  <Loader2 className="h-3 w-3 animate-spin text-[var(--color-accent-blue)]" />
                  <span>Validating repository...</span>
                </span>
              ) : repoValid ? (
                <span className="badge-pill bg-[rgba(23,201,100,0.1)] text-[var(--color-status-success-text)]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Verified</span>
                </span>
              ) : (
                <span className="badge-pill bg-[rgba(242,19,97,0.1)] text-[var(--color-status-error-text)]">
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Validation Failed</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Deployment Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="outlinr-card p-6 space-y-6">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] border-b border-[var(--color-border-subtle)] pb-4">
              Application Configuration
            </h2>

            {/* App Name Input */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--color-text-primary)] block">
                App Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const newVal = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                    setName(newVal)
                    if (!newVal) setNameAvailable(null)
                  }}
                  placeholder="my-app"
                  className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] rounded-md px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] focus-ring transition-colors pr-24"
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-xs">
                  {isCheckingName && (
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent-blue)]" />
                  )}
                  {name && !isCheckingName && nameAvailable === true && (
                    <span className="text-[var(--color-status-success-text)] font-medium text-xs flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Available
                    </span>
                  )}
                  {name && !isCheckingName && nameAvailable === false && (
                    <span className="text-[var(--color-status-error-text)] font-medium text-xs flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5" /> Taken
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Branch and Port Configuration */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <GitBranch className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
                  <span>Branch</span>
                </label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] rounded-md px-3.5 py-2 text-sm text-[var(--color-text-primary)] focus-ring"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
                  <span>Port</span>
                </label>
                <input
                  type="number"
                  value={appPort}
                  onChange={(e) => setAppPort(parseInt(e.target.value) || 8080)}
                  className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] rounded-md px-3.5 py-2 text-sm text-[var(--color-text-primary)] focus-ring"
                  required
                />
              </div>
            </div>
          </div>

          {/* Environment Variables Section */}
          <div className="outlinr-card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
              <div>
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                  Environment Variables
                </h2>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Optional key-value configuration variables.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddEnv}
                className="btn-ghost text-xs py-1 px-3 flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Variable</span>
              </button>
            </div>

            {environmentVars.length === 0 ? (
              <p className="text-xs text-[var(--color-text-secondary)] italic">No environment variables added.</p>
            ) : (
              <div className="space-y-3">
                {environmentVars.map((env, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="KEY"
                      value={env.key}
                      onChange={(e) =>
                        handleEnvChange(i, "key", e.target.value.toUpperCase())
                      }
                      className="flex-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] rounded-md px-3 py-2 text-xs font-mono text-[var(--color-text-primary)] focus-ring"
                    />
                    <div className="flex-1 relative">
                      <input
                        type={env.showValue ? "text" : "password"}
                        placeholder="Value"
                        value={env.value}
                        onChange={(e) => handleEnvChange(i, "value", e.target.value)}
                        className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] rounded-md px-3 py-2 text-xs font-mono text-[var(--color-text-primary)] focus-ring pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowValue(i)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      >
                        {env.showValue ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveEnv(i)}
                      className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-status-error)] transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={
              !name ||
              !nameAvailable ||
              !repoValid ||
              isSubmitting ||
              isCheckingName ||
              isValidatingRepo
            }
            className="w-full btn-primary py-3 text-sm font-medium flex items-center justify-center gap-2 focus-ring disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-black" />
                <span>Deploying Application...</span>
              </>
            ) : (
              <span>Deploy Application</span>
            )}
          </button>
        </form>
      </main>
    </div>
  )
}
