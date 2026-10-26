import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type AutoRefreshMode = 'first_page' | 'full'
export type AppLanguage = 'en' | 'pl'

export interface SettingsState {
  /** Concurrency limit for parallel zone rule fetching (1-6) */
  concurrency: number
  /** Auto-refresh interval in seconds (0 = disabled, 30, 60, 300, 600) */
  autoRefreshInterval: number
  /** Mode of auto-refresh: first_page (delta sync) vs full (all pages) */
  autoRefreshMode: AutoRefreshMode
  /** Application interface language: English (en) or Polish (pl) */
  language: AppLanguage
  /** Timestamp Date.now() of the last successful rules fetch/refresh */
  lastRefreshAt: number | null
  /** Timestamp Date.now() of the planned next auto-refresh */
  nextRefreshAt: number | null
  /** Whether background auto-refresh is currently in progress */
  isAutoRefreshing: boolean
}

export interface SettingsActions {
  setConcurrency: (val: number) => void
  setAutoRefreshInterval: (interval: number) => void
  setAutoRefreshMode: (mode: AutoRefreshMode) => void
  setLanguage: (lang: AppLanguage) => void
  markRefreshed: () => void
  scheduleNextRefresh: () => void
  setIsAutoRefreshing: (val: boolean) => void
  resetSettings: () => void
}

export const SETTINGS_STORAGE_NAME = 'cf-app-settings'

export const DEFAULT_SETTINGS: SettingsState = {
  concurrency: 2,
  autoRefreshInterval: 0,
  autoRefreshMode: 'first_page',
  language: 'en',
  lastRefreshAt: null,
  nextRefreshAt: null,
  isAutoRefreshing: false,
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,

      setConcurrency: (val: number) =>
        set({
          concurrency: Math.min(6, Math.max(1, Math.round(Number(val) || 2))),
        }),

      setAutoRefreshInterval: (interval: number) => {
        const allowedIntervals = [0, 30, 60, 300, 600]
        const num = Math.max(0, Math.round(Number(interval) || 0))
        const validated = allowedIntervals.includes(num) ? num : 0
        const now = Date.now()
        set({
          autoRefreshInterval: validated,
          nextRefreshAt: validated > 0 ? now + validated * 1000 : null,
        })
      },

      setAutoRefreshMode: (mode: AutoRefreshMode) =>
        set({
          autoRefreshMode: mode === 'full' ? 'full' : 'first_page',
        }),

      setLanguage: (lang: AppLanguage) => {
        const validated: AppLanguage = lang === 'pl' ? 'pl' : 'en'
        if (typeof document !== 'undefined') {
          document.documentElement.lang = validated
        }
        set({ language: validated })
      },

      markRefreshed: () => {
        const now = Date.now()
        const interval = get().autoRefreshInterval
        set({
          lastRefreshAt: now,
          nextRefreshAt: interval > 0 ? now + interval * 1000 : null,
          isAutoRefreshing: false,
        })
      },

      scheduleNextRefresh: () => {
        const now = Date.now()
        const interval = get().autoRefreshInterval
        set({
          nextRefreshAt: interval > 0 ? now + interval * 1000 : null,
        })
      },

      setIsAutoRefreshing: (val: boolean) =>
        set({
          isAutoRefreshing: val,
        }),

      resetSettings: () =>
        set({
          ...DEFAULT_SETTINGS,
          lastRefreshAt: null,
          nextRefreshAt: null,
          isAutoRefreshing: false,
        }),
    }),
    {
      name: SETTINGS_STORAGE_NAME,
      storage: createJSONStorage(() => localStorage),
      // Persist only persistent user configuration settings to localStorage (exclude transient runtime fields)
      partialize: (state) => ({
        concurrency: state.concurrency,
        autoRefreshInterval: state.autoRefreshInterval,
        autoRefreshMode: state.autoRefreshMode,
        language: state.language,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.language && typeof document !== 'undefined') {
          document.documentElement.lang = state.language
        }
      },
    }
  )
)

export default useSettingsStore
