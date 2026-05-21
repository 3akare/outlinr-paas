import { useSetAccessToken } from "@/store/auth_store"
import { useEffect } from "react"
import { useSearchParams, useNavigate } from "react-router"

export const OAuthCallback = () => {
  const [searchParams] = useSearchParams()
  const setAccessToken = useSetAccessToken()
  const navigate = useNavigate()

  const token = searchParams.get("access_token")

  useEffect(() => {
    if (token) {
      setAccessToken(token)
      navigate("/dashboard", { replace: true })
    } else {
      navigate("/login", { replace: true })
    }
  }, [token, setAccessToken, navigate])

  return <div>Finalizing sign-in...</div>
}
