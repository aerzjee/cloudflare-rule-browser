import React, { useEffect } from 'react'
import { Activity, Clock } from 'lucide-react'
import { useAuthStore, selectIsAuthenticated } from '../../store/useAuthStore'
import { useRateLimitStore } from '../../store/useRateLimitStore'
import { pingRateLimit } from '../../api/cfClient'
import { useTranslation } from '../../i18n/useTranslation'
import { cn } from '../../lib/utils'

export interface RateLimitBadgeProps {
  className?: string
}

export const RateLimitBadge: React.FC<RateLimitBadgeProps> = ({ className }) => {
  const { t } = useTranslation()
  const isAuthenticated = useAuthStore(selectIsAuthenticated)

  const remaining = useRateLimitStore((s) => s.remaining)
  const limit = useRateLimitStore((s) => s.limit)
  const resetSeconds = useRateLimitStore((s) => s.resetSeconds)
  const isThrottled = useRateLimitStore((s) => s.isThrottled)
  const throttleRemainingSeconds = useRateLimitStore((s) => s.throttleRemainingSeconds)
  const throttleReason = useRateLimitStore((s) => s.throttleReason)

  // Smart Polling: ping every 10 seconds if idle for at least 9 seconds, never ping when throttled
  useEffect(() => {
    if (!isAuthenticated) return

    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return
      }

      const { lastUpdatedAt, isThrottled: currentThrottled, remaining: currentRemaining } =
        useRateLimitStore.getState()
      if (currentThrottled || currentRemaining < 15) {
        return
      }

      const now = Date.now()
      // Only ping if at least 9000ms have elapsed since the last response header update
      if (!lastUpdatedAt || now - lastUpdatedAt >= 9000) {
        void pingRateLimit()
      }
    }, 10000)

    return () => clearInterval(intervalId)
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return null
  }

  // Calculate percentage and dynamic progress color
  const effectiveLimit = limit > 0 ? limit : 1200
  const ratio = Math.max(0, Math.min(1, remaining / effectiveLimit))
  const percentage = Math.round(ratio * 100)

  let progressColor = 'bg-emerald-500'
  let textColor = 'text-emerald-600 dark:text-emerald-400'

  if (ratio < 0.2 || remaining < 240) {
    progressColor = 'bg-rose-500 animate-pulse'
    textColor = 'text-rose-600 dark:text-rose-400'
  } else if (ratio <= 0.5 || remaining <= 600) {
    progressColor = 'bg-amber-500'
    textColor = 'text-amber-600 dark:text-amber-400'
  }

  return (
    <div className={cn('relative group inline-flex items-center', className)}>
      <div
        className={cn(
          'inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-mono font-semibold',
          'backdrop-blur-md shadow-xs select-none transition-all duration-200',
          isThrottled
            ? 'bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400 animate-pulse'
            : 'bg-white/50 dark:bg-slate-900/40 border border-white/60 dark:border-white/10 text-slate-700 dark:text-slate-300'
        )}
      >
        {isThrottled ? (
          <>
            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="font-bold text-xs text-amber-600 dark:text-amber-400">
              {t.rateLimit.rateLimitThrottledBadge.replace(
                '{seconds}',
                String(throttleRemainingSeconds)
              )}
            </span>
          </>
        ) : (
          <>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              {t.rateLimit.badge}:
            </span>

            <span className={cn('tabular-nums font-bold text-xs', textColor)}>
              {remaining}
              <span className="text-slate-400 dark:text-slate-500 font-normal"> / {effectiveLimit}</span>
            </span>

            {/* Horizontal Mini Progress Bar */}
            <div className="w-16 sm:w-20 h-1.5 rounded-full overflow-hidden bg-slate-200/80 dark:bg-slate-700/80">
              <div
                className={cn('h-full transition-all duration-500 ease-out rounded-full', progressColor)}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* Glass tooltip popup on hover */}
      <div className="pointer-events-none absolute top-full mt-2.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 transition-all opacity-0 group-hover:opacity-100 duration-200">
        <div className="w-2 h-2 rotate-45 bg-slate-900/90 dark:bg-slate-800/95 border-t border-l border-white/20 -mb-1" />
        <div className="w-56 p-2.5 rounded-xl text-center backdrop-blur-xl bg-slate-900/90 dark:bg-slate-800/95 border border-white/20 text-white shadow-xl space-y-1.5">
          {isThrottled ? (
            <>
              <div className="text-[10px] font-semibold tracking-wider uppercase text-amber-400">
                {throttleReason === 'http_429'
                  ? 'HTTP 429 Too Many Requests'
                  : 'Preemptive Throttling'}
              </div>
              <div className="font-mono text-xs font-bold text-white">
                {t.rateLimitWaiting.replace('{seconds}', String(throttleRemainingSeconds))}
              </div>
            </>
          ) : (
            <>
              <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">
                {t.rateLimit.tooltipTitle}
              </div>
              <div className="font-mono text-xs font-bold text-white">
                {t.rateLimit.requestsRemaining(remaining, effectiveLimit)}
              </div>
              <div className="text-[11px] text-slate-300 font-mono flex items-center justify-center gap-1.5 pt-1 border-t border-white/10">
                <Activity className="w-3 h-3 text-[#f6821f]" />
                <span>
                  {resetSeconds > 0
                    ? t.rateLimit.resetIn(resetSeconds)
                    : t.rateLimit.window5m}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default RateLimitBadge
