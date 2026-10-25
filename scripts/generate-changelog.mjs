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
 * Bezpieczne wywołanie polecenia git z cwd w katalogu głównym projektu.
 * Zwraca null w przypadku błędu (np. brak gita, brak repozytorium).
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
 * Parsowanie pojedynczej linii logu git formatu: "%h|%s|%ad"
 */
function parseCommitLine(line) {
  const parts = line.split('|')
  if (parts.length < 3) return null
  const hash = parts[0].trim()
  const subject = parts.slice(1, -1).join('|').trim() // na wypadek gdyby commit message zawierał '|'
  const date = parts[parts.length - 1].trim()

  // Konwencja Conventional Commits: typ(zakres)!: opis
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
 * Pobranie listy commitów dla wskazanego zakresu
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
 * Generowanie pliku RELEASE_NOTES.md dla najnowszego wydania
 */
function generateReleaseNotesMarkdown(release) {
  if (!release) return '# Release Notes\n\nBrak zarejestrowanych zmian.'

  const typeTitles = {
    feat: '✨ Nowości i funkcjonalności',
    fix: '🐛 Poprawki błędów',
    perf: '⚡ Wydajność i optymalizacje',
    refactor: '♻️ Refaktoryzacja kodu',
    docs: '📝 Dokumentacja',
    style: '💄 Style i interfejs',
    chore: '🔧 Utrzymanie i konfiguracja',
    build: '📦 Budowanie i zależności',
    ci: '🤖 CI/CD i automatyzacja',
    test: '🧪 Testy',
    other: '📌 Pozostałe zmiany',
  }

  const groups = {}
  for (const c of release.changes) {
    const t = c.type in typeTitles ? c.type : 'other'
    if (!groups[t]) groups[t] = []
    groups[t].push(c)
  }

  const lines = []
  lines.push(`# Wydanie ${release.tag || release.version} (${release.date})`)
  lines.push('')
  lines.push(`> **Wersja:** \`${release.version}\` • **Commit:** \`${release.commit}\``)
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

// 1. Sprawdzenie, czy pracujemy w repozytorium Git
const isGitRepo = runGit('git rev-parse --is-inside-work-tree') === 'true'

let packageVersion = '1.0.0'
try {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'))
  packageVersion = pkg.version || '1.0.0'
} catch {
  // Ignoruj błąd odczytu package.json
}

if (!isGitRepo) {
  // Bezpieczna obsługa środowiska Docker / bez katalogu .git
  if (fs.existsSync(CHANGELOG_JSON_PATH)) {
    console.log('[changelog] Środowisko bez gita: plik changelog.json już istnieje. Pomijanie.')
    process.exit(0)
  }

  console.warn('[changelog] Środowisko bez gita i brak changelog.json. Tworzenie pliku początkowego.')
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
            message: 'Wydanie produkcyjne aplikacji',
          },
        ],
      },
    ],
  }

  fs.mkdirSync(GENERATED_DIR, { recursive: true })
  fs.writeFileSync(CHANGELOG_JSON_PATH, JSON.stringify(fallbackData, null, 2), 'utf-8')
  process.exit(0)
}

// 2. Pobranie listy tagów
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

  // Sprawdzenie, czy po ostatnim tagu pojawiły się nowsze commity na HEAD (np. praca lokalna)
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

  // Pobranie commitów dla każdego taga
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
      // Dla najstarszego taga pobierz całą historię do tego punktu
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
  // Brak tagów: fallback do wersji z package.json i ostatnich 30 commitów
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

// 3. Zapis pliku src/generated/changelog.json
const changelogData = {
  latestVersion,
  latestCommit,
  generatedAt: new Date().toISOString(),
  releases,
}

fs.mkdirSync(GENERATED_DIR, { recursive: true })
fs.writeFileSync(CHANGELOG_JSON_PATH, JSON.stringify(changelogData, null, 2), 'utf-8')
console.log(`[changelog] Zapisano ${CHANGELOG_JSON_PATH} (${releases.length} wydań)`)

// 4. Zapis pliku RELEASE_NOTES.md dla najnowszego wydania
const targetReleaseForNotes =
  releases.find((r) => r.tag !== 'HEAD') || releases[0]
const releaseNotesMd = generateReleaseNotesMarkdown(targetReleaseForNotes)
fs.writeFileSync(RELEASE_NOTES_PATH, releaseNotesMd, 'utf-8')
console.log(`[changelog] Zapisano ${RELEASE_NOTES_PATH}`)
