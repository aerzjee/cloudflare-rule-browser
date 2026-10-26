import React, { useState, lazy, Suspense } from 'react'
import {
  Cloud,
  Moon,
  Sun,
  Shield,
  Activity,
  LogOut,
  User,
  Globe,
  Building2,
  GitBranch,
  Settings,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useThemeStore } from '../../store/useThemeStore'
import { useAuthStore, selectIsAuthenticated } from '../../store/useAuthStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useTranslation } from '../../i18n/useTranslation'
import { clearAllCachedRules } from '../../utils/rulesCache'
import { GlassButton } from '../ui/GlassButton'
import { GlassSwitch } from '../ui/GlassSwitch'
import { AutoRefreshBadge } from './AutoRefreshBadge'
import { RateLimitBadge } from './RateLimitBadge'
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
  const { t, language, setLanguage } = useTranslation()
  const displayTitle = title || t.navbar.title
  const { theme, toggleTheme } = useThemeStore()
  const isDark = theme === 'dark'

  const email = useAuthStore((s) => s.email)
  const accountLevelOnly = useAuthStore((s) => s.accountLevelOnly)
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const logout = useAuthStore((s) => s.logout)
  const queryClient = useQueryClient()

  // Settings modal state and auto-refresh subscription
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [hasOpenedSettings, setHasOpenedSettings] = useState(false)
  const autoRefreshInterval = useSettingsStore((s) => s.autoRefreshInterval)
  const autoRefreshMode = useSettingsStore((s) => s.autoRefreshMode)

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

  const formatIntervalLabel = (sec: number): string => {
    if (sec >= 60) return `${Math.round(sec / 60)}m`
    return `${sec}s`
  }

  const handleLogout = async () => {
    try {
      await clearAllCachedRules()
    } catch (err) {
      console.warn('Error clearing cache on logout:', err)
    }
    logout()
    queryClient.clear()
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
        {/* Brand / Logo */}
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

        {/* Center / Status Pill — show user email & auth mode when logged in */}
        {isAuthenticated ? (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md bg-white/50 dark:bg-slate-900/40 border border-white/60 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400">
            <User className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-medium text-slate-800 dark:text-slate-200 max-w-[200px] truncate">
              {email}
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            {accountLevelOnly ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold">
                <Building2 className="w-3 h-3" />
                {t.navbar.accountLevel}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-semibold">
                <Globe className="w-3 h-3" />
                {t.navbar.allZones}
              </span>
            )}
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md bg-white/50 dark:bg-slate-900/40 border border-white/60 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-mono text-[11px]">{t.navbar.proxyStatus}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <Shield className="w-3 h-3 text-orange-500" /> {t.navbar.secureCsp}
            </span>
          </div>
        )}

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Language Switcher EN | PL */}
          <div
            role="group"
            aria-label={t.navbar.language}
            className="flex items-center p-0.5 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md border border-white/40 dark:border-white/10 text-xs font-semibold"
          >
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={cn(
                'px-2 py-1 rounded-lg transition-all cursor-pointer font-mono text-[11px]',
                language === 'en'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              )}
              aria-label="Switch to English"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('pl')}
              className={cn(
                'px-2 py-1 rounded-lg transition-all cursor-pointer font-mono text-[11px]',
                language === 'pl'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              )}
              aria-label="Przełącz na język polski"
            >
              PL
            </button>
          </div>

          {/* Rate Limit telemetry badge */}
          <RateLimitBadge className="hidden md:inline-flex" />

          {/* Settings button with optional auto-refresh indicator badge */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleOpenSettings}
              title={
                autoRefreshInterval > 0
                  ? t.navbar.settingsTooltipWithRefresh(
                      formatIntervalLabel(autoRefreshInterval),
                      autoRefreshMode === 'first_page' ? 'Delta' : 'Full'
                    )
                  : t.navbar.settingsTooltip
              }
              aria-label={t.navbar.settingsTooltip}
              className={cn(
                'relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 cursor-pointer',
                'backdrop-blur-md bg-slate-200/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/80',
                'border border-white/40 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white',
                'shadow-sm active:scale-95'
              )}
            >
              <Settings className="w-4 h-4 transition-transform hover:rotate-45" />

              {/* Subtle pulsing badge for active auto-refresh */}
              {autoRefreshInterval > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
            </button>

            {/* Isolated component displaying real-time countdown to next refresh */}
            <AutoRefreshBadge
              onClick={handleOpenSettings}
              className="hidden lg:inline-flex"
            />
          </div>

          {/* Theme Segmented Control (desktop) */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md p-1 rounded-xl border border-white/40 dark:border-white/10">
            <button
              type="button"
              onClick={() => isDark && toggleTheme()}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer',
                !isDark
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              {t.navbar.light}
            </button>
            <button
              type="button"
              onClick={() => !isDark && toggleTheme()}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer',
                isDark
                  ? 'bg-slate-700/80 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              {t.navbar.dark}
            </button>
          </div>

          {/* Quick GlassSwitch toggle for mobile */}
          <div className="sm:hidden flex items-center">
            <GlassSwitch
              checked={isDark}
              onChange={toggleTheme}
              size="sm"
              iconOn={<Moon className="w-3 h-3 text-indigo-400" />}
              iconOff={<Sun className="w-3 h-3 text-amber-500" />}
              aria-label={t.navbar.toggleTheme}
            />
          </div>

          {/* Logout button — only when authenticated */}
          {isAuthenticated && (
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              leftIcon={<LogOut className="w-4 h-4" />}
              className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-500/10 dark:hover:bg-red-500/10"
            >
              <span className="hidden sm:inline">{t.navbar.logout}</span>
            </GlassButton>
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
