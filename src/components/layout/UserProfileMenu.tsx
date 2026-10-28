import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  Building2,
  ChevronDown,
  Globe,
  KeyRound,
  Languages,
  LogOut,
  Moon,
  Settings,
  Sun,
  User,
} from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'
import { useThemeStore } from '../../store/useThemeStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useTranslation } from '../../i18n/useTranslation'
import { cn } from '../../lib/utils'

export interface UserProfileMenuProps {
  onOpenSettings: () => void
  className?: string
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  onOpenSettings,
  className,
}) => {
  const { t, language, setLanguage } = useTranslation()
  const { theme, toggleTheme } = useThemeStore()
  const isDark = theme === 'dark'

  const email = useAuthStore((s) => s.email)
  const authType = useAuthStore((s) => s.authType)
  const accountLevelOnly = useAuthStore((s) => s.accountLevelOnly)
  const logout = useAuthStore((s) => s.logout)

  const autoRefreshInterval = useSettingsStore((s) => s.autoRefreshInterval)

  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; right: number }>({
    top: 0,
    right: 0,
  })

  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Dynamically calculate popover position relative to viewport
  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const right = Math.max(12, window.innerWidth - rect.right)
      const top = rect.bottom + 8
      setPosition({ top, right })
    }
  }, [])

  // Manage events for closing on click outside, Escape, resize and scroll
  useEffect(() => {
    if (!isOpen) return

    updatePosition()

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen, updatePosition])

  // Complete logout procedure
  const handleLogout = async () => {
    setIsOpen(false)
    logout('manual')
  }

  // Derive initial for avatar
  const initial = email ? email.trim().charAt(0).toUpperCase() : 'U'

  // Format auto-refresh interval hint
  const intervalLabel =
    autoRefreshInterval >= 60
      ? `${Math.round(autoRefreshInterval / 60)}m`
      : `${autoRefreshInterval}s`

  return (
    <div className={cn('relative inline-flex items-center', className)}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={t.profile.menuAria}
        className={cn(
          'flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl transition-all duration-200 cursor-pointer select-none',
          'backdrop-blur-md bg-white/60 dark:bg-slate-900/60 hover:bg-white/80 dark:hover:bg-slate-800/80',
          'border border-white/60 dark:border-white/10 text-slate-700 dark:text-slate-200',
          'shadow-xs active:scale-95',
          isOpen && 'ring-2 ring-[#f6821f]/50 border-[#f6821f]/60'
        )}
      >
        {/* Avatar circle with email initial */}
        <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 text-[#f6821f] font-bold text-xs">
          {email ? initial : <User className="w-3.5 h-3.5" />}
          {/* Active status indicator dot */}
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-slate-900" />
        </div>

        {/* Truncated user email */}
        <span className="hidden sm:block text-xs font-medium text-slate-800 dark:text-slate-200 max-w-[140px] truncate">
          {email || t.profile.signedInAs}
        </span>

        {/* Animated Chevron */}
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Popover Portal */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <div
                ref={menuRef}
                style={{
                  position: 'fixed',
                  top: `${position.top}px`,
                  right: `${position.right}px`,
                  zIndex: 100,
                }}
                className="w-80 max-w-[calc(100vw-24px)]"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -6 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="overflow-hidden rounded-2xl backdrop-blur-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-white/10 shadow-2xl shadow-slate-950/20 text-slate-800 dark:text-slate-100 p-3 space-y-3"
                >
                  {/* Section 1: Account & Access Info (Header) */}
                  <div className="px-2 py-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {t.profile.signedInAs}
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-white/5">
                        <KeyRound className="w-2.5 h-2.5 text-[#f6821f]" />
                        {authType === 'bearer'
                          ? t.profile.authTypeBearer
                          : t.profile.authTypeKey}
                      </span>
                    </div>

                    <div
                      className="text-sm font-semibold text-slate-900 dark:text-white truncate"
                      title={email}
                    >
                      {email}
                    </div>

                    <div>
                      {accountLevelOnly ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>{t.navbar.accountLevel}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          <Globe className="w-3.5 h-3.5" />
                          <span>{t.navbar.allZones}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-slate-200/80 dark:bg-white/10" />

                  {/* Section 2: Quick Preferences */}
                  <div className="px-2 py-1 space-y-2.5">
                    {/* Theme row */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300">
                        {isDark ? (
                          <Moon className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Sun className="w-4 h-4 text-amber-500" />
                        )}
                        {t.profile.theme}
                      </span>
                      <div className="flex items-center p-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-800/80 border border-slate-300/40 dark:border-white/5">
                        <button
                          type="button"
                          onClick={() => isDark && toggleTheme()}
                          className={cn(
                            'px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer',
                            !isDark
                              ? 'bg-white text-slate-900 shadow-xs font-bold'
                              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                          )}
                        >
                          {t.profile.light}
                        </button>
                        <button
                          type="button"
                          onClick={() => !isDark && toggleTheme()}
                          className={cn(
                            'px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer',
                            isDark
                              ? 'bg-slate-700 text-white shadow-xs font-bold'
                              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                          )}
                        >
                          {t.profile.dark}
                        </button>
                      </div>
                    </div>

                    {/* Language row */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300">
                        <Languages className="w-4 h-4 text-blue-500" />
                        {t.profile.language}
                      </span>
                      <div className="flex items-center p-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-800/80 border border-slate-300/40 dark:border-white/5">
                        <button
                          type="button"
                          onClick={() => setLanguage('en')}
                          className={cn(
                            'px-2.5 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer',
                            language === 'en'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                          )}
                        >
                          EN
                        </button>
                        <button
                          type="button"
                          onClick={() => setLanguage('pl')}
                          className={cn(
                            'px-2.5 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer',
                            language === 'pl'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                          )}
                        >
                          PL
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-slate-200/80 dark:bg-white/10" />

                  {/* Section 3: App Actions */}
                  <div className="px-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false)
                        onOpenSettings()
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer group"
                    >
                      <span className="flex items-center gap-2.5">
                        <Settings className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-transform group-hover:rotate-45" />
                        <span>{t.profile.settings}</span>
                      </span>
                      {autoRefreshInterval > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Auto: {intervalLabel}</span>
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-slate-200/80 dark:bg-white/10" />

                  {/* Section 4: Session (Logout) */}
                  <div className="px-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/15 transition-colors cursor-pointer group"
                    >
                      <LogOut className="w-4 h-4 text-rose-500 group-hover:translate-x-0.5 transition-transform" />
                      <span>{t.profile.logout}</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  )
}

export default UserProfileMenu
