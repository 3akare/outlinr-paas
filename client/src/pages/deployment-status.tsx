import { useEffect, useState, useRef, useMemo } from "react"
import { useParams, useNavigate, Link } from "react-router"
import { api } from "@/api/axios"
import Header from "@/components/Header"
import {
  Terminal,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Check,
  Search,
  Play,
  Pause
} from "lucide-react"

interface LogEntry {
  timestamp: string
  level: "INFO" | "BUILD" | "SUCCESS" | "WARN" | "ERROR"
  message: string
}

export default function DeploymentStatus() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [status, setStatus] = useState<string>("STARTED")
  const [appName, setAppName] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [logFilter, setLogFilter] = useState("")
  const logContainerRef = useRef<HTMLDivElement>(null)

  // Poll deployment status
  useEffect(() => {
    if (!id) return

    const fetchStatus = async () => {
      try {
        const res = await api.get(`/apps/deployments/${id}/status`)
        const data = res.data?.data
        if (data) {
          if (data.status) setStatus(data.status)
          if (data.appName) setAppName(data.appName)
          if (data.errorMessage) setErrorMessage(data.errorMessage)
        }
      } catch (err: unknown) {
        console.error("Failed to fetch deployment status", err)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 3000)
    return () => clearInterval(interval)
  }, [id])

  // Build clean log output
  const logs = useMemo<LogEntry[]>(() => {
    const now = () => new Date().toISOString().split("T")[1].slice(0, 8)
    const newLogs: LogEntry[] = [
      { timestamp: now(), level: "INFO", message: `Deployment initiated for ID: ${id}` },
      { timestamp: now(), level: "INFO", message: `Preparing workspace and application resources` },
    ]

    if (status === "QUEUED" || status === "BUILDING" || status === "STARTING" || status === "ACTIVE" || status === "FAILED") {
      newLogs.push({ timestamp: now(), level: "BUILD", message: `Cloning repository and verifying workspace` })
      newLogs.push({ timestamp: now(), level: "SUCCESS", message: `Repository workspace verified` })
    }

    if (status === "BUILDING" || status === "STARTING" || status === "ACTIVE" || status === "FAILED") {
      newLogs.push({ timestamp: now(), level: "BUILD", message: `Building application assets and dependencies` })
      newLogs.push({ timestamp: now(), level: "BUILD", message: `Compiling application bundle` })
    }

    if (status === "STARTING" || status === "ACTIVE") {
      newLogs.push({ timestamp: now(), level: "SUCCESS", message: `Application build completed successfully` })
      newLogs.push({ timestamp: now(), level: "INFO", message: `Starting web service instance` })
    }

    if (status === "ACTIVE") {
      newLogs.push({ timestamp: now(), level: "SUCCESS", message: `Health check passed. Service is online!` })
      newLogs.push({ timestamp: now(), level: "SUCCESS", message: `Live URL: http://${appName || 'app'}.localhost` })
    }

    if (status === "FAILED") {
      newLogs.push({ timestamp: now(), level: "ERROR", message: `Deployment encountered an error.` })
      if (errorMessage) {
        newLogs.push({ timestamp: now(), level: "ERROR", message: `${errorMessage}` })
      }
    }

    return newLogs
  }, [status, id, appName, errorMessage])

  // Auto scroll terminal output
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const copyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.level}] ${l.message}`).join("\n")
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filteredLogs = logs.filter((l) =>
    l.message.toLowerCase().includes(logFilter.toLowerCase())
  )

  const isTerminal = status === "ACTIVE" || status === "FAILED"
  const isActive = status === "ACTIVE"
  const isFailed = status === "FAILED"

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex flex-col selection:bg-[var(--color-accent-blue)]/20">
      <Header profile={null} />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Back link */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Applications</span>
        </Link>

        {/* Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[var(--color-border-subtle)]">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-[-0.72px] text-[var(--color-text-primary)]">
                {appName ? appName : "Deployment Status"}
              </h1>

              {/* Status badge */}
              <span
                className={`badge-pill ${
                  isActive
                    ? "bg-[rgba(23,201,100,0.1)] text-[var(--color-status-success-text)]"
                    : isFailed
                    ? "bg-[rgba(242,19,97,0.1)] text-[var(--color-status-error-text)]"
                    : "bg-[rgba(245,166,35,0.15)] text-[var(--color-status-warning-text)]"
                }`}
              >
                {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-status-success)]" />}
                {!isTerminal && <Loader2 className="h-3 w-3 animate-spin text-[var(--color-status-warning)]" />}
                {isFailed && <XCircle className="h-3 w-3 text-[var(--color-status-error)]" />}
                <span>{status}</span>
              </span>
            </div>
          </div>

          {/* Action links */}
          <div className="flex items-center gap-3">
            {isActive && appName && (
              <a
                href={`http://${appName}.localhost`}
                target="_blank"
                rel="noreferrer"
                className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-2 focus-ring"
              >
                <span>Launch App</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}

            <button
              onClick={() => navigate("/dashboard")}
              className="btn-ghost text-xs py-2 px-4 focus-ring"
            >
              Dashboard
            </button>
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { step: 1, title: "QUEUED", label: "Queued" },
            { step: 2, title: "STARTED", label: "Preparing" },
            { step: 3, title: "BUILDING", label: "Building" },
            { step: 4, title: "STARTING", label: "Starting" },
            { step: 5, title: "ACTIVE", label: "Online" },
          ].map((st) => {
            const isCompleted =
              (status === "ACTIVE" && st.step <= 5) ||
              (status === "STARTING" && st.step <= 4) ||
              (status === "BUILDING" && st.step <= 3) ||
              (status === "STARTED" && st.step <= 2) ||
              (status === "QUEUED" && st.step <= 1)

            const isCurrent = status === st.title

            return (
              <div
                key={st.step}
                className={`p-3 rounded-lg border flex flex-col gap-1 transition-all ${
                  isCurrent
                    ? "bg-[var(--color-bg-secondary)] border-[var(--color-accent-blue)] text-[var(--color-accent-blue)] shadow-sm"
                    : isCompleted
                    ? "bg-[var(--color-bg-secondary)] border-[var(--color-status-success)] text-[var(--color-status-success-text)]"
                    : "bg-[var(--color-bg-primary)] border-[var(--color-border-subtle)] text-[var(--color-text-disabled)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium tracking-wider opacity-60">
                    Step {st.step}
                  </span>
                  {isCompleted && (!isCurrent || st.step === 5) ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-status-success-text)]" />
                  ) : isCurrent && st.step !== 5 ? (
                    <Loader2 className="h-3.5 w-3.5 text-[var(--color-accent-blue)] animate-spin" />
                  ) : null}
                </div>
                <span className="text-xs font-semibold truncate">{st.label}</span>
              </div>
            )
          })}
        </div>

        {/* Log Console (DESIGN.md Code Block / Log Viewer) */}
        <div className="rounded-lg border border-[var(--color-border-subtle)] overflow-hidden shadow-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
          {/* Console Header */}
          <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex flex-wrap items-center justify-between gap-4 bg-[var(--color-bg-secondary)]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-status-error)] inline-block" />
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-status-warning)] inline-block" />
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-status-success)] inline-block" />
              </div>
              <span className="text-xs font-mono text-[var(--color-text-secondary)] flex items-center gap-2 border-l border-[var(--color-border-default)] pl-3">
                <Terminal className="h-3.5 w-3.5 text-[var(--color-accent-blue)]" />
                Deployment Logs
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] rounded pl-8 pr-3 py-1 text-xs font-mono text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus-ring w-36"
                />
              </div>

              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`p-1.5 rounded border text-xs flex items-center gap-1 transition-colors ${
                  autoScroll
                    ? "bg-[rgba(50,145,255,0.15)] border-[var(--color-accent-blue)] text-[var(--color-accent-blue)]"
                    : "bg-[var(--color-bg-tertiary)] border-[var(--color-border-default)] text-[var(--color-text-secondary)]"
                }`}
                title="Toggle Auto-scroll"
              >
                {autoScroll ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </button>

              <button
                onClick={copyLogs}
                className="px-3 py-1 rounded bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-secondary)] text-xs font-mono text-[var(--color-text-primary)] border border-[var(--color-border-default)] flex items-center gap-1.5 transition-colors focus-ring"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[var(--color-status-success-text)]" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* Log Stream Output */}
          <div
            ref={logContainerRef}
            className="p-5 font-mono text-xs leading-relaxed space-y-2 h-[420px] overflow-y-auto bg-[var(--color-bg-primary)]"
          >
            {filteredLogs.length === 0 ? (
              <div className="text-[var(--color-text-secondary)] italic">No logs found...</div>
            ) : (
              filteredLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-3 hover:bg-[var(--color-bg-tertiary)] p-1 rounded transition-colors">
                  <span className="text-[var(--color-text-tertiary)] shrink-0 select-none text-[11px]" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {log.timestamp}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                      log.level === "SUCCESS"
                        ? "bg-[rgba(23,201,100,0.15)] text-[var(--color-status-success-text)]"
                        : log.level === "BUILD"
                        ? "bg-[rgba(50,145,255,0.15)] text-[var(--color-accent-blue)]"
                        : log.level === "ERROR"
                        ? "bg-[rgba(255,97,102,0.15)] text-[var(--color-status-error-text)]"
                        : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
                    }`}
                  >
                    {log.level}
                  </span>
                  <span
                    className={`break-all ${
                      log.level === "ERROR"
                        ? "text-[var(--color-status-error-text)]"
                        : log.level === "SUCCESS"
                        ? "text-[var(--color-text-primary)]"
                        : "text-[var(--color-text-secondary)]"
                    }`}
                  >
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
