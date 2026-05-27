import { useEffect, useState, useRef } from "react"
import { useNavigate, useLocation } from "react-router"
import { api } from "@/api/axios"
import type { Repo } from "@/api/types"
import { toast } from "sonner"

export default function Deploy() {
  const navigate = useNavigate()
  const location = useLocation()
  const repo = location.state?.repo as Repo | undefined
  const initialized = useRef(false)

  const [name, setName] = useState("")
  const [branch, setBranch] = useState(repo?.default_branch ?? "main")
  const [appPort, setAppPort] = useState<number>(8080)
  const [environmentVars, setEnvironmentVars] = useState<
    { key: string; value: string }[]
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
        const res = await api.get(`/apps/validate-repo?repoFullName=${encodeURIComponent(repo.full_name)}`)
        const data = res.data?.data
        if (data?.hasDockerFile) {
          setRepoValid(true)
        } else {
          setRepoValid(false)
          toast.error("Repository validation failed. Ensure it has a Dockerfile.")
        }
      } catch (err: any) {
        setRepoValid(false)
        const msg = err.response?.data?.message ?? "Failed to validate repository"
        toast.error(msg)
      } finally {
        setIsValidatingRepo(false)
      }
    }

    validateRepo()
  }, [repo, navigate])

  useEffect(() => {
    if (!name) {
      setNameAvailable(null)
      return
    }

    setIsCheckingName(true)
    const controller = new AbortController()

    const timeoutId = setTimeout(async () => {
      try {
        const res = await api.get(`/apps/check-name?name=${encodeURIComponent(name)}`, {
          signal: controller.signal
        })
        const data = res.data?.data
        setNameAvailable(data?.available ?? false)
        if (data?.available === false) {
          toast.error("App name is already taken")
        }
      } catch (err: any) {
        if (err.name !== "CanceledError" && err.name !== "AbortError") {
          setNameAvailable(null)
        }
      } finally {
        setIsCheckingName(false)
      }
    }, 500)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [name])

  const handleAddEnv = () => {
    setEnvironmentVars([...environmentVars, { key: "", value: "" }])
  }

  const handleEnvChange = (index: number, field: "key" | "value", val: string) => {
    const newVars = [...environmentVars]
    newVars[index][field] = val
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
        name,
        repoFullName: repo?.full_name,
        branch,
        appPort,
        environmentVars: environmentVars.filter((v) => v.key && v.value)
      }
      const res = await api.post("/apps/deploy", payload)
      const deploymentId = res.data?.data
      if (deploymentId) {
        toast.success("Deployment triggered successfully")
        navigate(`/deployments/${deploymentId}`)
      } else {
        toast.error("Failed to retrieve deployment ID")
      }
    } catch (err: any) {
      const msg = err.response?.data?.message ?? "Failed to trigger deployment"
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!repo) return null

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white py-10 px-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-emerald-400 hover:text-emerald-300 mb-6 flex items-center gap-2"
        >
          &larr; Back to Dashboard
        </button>
        <h1 className="text-2xl font-light mb-2">Deploy Application</h1>
        <p className="text-white/40 mb-8 text-sm">
          Configure deployment settings for {repo.full_name}
        </p>

        {isValidatingRepo ? (
          <div className="flex items-center gap-3 text-white/40 mb-8 p-4 rounded-xl border border-white/6 bg-white/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400/40 border-t-emerald-400" />
            <span className="text-sm">Validating repository (checking for Dockerfile)...</span>
          </div>
        ) : repoValid === false ? (
          <div className="mb-8 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-sm text-red-400">
            This repository cannot be deployed. Ensure it contains a valid Dockerfile in the root.
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm text-white/80">App Name</label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="my-awesome-app"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                required
              />
              {isCheckingName && (
                <div className="absolute right-3 top-3">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400/40 border-t-emerald-400" />
                </div>
              )}
              {name && !isCheckingName && nameAvailable === true && (
                <div className="absolute right-3 top-3 text-emerald-400 text-xs">Available</div>
              )}
              {name && !isCheckingName && nameAvailable === false && (
                <div className="absolute right-3 top-3 text-red-400 text-xs">Taken</div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-white/80">Branch</label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-white/80">App Port</label>
            <input
              type="number"
              value={appPort}
              onChange={(e) => setAppPort(parseInt(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm text-white/80">Environment Variables</label>
              <button
                type="button"
                onClick={handleAddEnv}
                className="text-xs text-emerald-400 hover:text-emerald-300"
              >
                + Add Variable
              </button>
            </div>
            {environmentVars.map((env, i) => (
              <div key={i} className="flex gap-3 items-center">
                <input
                  type="text"
                  placeholder="KEY"
                  value={env.key}
                  onChange={(e) => handleEnvChange(i, "key", e.target.value.toUpperCase())}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={env.value}
                  onChange={(e) => handleEnvChange(i, "value", e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveEnv(i)}
                  className="text-white/40 hover:text-red-400"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={!nameAvailable || !repoValid || isSubmitting || isCheckingName || isValidatingRepo}
            className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors mt-8"
          >
            {isSubmitting ? "Deploying..." : "Deploy Application"}
          </button>
        </form>
      </div>
      
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-60 -right-60 h-125 w-125 rounded-full bg-emerald-500/4 blur-3xl" />
        <div className="absolute -bottom-60 -left-60 h-125 w-125 rounded-full bg-emerald-500/2 blur-3xl" />
      </div>
    </div>
  )
}
