export type UserProfile = {
  id: number
  name: string
  email: string
  avatarUrl: string
  hasGithubInstallation: boolean
}

export type Repo = {
  id: number
  full_name: string
  private: boolean
  default_branch: string
  description?: string
}

export type Deployment = {
  id: string
  appName: string
  repoFullName: string
  branch: string
  appPort: number
  status: string
  commitSha: string
  errorMessage?: string
  createdAt: string
}
