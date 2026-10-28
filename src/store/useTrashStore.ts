import { create } from 'zustand'
import { get, set, del } from 'idb-keyval'
import type { NormalizedAccessRule } from '../types/cloudflare'
import { getRuleUniqueKey } from '../api/accessRules'

export const TRASH_STORAGE_KEY = 'cf-rules-trash'
export const TRASH_MAX_ITEMS = 50

export interface DeletedRuleEntry {
  rule: NormalizedAccessRule
  deletedAt: string
}

export interface TrashState {
  trashRules: DeletedRuleEntry[]
  isLoading: boolean
  loadTrash: () => Promise<void>
  addRulesToTrash: (rules: NormalizedAccessRule[]) => Promise<void>
  removeRulesFromTrash: (ruleIds: string[]) => Promise<void>
  emptyTrash: () => Promise<void>
}

/**
 * Low-level utility to retrieve trash entries from IndexedDB.
 */
export async function getTrashRulesFromDb(): Promise<DeletedRuleEntry[]> {
  if (typeof window === 'undefined') return []
  try {
    const cached = await get<DeletedRuleEntry[]>(TRASH_STORAGE_KEY)
    return Array.isArray(cached) ? cached : []
  } catch (error) {
    console.warn('[useTrashStore] Error reading trash from IndexedDB:', error)
    return []
  }
}

/**
 * Permanently clears all trash records from IndexedDB and resets Zustand state.
 * Crucial for Zero-Trace Logout on session termination or inactivity auto-lock.
 */
export async function clearTrashRules(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    await del(TRASH_STORAGE_KEY)
    useTrashStore.setState({ trashRules: [], isLoading: false })
  } catch (error) {
    console.warn('[useTrashStore] Error deleting trash from IndexedDB:', error)
  }
}

export const useTrashStore = create<TrashState>((setStore, getStore) => ({
  trashRules: [],
  isLoading: false,

  loadTrash: async () => {
    setStore({ isLoading: true })
    try {
      const items = await getTrashRulesFromDb()
      setStore({ trashRules: items, isLoading: false })
    } catch {
      setStore({ isLoading: false })
    }
  },

  addRulesToTrash: async (rules: NormalizedAccessRule[]) => {
    if (!rules || rules.length === 0) return

    const now = new Date().toISOString()
    const newEntries: DeletedRuleEntry[] = rules.map((r) => ({
      rule: r,
      deletedAt: now,
    }))

    const current = getStore().trashRules
    const newKeys = new Set(newEntries.map((e) => getRuleUniqueKey(e.rule)))

    // Prepend new deletions, deduplicate by unique key, and cap at TRASH_MAX_ITEMS
    const merged = [
      ...newEntries,
      ...current.filter((e) => !newKeys.has(getRuleUniqueKey(e.rule))),
    ].slice(0, TRASH_MAX_ITEMS)

    setStore({ trashRules: merged })

    try {
      await set(TRASH_STORAGE_KEY, merged)
    } catch (err) {
      console.warn('[useTrashStore] Error saving trash to IndexedDB:', err)
    }
  },

  removeRulesFromTrash: async (ruleIds: string[]) => {
    if (!ruleIds || ruleIds.length === 0) return

    const idSet = new Set(ruleIds)
    const next = getStore().trashRules.filter((e) => !idSet.has(e.rule.id))

    setStore({ trashRules: next })

    try {
      await set(TRASH_STORAGE_KEY, next)
    } catch (err) {
      console.warn('[useTrashStore] Error updating trash in IndexedDB:', err)
    }
  },

  emptyTrash: async () => {
    setStore({ trashRules: [] })
    try {
      await del(TRASH_STORAGE_KEY)
    } catch (err) {
      console.warn('[useTrashStore] Error clearing trash in IndexedDB:', err)
    }
  },
}))

// Auto-hydrate trash from IndexedDB when store module loads
if (typeof window !== 'undefined') {
  void useTrashStore.getState().loadTrash()
}
