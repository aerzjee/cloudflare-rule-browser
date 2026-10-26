import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { cryptoStorage } from '../utils/cryptoStorage'
import { clearAllCachedRules } from '../utils/rulesCache'

export type AuthType = 'bearer' | 'global_key'

export interface AuthState {
  /** Cloudflare account email */
  email: string
  /** API Token (Bearer) or Global API Key */
  token: string
  /** Authentication method */
  authType: AuthType
  /** When true, fetch only account-level resources (skip per-zone listing) */
  accountLevelOnly: boolean
  /** Custom CORS proxy URL (defaults to VITE_API_PROXY_URL or '/api/cf') */
  proxyUrl: string
}

interface AuthActions {
  /** Store credentials after successful validation */
  login: (payload: {
    email: string
    token: string
    authType: AuthType
    accountLevelOnly: boolean
    proxyUrl?: string
  }) => void
  /** Clear all credentials and remove persisted data */
  logout: () => void
  /** Update a single field */
  setAccountLevelOnly: (value: boolean) => void
  /** Set custom CORS proxy URL */
  setProxyUrl: (url: string) => void
}

const DEFAULT_PROXY_URL =
  (import.meta.env.VITE_API_PROXY_URL as string | undefined)?.trim() || '/api/cf'

const INITIAL_STATE: AuthState = {
  email: '',
  token: '',
  authType: 'bearer',
  accountLevelOnly: false,
  proxyUrl: DEFAULT_PROXY_URL,
}

export const AUTH_STORAGE_NAME = 'session'

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      login: ({ email, token, authType, accountLevelOnly, proxyUrl }) =>
        set((state) => ({
          email,
          token,
          authType,
          accountLevelOnly,
          proxyUrl: proxyUrl !== undefined ? proxyUrl : state.proxyUrl,
        })),

      logout: () => {
        const currentProxy = get().proxyUrl || DEFAULT_PROXY_URL
        set({ ...INITIAL_STATE, proxyUrl: currentProxy })
        // Also explicitly remove the persisted key so nothing lingers
        cryptoStorage.removeItem(AUTH_STORAGE_NAME)
        // Clear all cached rules from IndexedDB
        clearAllCachedRules().catch((err) =>
          console.warn('[useAuthStore] Error clearing IndexedDB cache:', err)
        )
      },

      setAccountLevelOnly: (value: boolean) => set({ accountLevelOnly: value }),
      setProxyUrl: (url: string) => set({ proxyUrl: url }),
    }),
    {
      name: AUTH_STORAGE_NAME,
      storage: createJSONStorage(() => cryptoStorage),
      // Only persist credential-related fields, not actions
      partialize: (state) => ({
        email: state.email,
        token: state.token,
        authType: state.authType,
        accountLevelOnly: state.accountLevelOnly,
        proxyUrl: state.proxyUrl,
      }),
    }
  )
)

/** Convenience selector — true when the user has entered credentials */
export const selectIsAuthenticated = (state: AuthState) =>
  state.email.length > 0 && state.token.length > 0

export default useAuthStore
