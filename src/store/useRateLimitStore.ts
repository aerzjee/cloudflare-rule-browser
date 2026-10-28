import { create } from 'zustand'

export interface RateLimitState {
  /** Remaining API requests in the current quota window */
  remaining: number
  /** Maximum quota limit for the window (default 1200 per 5 min) */
  limit: number
  /** Remaining seconds until the rate limit window resets */
  resetSeconds: number
  /** Timestamp Date.now() of the last received rate limit header */
  lastUpdatedAt: number | null
  /** Whether the request queue is actively throttled/paused */
  isThrottled: boolean
  /** Countdown seconds remaining until requests can resume */
  throttleRemainingSeconds: number
  /** Reason for the active throttle */
  throttleReason: 'preemptive' | 'http_429' | null
}

export interface RateLimitActions {
  /**
   * Parse Cloudflare API rate limit headers:
   * `ratelimit`: "default";r=1193;t=2
   * `ratelimit-policy`: "default";q=1200;w=300
   */
  updateFromHeaders: (headers: Headers) => void
  /**
   * Set active throttle countdown with reason
   */
  setThrottleCountdown: (seconds: number, reason: 'preemptive' | 'http_429') => void
  /**
   * Clear active throttle state and restore safe remaining quota
   */
  clearThrottle: () => void
}

export const useRateLimitStore = create<RateLimitState & RateLimitActions>((set) => ({
  remaining: 1200,
  limit: 1200,
  resetSeconds: 0,
  lastUpdatedAt: null,
  isThrottled: false,
  throttleRemainingSeconds: 0,
  throttleReason: null,

  setThrottleCountdown: (seconds: number, reason: 'preemptive' | 'http_429') => {
    set({
      isThrottled: seconds > 0,
      throttleRemainingSeconds: Math.max(0, seconds),
      throttleReason: seconds > 0 ? reason : null,
    })
  },

  clearThrottle: () => {
    set((prev) => ({
      isThrottled: false,
      throttleRemainingSeconds: 0,
      throttleReason: null,
      remaining: Math.max(prev.remaining, prev.limit || 1200),
      resetSeconds: 0,
    }))
  },

  updateFromHeaders: (headers: Headers) => {
    const rateLimitHeader = headers.get('ratelimit')
    const rateLimitPolicyHeader = headers.get('ratelimit-policy')

    if (!rateLimitHeader && !rateLimitPolicyHeader) {
      return
    }

    let parsedRemaining: number | undefined
    let parsedResetSeconds: number | undefined
    let parsedLimit: number | undefined

    if (rateLimitHeader) {
      const rMatch = rateLimitHeader.match(/r=(\d+)/i)
      if (rMatch && rMatch[1]) {
        parsedRemaining = Number.parseInt(rMatch[1], 10)
      }

      const tMatch = rateLimitHeader.match(/t=(\d+)/i)
      if (tMatch && tMatch[1]) {
        parsedResetSeconds = Number.parseInt(tMatch[1], 10)
      }
    }

    if (rateLimitPolicyHeader) {
      const qMatch = rateLimitPolicyHeader.match(/q=(\d+)/i)
      if (qMatch && qMatch[1]) {
        parsedLimit = Number.parseInt(qMatch[1], 10)
      }
    }

    set((prev) => ({
      remaining: parsedRemaining !== undefined ? parsedRemaining : prev.remaining,
      limit: parsedLimit !== undefined ? parsedLimit : (prev.limit || 1200),
      resetSeconds: parsedResetSeconds !== undefined ? parsedResetSeconds : prev.resetSeconds,
      lastUpdatedAt: Date.now(),
    }))
  },
}))
