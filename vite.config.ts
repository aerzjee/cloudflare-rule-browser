import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 1. Pobranie wersji aplikacji:
// VITE_APP_VERSION -> git describe --tags --abbrev=0 (bez 'v') -> package.json version -> '1.0.0'
let appVersion = process.env.VITE_APP_VERSION
if (!appVersion) {
  try {
    const latestTag = execSync('git describe --tags --abbrev=0', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
    if (latestTag) {
      appVersion = latestTag.replace(/^v/, '')
    }
  } catch {
    // Brak tagów lub brak gita
  }
}
if (!appVersion) {
  try {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'))
    appVersion = pkg.version || '1.0.0'
  } catch {
    appVersion = '1.0.0'
  }
}

// 2. Pobranie hasha commita git:
// VITE_GIT_COMMIT -> commit przypisany do ostatniego taga -> git rev-parse --short HEAD -> 'dev'
let gitCommit = process.env.VITE_GIT_COMMIT
if (!gitCommit) {
  try {
    const latestTag = execSync('git describe --tags --abbrev=0', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
    if (latestTag) {
      gitCommit = execSync(`git rev-list -n 1 ${latestTag} --abbrev-commit`, {
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .toString()
        .trim()
    }
  } catch {
    // Brak tagów
  }
}
if (!gitCommit) {
  try {
    gitCommit = execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
  } catch {
    gitCommit = 'dev'
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __GIT_COMMIT__: JSON.stringify(gitCommit),
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              priority: 40,
            },
            {
              name: 'vendor-tanstack',
              test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
              priority: 30,
            },
            {
              name: 'vendor-animation',
              test: /[\\/]node_modules[\\/](motion|@formkit)[\\/]/,
              priority: 20,
            },
            {
              name: 'vendor-ui',
              test: /[\\/]node_modules[\\/](lucide-react|zustand|zod|idb-keyval)[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api/cf': {
        target: 'https://api.cloudflare.com/client/v4',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cf/, ''),
      },
    },
  },
})
