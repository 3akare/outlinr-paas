import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router"
import { api } from "@/api/axios"

export default function DeploymentStatus() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<string>("LOADING")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchStatus = async () => {
      try {
        const res = await api.get(`/apps/deployments/${id}/status`)
        const data = res.data?.data
        if (data?.status) {
          setStatus(data.status)
        }
      } catch (err: any) {
        setError(err.response?.data?.message ?? "Failed to fetch deployment status")
      }
    }

    fetchStatus()

    const interval = setInterval(() => {
      fetchStatus()
    }, 5000)

    return () => clearInterval(interval)
  }, [id])

  const isTerminal = status === "SUCCESS" || status === "FAILED"

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
        <h1 className="text-2xl font-light mb-2">Deployment Status</h1>
        <p className="text-sm text-white/40 mb-8 break-all">ID: {id}</p>
        
        {error ? (
          <div className="text-red-400 text-sm p-4 bg-red-500/10 rounded-xl border border-red-500/20">
            {error}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            {!isTerminal && (
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-400/20 border-t-emerald-400" />
            )}
            {status === "SUCCESS" && (
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {status === "FAILED" && (
              <div className="h-12 w-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/40">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            
            <div className="text-lg font-medium tracking-wide">
              {status}
            </div>
            
            <button
              onClick={() => navigate("/dashboard")}
              className="mt-4 px-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors border border-white/10"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
      
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-60 -right-60 h-125 w-125 rounded-full bg-emerald-500/4 blur-3xl" />
        <div className="absolute -bottom-60 -left-60 h-125 w-125 rounded-full bg-emerald-500/2 blur-3xl" />
      </div>
    </div>
  )
}
