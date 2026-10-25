import React from 'react'
import { Cloud, Moon, Sun, Shield, Activity } from 'lucide-react'
import { useThemeStore } from '../../store/useThemeStore'
import { GlassButton } from '../ui/GlassButton'
import { GlassSwitch } from '../ui/GlassSwitch'
import { cn } from '../../lib/utils'

export interface GlassNavbarProps {
  className?: string
  title?: string
  subtitle?: string
}

export const GlassNavbar: React.FC<GlassNavbarProps> = ({
  className,
  title = 'Cloudflare Rule Browser',
  subtitle = 'v1.0.0',
}) => {
  const { theme, toggleTheme } = useThemeStore()
  const isDark = theme === 'dark'

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
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#f6821f] to-[#ff9838] text-white shadow-md shadow-orange-500/25">
            <Cloud className="w-5 h-5 fill-current" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-slate-100">
                {title}
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/10 text-[#f6821f] border border-orange-500/20">
                {subtitle}
              </span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              WAF, Page Shield, Firewall & Cache Rules Inspector
            </span>
          </div>
        </div>

        {/* Center / Status Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md bg-white/50 dark:bg-slate-900/40 border border-white/60 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400">
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
          <span className="font-mono text-[11px]">Proxy: /api/cf</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <Shield className="w-3 h-3 text-orange-500" /> Secure CSP
          </span>
        </div>

        {/* Right Controls: Theme Switch */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md p-1 rounded-xl border border-white/40 dark:border-white/10">
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
              Light
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
              Dark
            </button>
          </div>

          {/* Quick GlassSwitch toggle for mobile or compact view */}
          <div className="sm:hidden flex items-center">
            <GlassSwitch
              checked={isDark}
              onChange={toggleTheme}
              size="sm"
              iconOn={<Moon className="w-3 h-3 text-indigo-400" />}
              iconOff={<Sun className="w-3 h-3 text-amber-500" />}
              aria-label="Toggle dark/light mode"
            />
          </div>

          <GlassButton
            variant="glass"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={toggleTheme}
            leftIcon={
              isDark ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-500" />
              )
            }
          >
            {isDark ? 'Tryb jasny' : 'Tryb ciemny'}
          </GlassButton>
        </div>
      </div>
    </header>
  )
}

export default GlassNavbar
