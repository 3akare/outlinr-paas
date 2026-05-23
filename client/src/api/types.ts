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
}
