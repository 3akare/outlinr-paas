const apiUrl = import.meta.env.VITE_API_URL as string

export default function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] p-4">
      <div className="w-full max-w-md">
        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/20">
              <div className="h-3 w-3 rounded-sm bg-emerald-400" />
            </div>
            <span className="text-lg font-semibold tracking-wide text-white">
              Outlinr
            </span>
          </div>
          <h1 className="mb-2 text-3xl font-light tracking-tight text-white">
            Welcome back
          </h1>
          <p className="text-sm text-white/40">
            Sign in to deploy your applications
          </p>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-b from-white/6 to-transparent" />
          <div className="relative rounded-2xl border border-white/8 bg-white/3 p-8 backdrop-blur-sm">
            <a
              href={`${apiUrl}/api/oauth2/authorization/github`}
              className="group flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-gray-900 transition-all duration-150 hover:bg-white/90 active:scale-[0.98]"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              Continue with GitHub
            </a>

            <p className="mt-6 text-center text-xs leading-relaxed text-white/25">
              By continuing, you agree to our Terms of Service and Privacy
              Policy
            </p>
          </div>
        </div>
      </div>

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/3 blur-3xl" />
      </div>
    </div>
  )
}
