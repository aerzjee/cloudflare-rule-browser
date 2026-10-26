import { create } from 'zustand'

export interface HighlightState {
  /** Map of row keys (e.g. `account-${accountId}-${id}`) that were recently synced */
  newlySyncedRuleKeys: Record<string, boolean>
  /** Map of row keys currently playing their exit animation before DOM purge */
  removingRuleKeys: Record<string, boolean>
  /** Highlight newly added/synced rule keys for 2600ms */
  highlightNewRules: (keys: string[]) => void
  /** Clear highlight for a specific rule key immediately */
  clearHighlight: (key: string) => void
  /** Mark row keys as currently removing to trigger exit animation */
  markRulesAsRemoving: (keys: string[]) => void
  /** Clear removing state for the specified keys */
  clearRemovingRules: (keys: string[]) => void
}

export const useHighlightStore = create<HighlightState>((set) => ({
  newlySyncedRuleKeys: {},
  removingRuleKeys: {},

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

  markRulesAsRemoving: (keys: string[]) => {
    if (!keys || keys.length === 0) return

    set((state) => {
      const next = { ...state.removingRuleKeys }
      for (const k of keys) {
        next[k] = true
      }
      return { removingRuleKeys: next }
    })
  },

  clearRemovingRules: (keys: string[]) => {
    if (!keys || keys.length === 0) return

    set((state) => {
      const next = { ...state.removingRuleKeys }
      for (const k of keys) {
        delete next[k]
      }
      return { removingRuleKeys: next }
    })
  },
}))

export default useHighlightStore
