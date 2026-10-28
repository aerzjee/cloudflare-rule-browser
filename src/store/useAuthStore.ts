import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { cryptoStorage } from '../utils/cryptoStorage'
import { clearAllCachedRules } from '../utils/rulesCache'
import { queryClient } from '../lib/queryClient'

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
  /** Whether to persist session across browser restarts via localStorage */
  rememberSession: boolean
  /** Reason for the last logout (used to display session timeout warning banner) */
  logoutReason: 'manual' | 'inactivity' | null
}

interface AuthActions {
  /** Store credentials after successful validation */
  login: (payload: {
    email: string
    token: string
    authType: AuthType
    accountLevelOnly: boolean
    proxyUrl?: string
    rememberSession?: boolean
  }) => void
  /** Clear all credentials, wipe storage, and reset React Query cache */
  logout: (reason?: 'manual' | 'inactivity') => void
  /** Update account level scope */
  setAccountLevelOnly: (value: boolean) => void
  /** Set custom CORS proxy URL */
  setProxyUrl: (url: string) => void
  /** Set whether credentials are saved in localStorage or volatile sessionStorage */
  setRememberSession: (val: boolean) => void
  /** Clear or set logout reason banner */
  setLogoutReason: (reason: 'manual' | 'inactivity' | null) => void
}

const DEFAULT_PROXY_URL =
  (import.meta.env.VITE_API_PROXY_URL as string | undefined)?.trim() || '/api/cf'

const INITIAL_STATE: AuthState = {
  email: '',
  token: '',
  authType: 'bearer',
  accountLevelOnly: false,
  proxyUrl: DEFAULT_PROXY_URL,
  rememberSession: false,
  logoutReason: null,
}

export const AUTH_STORAGE_NAME = 'session'

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      login: ({ email, token, authType, accountLevelOnly, proxyUrl, rememberSession }) =>
        set((state) => ({
          email,
          token,
          authType,
          accountLevelOnly,
          proxyUrl: proxyUrl !== undefined ? proxyUrl : state.proxyUrl,
          rememberSession: rememberSession !== undefined ? rememberSession : state.rememberSession,
          logoutReason: null,
        })),

      logout: (reason = 'manual') => {
        const currentProxy = get().proxyUrl || DEFAULT_PROXY_URL
        set({ ...INITIAL_STATE, proxyUrl: currentProxy, logoutReason: reason })
        // Clear session from both sessionStorage and localStorage
        cryptoStorage.removeItem(AUTH_STORAGE_NAME)
        // Clear all cached React Query state
        queryClient.clear()
        // Clear all cached rules from IndexedDB
        clearAllCachedRules().catch((err) =>
          console.warn('[useAuthStore] Error clearing IndexedDB cache:', err)
        )
      },

      setAccountLevelOnly: (value: boolean) => set({ accountLevelOnly: value }),
      setProxyUrl: (url: string) => set({ proxyUrl: url }),
      setRememberSession: (val: boolean) => set({ rememberSession: val }),
      setLogoutReason: (reason: 'manual' | 'inactivity' | null) => set({ logoutReason: reason }),
    }),
    {
      name: AUTH_STORAGE_NAME,
      storage: createJSONStorage(() => cryptoStorage),
      // Only persist credential-related fields, not transient actions or logoutReason
      partialize: (state) => ({
        email: state.email,
        token: state.token,
        authType: state.authType,
        accountLevelOnly: state.accountLevelOnly,
        proxyUrl: state.proxyUrl,
        rememberSession: state.rememberSession,
      }),
    }
  )
)

/** Convenience selector — true when the user has entered credentials */
export const selectIsAuthenticated = (state: AuthState) =>
  state.email.length > 0 && state.token.length > 0

export default useAuthStore
