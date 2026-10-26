import { create } from 'zustand'

export interface HighlightState {
  /** Map of row keys (e.g. `account-${accountId}-${id}`) that were recently synced */
  newlySyncedRuleKeys: Record<string, boolean>
  /** Highlight newly added/synced rule keys for 2600ms */
  highlightNewRules: (keys: string[]) => void
  /** Clear highlight for a specific rule key immediately */
  clearHighlight: (key: string) => void
}

export const useHighlightStore = create<HighlightState>((set) => ({
  newlySyncedRuleKeys: {},

  highlightNewRules: (keys: string[]) => {
    if (!keys || keys.length === 0) return

    set((state) => {
      const next = { ...state.newlySyncedRuleKeys }
      for (const k of keys) {
        next[k] = true
      }
      return { newlySyncedRuleKeys: next }
    })

    // Automatically remove highlight after 2600ms
    setTimeout(() => {
      set((state) => {
        const next = { ...state.newlySyncedRuleKeys }
        for (const k of keys) {
          delete next[k]
        }
        return { newlySyncedRuleKeys: next }
      })
    }, 2600)
  },

  clearHighlight: (key: string) => {
    set((state) => {
      if (!state.newlySyncedRuleKeys[key]) return state
      const next = { ...state.newlySyncedRuleKeys }
      delete next[key]
      return { newlySyncedRuleKeys: next }
    })
  },
}))

export default useHighlightStore
