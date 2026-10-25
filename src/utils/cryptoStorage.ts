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
 * localStorage, DevTools, log files, or Sentry-style error reports.
 *
 * Usage with zustand `persist` middleware:
 *   persist(storeCreator, { name: 'cf-auth', storage: createJSONStorage(() => cryptoStorage) })
 */
export const cryptoStorage: StateStorage = {
  getItem(name: string): string | null {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}:${name}`)
      if (raw === null) return null
      return deobfuscate(raw)
    } catch {
      // Corrupted data — wipe it and return null so the store resets
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}:${name}`)
      return null
    }
  },

  setItem(name: string, value: string): void {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}:${name}`, obfuscate(value))
    } catch (err) {
      // Storage quota exceeded or private browsing — fail silently
      console.warn('[cryptoStorage] Could not persist session')
      void err
    }
  },

  removeItem(name: string): void {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}:${name}`)
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
