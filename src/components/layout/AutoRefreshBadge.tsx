import React, { useState, useEffect } from 'react'
import { Clock, RefreshCw } from 'lucide-react'
import { useAuthStore, selectIsAuthenticated } from '../../store/useAuthStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useTranslation } from '../../i18n/useTranslation'
import { cn } from '../../lib/utils'

export interface AutoRefreshBadgeProps {
  onClick?: () => void
  className?: string
}

function formatCountdown(seconds: number): string {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  return `${seconds}s`
}

function formatLastRefreshTime(timestamp: number | null, lang: 'en' | 'pl', neverLabel: string): string {
  if (!timestamp) return neverLabel
  return new Date(timestamp).toLocaleTimeString(lang === 'pl' ? 'pl-PL' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export const AutoRefreshBadge: React.FC<AutoRefreshBadgeProps> = ({
  onClick,
  className,
}) => {
  const { t, language } = useTranslation()
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const autoRefreshInterval = useSettingsStore((s) => s.autoRefreshInterval)
  const autoRefreshMode = useSettingsStore((s) => s.autoRefreshMode)
  const lastRefreshAt = useSettingsStore((s) => s.lastRefreshAt)
  const nextRefreshAt = useSettingsStore((s) => s.nextRefreshAt)
  const isAutoRefreshing = useSettingsStore((s) => s.isAutoRefreshing)

  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => clearInterval(intervalId)
  }, [])

  // Render only when user is authenticated and auto-refresh interval > 0
  if (!isAuthenticated || autoRefreshInterval <= 0) {
    return null
  }

  const remainingSeconds = nextRefreshAt
    ? Math.max(0, Math.ceil((nextRefreshAt - now) / 1000))
    : autoRefreshInterval

  // Show spinning Sync... ONLY when background sync is actively executing
  const isSyncing = isAutoRefreshing
  const formattedLast = formatLastRefreshTime(lastRefreshAt, language, t.autoRefresh.never)
  const modeLabel =
    autoRefreshMode === 'first_page' ? t.autoRefresh.quickSync : t.autoRefresh.fullSync

  const titleTooltip = `${t.autoRefresh.lastRefresh(formattedLast)}\n${t.autoRefresh.mode(modeLabel)}\n${
    isSyncing ? t.autoRefresh.syncing : t.autoRefresh.nextIn(remainingSeconds)
  }\n${t.autoRefresh.openConfig}`

  return (
    <div className={cn('relative group inline-flex items-center', className)}>
      <button
        type="button"
        onClick={onClick}
        title={titleTooltip}
        aria-label={t.autoRefresh.openConfig}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold',
          'backdrop-blur-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
          'hover:bg-emerald-500/20 transition-all duration-200 cursor-pointer shadow-xs active:scale-95'
        )}
      >
        {isSyncing ? (
          <>
            <RefreshCw className="w-3 h-3 animate-spin text-emerald-500 shrink-0" />
            <span className="tabular-nums tracking-tight">{t.autoRefresh.syncing}</span>
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="tabular-nums tracking-tight">
              {t.autoRefresh.auto} {formatCountdown(remainingSeconds)}
            </span>
          </>
        )}
      </button>

      {/* Glass tooltip popup on hover */}
      <div className="pointer-events-none absolute top-full mt-2.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 transition-all opacity-0 group-hover:opacity-100 duration-200">
        <div className="w-2 h-2 -mb-1 rotate-45 border-l border-t border-white/60 dark:border-white/10 bg-white/95 dark:bg-slate-900/95" />
        <div className="px-3 py-2 rounded-xl text-center whitespace-nowrap shadow-xl border border-white/60 dark:border-white/10 backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 text-xs leading-normal space-y-1">
          <div className="font-semibold flex items-center gap-1.5 justify-center text-slate-900 dark:text-white">
            <Clock className="w-3.5 h-3.5 text-[#f6821f]" />
            <span>{t.autoRefresh.lastRefresh(formattedLast)}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            {t.autoRefresh.mode('')}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {modeLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AutoRefreshBadge
