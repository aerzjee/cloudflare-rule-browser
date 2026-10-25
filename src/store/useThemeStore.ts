import { create } from 'zustand'

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'cf-theme'

function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (!raw) return null
    if (raw === 'dark' || raw === 'light') return raw
    try {
      const parsed = JSON.parse(raw)
      if (parsed === 'dark' || parsed === 'light') return parsed
      if (parsed?.state?.theme === 'dark' || parsed?.state?.theme === 'light') {
        return parsed.state.theme
      }
    } catch {
      // ignore JSON parse error
    }
  } catch (error) {
    console.warn('Failed to read theme from localStorage', error)
  }
  return null
}

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function applyThemeToDOM(theme: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
    root.style.colorScheme = 'dark'
  } else {
    root.classList.remove('dark')
    root.style.colorScheme = 'light'
  }
}

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

// Initialize theme on DOM immediately
const initialTheme: Theme = getStoredTheme() ?? getSystemTheme()
applyThemeToDOM(initialTheme)

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme,
  setTheme: (theme: Theme) => {
    applyThemeToDOM(theme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch (error) {
      console.warn('Failed to save theme to localStorage', error)
    }
    set({ theme })
  },
  toggleTheme: () => {
    const nextTheme: Theme = get().theme === 'dark' ? 'light' : 'dark'
    get().setTheme(nextTheme)
  },
}))

// Cross-tab synchronization
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === THEME_STORAGE_KEY && event.newValue) {
      const newTheme = event.newValue === 'dark' ? 'dark' : 'light'
      if (newTheme !== useThemeStore.getState().theme) {
        applyThemeToDOM(newTheme)
        useThemeStore.setState({ theme: newTheme })
      }
    }
  })
}
