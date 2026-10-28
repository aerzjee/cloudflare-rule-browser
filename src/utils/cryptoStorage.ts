import type { StateStorage } from 'zustand/middleware'

const STORAGE_KEY_PREFIX = 'cf-auth'

/**
 * Simple XOR-based obfuscation for localStorage values.
 * This is NOT cryptographic encryption — it prevents casual inspection
 * and accidental token leaks in DevTools / logs / error reports.
 */
const OBF_KEY = 0xca // single-byte XOR mask

function obfuscate(plain: string): string {
  const bytes = new TextEncoder().encode(plain)
  const out = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] ^ OBF_KEY
  }
  // base64-encode the result so it's safe for localStorage
  return btoa(String.fromCharCode(...out))
}

function deobfuscate(encoded: string): string {
  const raw = atob(encoded)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i) ^ OBF_KEY
  }
  return new TextDecoder().decode(bytes)
}

/**
 * Zustand-compatible `StateStorage` that obfuscates the persisted
 * JSON blob so tokens / emails never appear in plaintext in
 * storage, DevTools, log files, or error reports.
 *
 * Supports volatile session storage (sessionStorage) by default,
 * switching to persistent localStorage only when `rememberSession === true`.
 */
export const cryptoStorage: StateStorage = {
  getItem(name: string): string | null {
    if (typeof window === 'undefined') return null
    const key = `${STORAGE_KEY_PREFIX}:${name}`
    try {
      // 1. Check sessionStorage first (active volatile session)
      const sessionRaw = window.sessionStorage?.getItem(key)
      if (sessionRaw !== null) {
        return deobfuscate(sessionRaw)
      }
      // 2. Fallback to localStorage (persistent session)
      const localRaw = window.localStorage?.getItem(key)
      if (localRaw !== null) {
        return deobfuscate(localRaw)
      }
      return null
    } catch {
      // Corrupted data — wipe both storages so the store safely resets
      try {
        window.sessionStorage?.removeItem(key)
        window.localStorage?.removeItem(key)
      } catch {
        // Ignore storage access errors
      }
      return null
    }
  },

  setItem(name: string, value: string): void {
    if (typeof window === 'undefined') return
    const key = `${STORAGE_KEY_PREFIX}:${name}`
    try {
      let rememberSession = false
      try {
        const parsed = JSON.parse(value)
        rememberSession = Boolean(parsed?.state?.rememberSession)
      } catch {
        // Fallback to volatile session
      }

      const obfuscated = obfuscate(value)

      if (rememberSession) {
        window.localStorage?.setItem(key, obfuscated)
        window.sessionStorage?.removeItem(key)
      } else {
        window.sessionStorage?.setItem(key, obfuscated)
        window.localStorage?.removeItem(key)
      }
    } catch (err) {
      console.warn('[cryptoStorage] Could not persist session:', err)
    }
  },

  removeItem(name: string): void {
    if (typeof window === 'undefined') return
    const key = `${STORAGE_KEY_PREFIX}:${name}`
    try {
      window.sessionStorage?.removeItem(key)
      window.localStorage?.removeItem(key)
    } catch {
      // Ignore storage access errors
    }
  },
}

/**
 * Override `console.*` serialisation for the auth state so that
 * tokens are never accidentally printed.
 */
export function redactForLogging(state: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...state }
  if (typeof copy.token === 'string' && copy.token.length > 0) {
    copy.token = `***${(copy.token as string).slice(-4)}`
  }
  return copy
}

export default cryptoStorage
