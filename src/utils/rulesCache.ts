import { get, set, del, clear } from 'idb-keyval'
import type { NormalizedAccessRule } from '../types/cloudflare'

export const getCacheKey = (accountLevelOnly: boolean): string =>
  'cf-rules-cache-' + (accountLevelOnly ? 'account' : 'zones')

/**
 * Pobiera zcache'owane reguły z IndexedDB dla danego trybu (account lub zones).
 * Zwraca null jeśli brak danych lub błąd odczytu.
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
    console.warn('[rulesCache] Błąd odczytu z IndexedDB:', error)
    return null
  }
}

/**
 * Zapisuje tablicę reguł w IndexedDB pod odpowiednim kluczem trybu.
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
    console.warn('[rulesCache] Błąd zapisu do IndexedDB:', error)
  }
}

/**
 * Usuwa zcache'owane reguły dla konkretnego trybu (np. przed wymuszonym odświeżeniem).
 */
export async function clearCachedRules(accountLevelOnly: boolean): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const key = getCacheKey(accountLevelOnly)
    await del(key)
  } catch (error) {
    console.warn('[rulesCache] Błąd usuwania klucza z IndexedDB:', error)
  }
}

/**
 * Czyści cały cache reguł w IndexedDB (np. przy wylogowaniu).
 */
export async function clearAllCachedRules(): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    await del(getCacheKey(true))
    await del(getCacheKey(false))
    await clear()
  } catch (error) {
    console.warn('[rulesCache] Błąd czyszczenia IndexedDB:', error)
  }
}
