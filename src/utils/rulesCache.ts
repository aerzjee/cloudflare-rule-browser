import { get, set, del, clear } from 'idb-keyval'
import type { NormalizedAccessRule } from '../types/cloudflare'
import { clearTrashRules } from '../store/useTrashStore'

export const getCacheKey = (accountLevelOnly: boolean): string =>
  'cf-rules-cache-' + (accountLevelOnly ? 'account' : 'zones')

/**
 * Retrieves cached access rules from IndexedDB for a given mode (account or zones).
 * Returns null if no cached data exists or if a read error occurs.
 */
export async function getCachedRules(
  accountLevelOnly: boolean
): Promise<NormalizedAccessRule[] | null> {
  if (typeof window === 'undefined') return null

  try {
    const key = getCacheKey(accountLevelOnly)
    const cached = await get<NormalizedAccessRule[]>(key)
    if (Array.isArray(cached) && cached.length > 0) {
      return cached
    }
    return null
  } catch (error) {
    console.warn('[rulesCache] Error reading from IndexedDB:', error)
    return null
  }
}

/**
 * Persists an array of rules to IndexedDB under the appropriate mode key.
 */
export async function setCachedRules(
  accountLevelOnly: boolean,
  rules: NormalizedAccessRule[]
): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const key = getCacheKey(accountLevelOnly)
    await set(key, rules)
  } catch (error) {
    console.warn('[rulesCache] Error writing to IndexedDB:', error)
  }
}

/**
 * Removes cached rules for a specific mode (e.g. prior to a forced refresh).
 */
export async function clearCachedRules(accountLevelOnly: boolean): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const key = getCacheKey(accountLevelOnly)
    await del(key)
  } catch (error) {
    console.warn('[rulesCache] Error deleting key from IndexedDB:', error)
  }
}

/**
 * Clears all cached rules across all modes from IndexedDB (e.g. on logout).
 */
export async function clearAllCachedRules(): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    await del(getCacheKey(true))
    await del(getCacheKey(false))
    await clearTrashRules()
    await clear()
  } catch (error) {
    console.warn('[rulesCache] Error clearing IndexedDB:', error)
  }
}
