import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')
const GENERATED_DIR = path.resolve(ROOT_DIR, 'src', 'generated')
const CHANGELOG_JSON_PATH = path.resolve(GENERATED_DIR, 'changelog.json')
const RELEASE_NOTES_PATH = path.resolve(ROOT_DIR, 'RELEASE_NOTES.md')
const PACKAGE_JSON_PATH = path.resolve(ROOT_DIR, 'package.json')

/**
 * Safely executes a git command with cwd in the project root directory.
 * Returns null on error (e.g., git not installed, non-git environment).
 */
function runGit(command) {
  try {
    return execSync(command, {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  } catch {
    return null
  }
}

/**
 * Parses a single line from git log formatted as: "%h|%s|%ad"
 */
function parseCommitLine(line) {
  const parts = line.split('|')
  if (parts.length < 3) return null
  const hash = parts[0].trim()
  const subject = parts.slice(1, -1).join('|').trim() // in case commit message contains pipe character
  const date = parts[parts.length - 1].trim()

  // Conventional Commits standard: type(scope)!: message
  const match = subject.match(/^([a-zA-Z0-9_-]+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/)
  if (match) {
    return {
      hash,
      date,
      type: match[1].toLowerCase(),
      scope: match[2]?.trim() || undefined,
      message: match[4].trim(),
    }
  }

  return {
    hash,
    date,
    type: 'other',
    scope: undefined,
    message: subject,
  }
}

/**
 * Retrieves commit list for the specified git log arguments.
 */
function getCommits(gitArgs) {
  const output = runGit(`git log ${gitArgs} --pretty=format:"%h|%s|%ad" --date=short`)
  if (!output) return []
  return output
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseCommitLine)
    .filter(Boolean)
}

/**
 * Generates RELEASE_NOTES.md content for the latest release.
 */
function generateReleaseNotesMarkdown(release) {
  if (!release) return '# Release Notes\n\nNo recorded changes.'

  const typeTitles = {
    feat: '✨ Features & Enhancements',
    fix: '🐛 Bug Fixes',
    perf: '⚡ Performance Optimizations',
    refactor: '♻️ Code Refactoring',
    docs: '📝 Documentation',
    style: '💄 Styles & UI',
    chore: '🔧 Maintenance & Configuration',
    build: '📦 Build & Dependencies',
    ci: '🤖 CI/CD & Automation',
    test: '🧪 Tests',
    other: '📌 Other Changes',
  }

  const groups = {}
  for (const c of release.changes) {
    const t = c.type in typeTitles ? c.type : 'other'
    if (!groups[t]) groups[t] = []
    groups[t].push(c)
  }

  const lines = []
  lines.push(`# Release ${release.tag || release.version} (${release.date})`)
  lines.push('')
  lines.push(`> **Version:** \`${release.version}\` • **Commit:** \`${release.commit}\``)
  lines.push('')

  const order = ['feat', 'fix', 'perf', 'refactor', 'style', 'docs', 'chore', 'build', 'ci', 'test', 'other']
  for (const typeKey of order) {
    if (!groups[typeKey] || groups[typeKey].length === 0) continue
    lines.push(`### ${typeTitles[typeKey]}`)
    lines.push('')
    for (const item of groups[typeKey]) {
      const scopePrefix = item.scope ? `**${item.scope}:** ` : ''
      lines.push(`- ${scopePrefix}${item.message} (\`${item.hash}\`)`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

// 1. Check if running inside a Git repository
const isGitRepo = runGit('git rev-parse --is-inside-work-tree') === 'true'

let packageVersion = '1.0.0'
try {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'))
  packageVersion = pkg.version || '1.0.0'
} catch {
  // Ignore package.json read error
}

if (!isGitRepo) {
  // Safe handling of Docker / environment without .git directory
  if (fs.existsSync(CHANGELOG_JSON_PATH)) {
    console.log('[changelog] Non-git environment: changelog.json already exists. Skipping.')
    process.exit(0)
  }

  console.warn('[changelog] Non-git environment and changelog.json missing. Creating initial fallback.')
  const fallbackData = {
    latestVersion: packageVersion,
    latestCommit: 'prod',
    generatedAt: new Date().toISOString(),
    releases: [
      {
        version: packageVersion,
        tag: `v${packageVersion}`,
        commit: 'prod',
        date: new Date().toISOString().split('T')[0],
        changes: [
          {
            hash: 'prod',
            type: 'chore',
            message: 'Production application release',
          },
        ],
      },
    ],
  }

  fs.mkdirSync(GENERATED_DIR, { recursive: true })
  fs.writeFileSync(CHANGELOG_JSON_PATH, JSON.stringify(fallbackData, null, 2), 'utf-8')
  process.exit(0)
}

// 2. Retrieve tag list
const rawTags = runGit('git tag --sort=-creatordate')
const tags = rawTags
  ? rawTags
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean)
  : []

let latestVersion = packageVersion
let latestCommit = 'dev'
const releases = []

if (tags.length > 0) {
  const latestTag = tags[0]
  latestVersion = latestTag.replace(/^v/, '')
  latestCommit = runGit(`git rev-list -n 1 ${latestTag} --abbrev-commit`) || 'dev'

  // Check for unreleased commits on HEAD after the latest tag (e.g. local work)
  const unreleasedCommits = getCommits(`${latestTag}..HEAD`)
  if (unreleasedCommits.length > 0) {
    const headCommit = runGit('git rev-parse --short HEAD') || 'dev'
    const headDate =
      runGit('git log -1 --format=%ad --date=short HEAD') ||
      new Date().toISOString().split('T')[0]

    releases.push({
      version: 'Unreleased / Next',
      tag: 'HEAD',
      commit: headCommit,
      date: headDate,
      changes: unreleasedCommits,
    })
  }

  // Retrieve commits for each tag
  for (let i = 0; i < tags.length; i++) {
    const currTag = tags[i]
    const tagCommit = runGit(`git rev-list -n 1 ${currTag} --abbrev-commit`) || 'unknown'
    const tagDate =
      runGit(`git log -1 --format=%ad --date=short ${currTag}`) ||
      new Date().toISOString().split('T')[0]
    const version = currTag.replace(/^v/, '')

    let tagChanges = []
    if (i < tags.length - 1) {
      const prevTag = tags[i + 1]
      tagChanges = getCommits(`${prevTag}..${currTag}`)
    } else {
      // For the oldest tag, retrieve the remaining commit history
      tagChanges = getCommits(currTag)
    }

    releases.push({
      version,
      tag: currTag,
      commit: tagCommit,
      date: tagDate,
      changes: tagChanges,
    })
  }
} else {
  // No tags found: fallback to package.json version and last 30 commits
  latestVersion = packageVersion
  latestCommit = runGit('git rev-parse --short HEAD') || 'dev'
  const latestDate =
    runGit('git log -1 --format=%ad --date=short HEAD') ||
    new Date().toISOString().split('T')[0]
  const recentCommits = getCommits('-n 30')

  releases.push({
    version: latestVersion,
    tag: `v${latestVersion}`,
    commit: latestCommit,
    date: latestDate,
    changes: recentCommits,
  })
}

// 3. Write src/generated/changelog.json
const changelogData = {
  latestVersion,
  latestCommit,
  generatedAt: new Date().toISOString(),
  releases,
}

fs.mkdirSync(GENERATED_DIR, { recursive: true })
fs.writeFileSync(CHANGELOG_JSON_PATH, JSON.stringify(changelogData, null, 2), 'utf-8')
console.log(`[changelog] Saved ${CHANGELOG_JSON_PATH} (${releases.length} releases)`)

// 4. Write RELEASE_NOTES.md for the latest release
const targetReleaseForNotes =
  releases.find((r) => r.tag !== 'HEAD') || releases[0]
const releaseNotesMd = generateReleaseNotesMarkdown(targetReleaseForNotes)
fs.writeFileSync(RELEASE_NOTES_PATH, releaseNotesMd, 'utf-8')
console.log(`[changelog] Saved ${RELEASE_NOTES_PATH}`)
