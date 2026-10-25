import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { cryptoStorage } from '../utils/cryptoStorage'

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
}

interface AuthActions {
  /** Store credentials after successful validation */
  login: (payload: {
    email: string
    token: string
    authType: AuthType
    accountLevelOnly: boolean
  }) => void
  /** Clear all credentials and remove persisted data */
  logout: () => void
  /** Update a single field */
  setAccountLevelOnly: (value: boolean) => void
}

const INITIAL_STATE: AuthState = {
  email: '',
  token: '',
  authType: 'bearer',
  accountLevelOnly: false,
}

export const AUTH_STORAGE_NAME = 'session'

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      login: ({ email, token, authType, accountLevelOnly }) =>
        set({ email, token, authType, accountLevelOnly }),

      logout: () => {
        set({ ...INITIAL_STATE })
        // Also explicitly remove the persisted key so nothing lingers
        cryptoStorage.removeItem(AUTH_STORAGE_NAME)
      },

      setAccountLevelOnly: (value: boolean) => set({ accountLevelOnly: value }),
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
      }),
    }
  )
)

/** Convenience selector — true when the user has entered credentials */
export const selectIsAuthenticated = (state: AuthState) =>
  state.email.length > 0 && state.token.length > 0

export default useAuthStore
