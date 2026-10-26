import React, { useState, lazy, Suspense } from 'react'
import { Cloud, GitBranch } from 'lucide-react'
import { useAuthStore, selectIsAuthenticated } from '../../store/useAuthStore'
import { useTranslation } from '../../i18n/useTranslation'
import { AutoRefreshBadge } from './AutoRefreshBadge'
import { RateLimitBadge } from './RateLimitBadge'
import { UserProfileMenu } from './UserProfileMenu'
import { cn } from '../../lib/utils'

const SettingsModal = lazy(() => import('./SettingsModal'))
const ChangelogModal = lazy(() => import('./ChangelogModal'))

export interface GlassNavbarProps {
  className?: string
  title?: string
  subtitle?: string
}

export const GlassNavbar: React.FC<GlassNavbarProps> = ({
  className,
  title,
  subtitle,
}) => {
  const { t } = useTranslation()
  const displayTitle = title || t.navbar.title
  const isAuthenticated = useAuthStore(selectIsAuthenticated)

  // Settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [hasOpenedSettings, setHasOpenedSettings] = useState(false)

  // Changelog modal state
  const [isChangelogOpen, setIsChangelogOpen] = useState(false)
  const [hasOpenedChangelog, setHasOpenedChangelog] = useState(false)

  const handleOpenSettings = () => {
    setHasOpenedSettings(true)
    setIsSettingsOpen(true)
  }

  const handleOpenChangelog = () => {
    setHasOpenedChangelog(true)
    setIsChangelogOpen(true)
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full',
        'backdrop-blur-xl bg-white/70 dark:bg-slate-950/70',
        'border-b border-white/40 dark:border-white/10',
        'shadow-sm shadow-slate-900/5 transition-colors duration-300',
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left Side: Brand / Logo & Changelog Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#f6821f] to-[#ff9838] text-white shadow-md shadow-orange-500/25">
            <Cloud className="w-5 h-5 fill-current" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-slate-100">
                {displayTitle}
              </span>
              {subtitle ? (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/10 text-[#f6821f] border border-orange-500/20">
                  {subtitle}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenChangelog}
                  title={t.navbar.changelogTooltip}
                  aria-label={t.navbar.changelogTooltip}
                  className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium backdrop-blur-md bg-white/50 dark:bg-slate-900/40 hover:bg-white/80 dark:hover:bg-slate-800/60 border border-white/60 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-sm cursor-pointer transition-all active:scale-95"
                >
                  <GitBranch className="w-3 h-3 text-[#f6821f]" />
                  v{__APP_VERSION__} • {__GIT_COMMIT__}
                </button>
              )}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              {t.navbar.subtitle}
            </span>
          </div>
        </div>

        {/* Right Side: Telemetry RateLimit, Auto-Refresh countdown badge & User Profile Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Rate Limit telemetry badge */}
          <RateLimitBadge className="hidden md:inline-flex" />

          {/* Auto-Refresh countdown badge */}
          <AutoRefreshBadge
            onClick={handleOpenSettings}
            className="hidden sm:inline-flex"
          />

          {/* Unified Profile & Preferences dropdown menu */}
          {isAuthenticated && (
            <UserProfileMenu onOpenSettings={handleOpenSettings} />
          )}
        </div>
      </div>

      {/* Application settings modal loaded asynchronously via Suspense */}
      {hasOpenedSettings && (
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />
        </Suspense>
      )}

      {/* Changelog history modal loaded asynchronously via Suspense */}
      {hasOpenedChangelog && (
        <Suspense fallback={null}>
          <ChangelogModal
            isOpen={isChangelogOpen}
            onClose={() => setIsChangelogOpen(false)}
          />
        </Suspense>
      )}
    </header>
  )
}

export default GlassNavbar
