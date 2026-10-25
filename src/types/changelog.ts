export interface ChangelogChange {
  hash: string
  date?: string
  type: string
  scope?: string
  message: string
}

export interface ChangelogRelease {
  version: string
  tag: string
  commit: string
  date: string
  changes: ChangelogChange[]
}

export interface ChangelogData {
  latestVersion: string
  latestCommit: string
  generatedAt: string
  releases: ChangelogRelease[]
}
