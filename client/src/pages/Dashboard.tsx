import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { useClearAuth } from "@/store/auth_store"
import { api } from "@/api/axios"

type Repo = {
  id: number
  full_name: string
  private: boolean
  default_branch: string
}

const Dashboard = () => {
  const clearAuth = useClearAuth()
  const navigate = useNavigate()
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const [notInstalled, setNotInstalled] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const params = new URLSearchParams(window.location.search)
    const installationId = params.get("installation_id")

    const fetchRepos = () => {
      api.get("/github/repositories")
        .then(res => {
          const data = res.data?.data ?? res.data
          setRepos(Array.isArray(data) ? data : [])
        })
        .catch(err => {
          if (err.response?.status === 400 || err.response?.status === 403) {
            setNotInstalled(true)
          }
        })
        .finally(() => setLoading(false))
    }

    if (installationId) {
      api.post(`/github/installation/save?installation_id=${installationId}`)
        .then(() => {
          window.history.replaceState({}, "", "/dashboard")
          fetchRepos()
        })
        .catch(() => {
          setNotInstalled(true)
          setLoading(false)
        })
    } else {
      fetchRepos()
    }
  }, [])

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout")
    } finally {
      clearAuth()
      navigate("/login", { replace: true })
    }
  }

  return (
    <div>
      <h2>Dashboard</h2>
      <button onClick={handleLogout}>Logout</button>

      {loading && <p>Loading repositories...</p>}

      {!loading && notInstalled && (
        <div>
          <p>Connect your GitHub repositories to get started.</p>
          <a href={`https://github.com/apps/${import.meta.env.VITE_GITHUB_APP_NAME}/installations/new`}>
            Install GitHub App
          </a>
        </div>
      )}

      {!loading && !notInstalled && repos.length === 0 && (
        <p>No repositories found.</p>
      )}

      {!loading && !notInstalled && repos.length > 0 && (
        <ul>
          {repos.map(repo => (
            <li key={repo.id}>
              <span>{repo.full_name}</span>
              <span>{repo.private ? "Private" : "Public"}</span>
              <span>Branch: {repo.default_branch}</span>
              <button onClick={() => navigate("/deploy", { state: { repo } })}>
                Deploy
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Dashboard
