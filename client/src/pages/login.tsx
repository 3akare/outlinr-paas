import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { GithubIcon } from "@/components/GithubIcon"
import { useState } from "react"

export default function Login() {
  const [loading, setLoading] = useState(false)

  const handleGithubLogin = () => {
    setLoading(true)
    window.location.href = `${import.meta.env.VITE_API_URL}/api/oauth2/authorization/github`
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] p-4 selection:bg-[var(--color-accent-blue)]/20">
      <div className="outlinr-card w-full max-w-[400px] text-center shadow-none border-[var(--color-border-subtle)]">
        
        <div className="mb-6 flex justify-center">
          <span className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Outlinr
          </span>
        </div>
        
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          Welcome back
        </h1>
        <p className="mb-8 text-sm text-[var(--color-text-secondary)]">
          Sign in to your account to deploy your applications.
        </p>

        <Button
          onClick={handleGithubLogin}
          disabled={loading}
          className="w-full h-11 flex items-center justify-center bg-[var(--color-accent-primary)] hover:bg-[#e2e2e2] text-[#000000] font-medium border-0 focus-ring rounded-md transition-colors"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#000000]" />
          ) : (
            <GithubIcon className="mr-2 h-4 w-4 text-[#000000]" />
          )}
          Continue with GitHub
        </Button>
        
        <p className="mt-6 text-xs text-[var(--color-text-tertiary)]">
          By clicking continue, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
