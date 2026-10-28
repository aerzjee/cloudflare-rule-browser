import { useEffect, useRef } from 'react'
import { useAuthStore, selectIsAuthenticated } from '../store/useAuthStore'
import { useSettingsStore } from '../store/useSettingsStore'

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
]

/**
 * Automatically logs out the user after a configured period of inactivity (Auto-Lock).
 * When inactivity timeout is exceeded, all credentials, local caches and state are purged.
 */
export function useInactivityLogout(): void {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const logout = useAuthStore((s) => s.logout)
  const inactivityTimeout = useSettingsStore((s) => s.inactivityTimeout)

  const lastActivityRef = useRef<number>(0)
  const lastRecordedEventRef = useRef<number>(0)

  useEffect(() => {
    if (!isAuthenticated || inactivityTimeout <= 0) {
      return
    }

    const timeoutMs = inactivityTimeout * 60 * 1000
    lastActivityRef.current = Date.now()

    // Throttled activity listener (records at most once every 2000ms)
    const handleActivity = () => {
      const now = Date.now()
      if (now - lastRecordedEventRef.current >= 2000) {
        lastRecordedEventRef.current = now
        lastActivityRef.current = now
      }
    }

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleActivity, { passive: true })
    }

    // Periodic check every 5 seconds to catch elapsed inactivity even across tab pauses
    const intervalId = window.setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current
      if (elapsed >= timeoutMs) {
        window.clearInterval(intervalId)
        logout('inactivity')
      }
    }, 5000)

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, handleActivity)
      }
      window.clearInterval(intervalId)
    }
  }, [isAuthenticated, inactivityTimeout, logout])
}

export default useInactivityLogout
