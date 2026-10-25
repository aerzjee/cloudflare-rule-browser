import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type AutoRefreshMode = 'first_page' | 'full'

export interface SettingsState {
  /** Concurrency limit for parallel zone rule fetching (1-6) */
  concurrency: number
  /** Auto-refresh interval in seconds (0 = disabled, 30, 60, 300, 600) */
  autoRefreshInterval: number
  /** Mode of auto-refresh: first_page (delta sync) vs full (all pages) */
  autoRefreshMode: AutoRefreshMode
}

export interface SettingsActions {
  setConcurrency: (val: number) => void
  setAutoRefreshInterval: (interval: number) => void
  setAutoRefreshMode: (mode: AutoRefreshMode) => void
  resetSettings: () => void
}

export const SETTINGS_STORAGE_NAME = 'cf-app-settings'

export const DEFAULT_SETTINGS: SettingsState = {
  concurrency: 2,
  autoRefreshInterval: 0,
  autoRefreshMode: 'first_page',
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setConcurrency: (val: number) =>
        set({
          concurrency: Math.min(6, Math.max(1, Math.round(Number(val) || 2))),
        }),

      setAutoRefreshInterval: (interval: number) => {
        const allowedIntervals = [0, 30, 60, 300, 600]
        const num = Math.max(0, Math.round(Number(interval) || 0))
        const validated = allowedIntervals.includes(num) ? num : 0
        set({ autoRefreshInterval: validated })
      },

      setAutoRefreshMode: (mode: AutoRefreshMode) =>
        set({
          autoRefreshMode: mode === 'full' ? 'full' : 'first_page',
        }),

      resetSettings: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: SETTINGS_STORAGE_NAME,
      storage: createJSONStorage(() => localStorage),
    }
  )
)

export default useSettingsStore
