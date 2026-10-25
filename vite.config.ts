import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Pobranie hasha commita git lub fallback ze zmiennej środowiskowej
let gitCommit = process.env.VITE_GIT_COMMIT || 'dev'
try {
  gitCommit = execSync('git rev-parse --short HEAD').toString().trim()
} catch {
  // Ignoruj błąd gdy git nie jest dostępny (np. w środowisku Docker bez .git)
}

let appVersion = '1.0.0'
try {
  const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'))
  appVersion = process.env.VITE_APP_VERSION || pkg.version || '1.0.0'
} catch {
  appVersion = process.env.VITE_APP_VERSION || '1.0.0'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __GIT_COMMIT__: JSON.stringify(gitCommit),
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
