import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  Settings,
  Cpu,
  Clock,
  Zap,
  RefreshCw,
  Info,
  RotateCcw,
  X,
  Check,
  Languages,
  Sparkles,
  Server,
  ShieldAlert,
} from 'lucide-react'
import {
  useSettingsStore,
  DEFAULT_SETTINGS,
  type AutoRefreshMode,
  type AppLanguage,
} from '../../store/useSettingsStore'
import { useAuthStore } from '../../store/useAuthStore'
import { useTranslation } from '../../i18n/useTranslation'
import { translations } from '../../i18n/translations'
import { GlassButton } from '../ui/GlassButton'
import { GlassCard } from '../ui/GlassCard'
import { GlassInput } from '../ui/GlassInput'
import { cn } from '../../lib/utils'

export interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const CONCURRENCY_OPTIONS = [1, 2, 3, 4, 5, 6]

/**
 * Inner modal dialog mounted when isOpen is true.
 * Automatically initializes draft states on mount without cascading renders.
 */
function SettingsModalDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()

  // Live values from store
  const liveConcurrency = useSettingsStore((s) => s.concurrency)
  const liveAutoRefreshInterval = useSettingsStore((s) => s.autoRefreshInterval)
  const liveAutoRefreshMode = useSettingsStore((s) => s.autoRefreshMode)
  const liveLanguage = useSettingsStore((s) => s.language)
  const liveInactivityTimeout = useSettingsStore((s) => s.inactivityTimeout)
  const updateSettings = useSettingsStore((s) => s.updateSettings)

  const liveProxyUrl = useAuthStore((s) => s.proxyUrl)
  const setProxyUrl = useAuthStore((s) => s.setProxyUrl)

  // Local draft states initialized once on mount
  const [draftConcurrency, setDraftConcurrency] = useState<number>(liveConcurrency)
  const [draftAutoRefreshInterval, setDraftAutoRefreshInterval] = useState<number>(liveAutoRefreshInterval)
  const [draftAutoRefreshMode, setDraftAutoRefreshMode] = useState<AutoRefreshMode>(liveAutoRefreshMode)
  const [draftLanguage, setDraftLanguage] = useState<AppLanguage>(liveLanguage)
  const [draftInactivityTimeout, setDraftInactivityTimeout] = useState<number>(liveInactivityTimeout)
  const [draftProxyUrl, setDraftProxyUrl] = useState<string>(liveProxyUrl || '/api/cf')

  // Track if any changes have been made
  const isDirty =
    draftConcurrency !== liveConcurrency ||
    draftAutoRefreshInterval !== liveAutoRefreshInterval ||
    draftAutoRefreshMode !== liveAutoRefreshMode ||
    draftLanguage !== liveLanguage ||
    draftInactivityTimeout !== liveInactivityTimeout ||
    draftProxyUrl.trim() !== (liveProxyUrl || '/api/cf').trim()

  // Responsive translation preview matching the selected draft language
  const currentT = translations[draftLanguage] ?? t

  const handleCancel = useCallback(() => {
    onClose()
  }, [onClose])

  const handleSave = () => {
    updateSettings({
      concurrency: draftConcurrency,
      autoRefreshInterval: draftAutoRefreshInterval,
      autoRefreshMode: draftAutoRefreshMode,
      language: draftLanguage,
      inactivityTimeout: draftInactivityTimeout,
    })
    const cleanProxy = draftProxyUrl.trim() || '/api/cf'
    if (cleanProxy !== liveProxyUrl) {
      setProxyUrl(cleanProxy)
    }
    onClose()
  }

  const handleRestoreDefaults = () => {
    setDraftConcurrency(DEFAULT_SETTINGS.concurrency)
    setDraftAutoRefreshInterval(DEFAULT_SETTINGS.autoRefreshInterval)
    setDraftAutoRefreshMode(DEFAULT_SETTINGS.autoRefreshMode)
    setDraftLanguage(DEFAULT_SETTINGS.language)
    setDraftInactivityTimeout(DEFAULT_SETTINGS.inactivityTimeout)
    setDraftProxyUrl('/api/cf')
  }

  // Handle Escape key to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleCancel])

  const isAutoRefreshActive = draftAutoRefreshInterval > 0

  const intervalOptions = [
    { value: 0, label: currentT.settings.intervalDisabled },
    { value: 30, label: currentT.settings.interval30s },
    { value: 60, label: currentT.settings.interval1m },
    { value: 300, label: currentT.settings.interval5m },
    { value: 600, label: currentT.settings.interval10m },
  ]

  const inactivityOptions = [
    { value: 0, label: currentT.settings.inactivityDisabled },
    { value: 15, label: currentT.settings.inactivity15m },
    { value: 30, label: currentT.settings.inactivity30m },
    { value: 60, label: currentT.settings.inactivity60m },
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
    >
      {/* Backdrop overlay */}
      <motion.div
        onClick={handleCancel}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
      />

      {/* Modal window */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 8 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="relative w-full max-w-xl z-10 my-8"
      >
        <GlassCard className="p-0 overflow-hidden shadow-2xl border-white/60 dark:border-white/15">
          {/* Top gradient accent bar in Cloudflare colors */}
          <div className="h-1.5 bg-gradient-to-r from-[#f6821f] via-amber-500 to-indigo-500" />

          <div className="p-6 space-y-6">
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-orange-500/10 text-[#f6821f] border border-orange-500/20 shadow-sm">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3
                      id="settings-modal-title"
                      className="text-lg font-bold text-slate-900 dark:text-white"
                    >
                      {currentT.settings.title}
                    </h3>
                    {isDirty && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {currentT.settings.hasUnsaved}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {currentT.settings.subtitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCancel}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                aria-label={currentT.common.close}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Section 0: Interface Language */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-[#f6821f]" />
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {currentT.settings.languageTitle}
                  </span>
                </div>
                <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                  {draftLanguage === 'en' ? 'English (EN)' : 'Polski (PL)'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200/80 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setDraftLanguage('en')}
                  className={cn(
                    'py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2',
                    draftLanguage === 'en'
                      ? 'bg-gradient-to-br from-[#f6821f] to-[#ff9838] text-white shadow-md shadow-orange-500/25'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-700/40'
                  )}
                >
                  <span>English (EN)</span>
                  {draftLanguage === 'en' && <Check className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setDraftLanguage('pl')}
                  className={cn(
                    'py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2',
                    draftLanguage === 'pl'
                      ? 'bg-gradient-to-br from-[#f6821f] to-[#ff9838] text-white shadow-md shadow-orange-500/25'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-700/40'
                  )}
                >
                  <span>Polski (PL)</span>
                  {draftLanguage === 'pl' && <Check className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {currentT.settings.languageDesc}
              </p>
            </div>

            <div className="h-px bg-slate-200/70 dark:bg-white/10" />

            {/* Section 1: Concurrency */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#f6821f]" />
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {currentT.settings.concurrencyTitle}
                  </span>
                </div>
                <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                  {currentT.settings.threads(draftConcurrency)}
                </span>
              </div>

              {/* Segmented control for thread count (1-6) */}
              <div className="grid grid-cols-6 gap-1.5 p-1 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200/80 dark:border-white/10">
                {CONCURRENCY_OPTIONS.map((num) => {
                  const isSelected = draftConcurrency === num
                  const isDefault = num === 2
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setDraftConcurrency(num)}
                      className={cn(
                        'relative py-2 px-1 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-0.5',
                        isSelected
                          ? 'bg-gradient-to-br from-[#f6821f] to-[#ff9838] text-white shadow-md shadow-orange-500/25 scale-[1.02]'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-700/40'
                      )}
                    >
                      <span>{num}</span>
                      {isDefault && (
                        <span
                          className={cn(
                            'text-[9px] font-normal leading-none',
                            isSelected ? 'text-white/90' : 'text-[#f6821f]'
                          )}
                        >
                          {currentT.settings.optimum}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Optimal value recommendation info box */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl backdrop-blur-md bg-orange-500/[0.06] border border-orange-500/20 text-xs text-slate-600 dark:text-slate-300">
                <Info className="w-4 h-4 text-[#f6821f] shrink-0 mt-0.5" />
                <p className="leading-relaxed">{currentT.settings.concurrencyInfo}</p>
              </div>
            </div>

            <div className="h-px bg-slate-200/70 dark:bg-white/10" />

            {/* Section 2: Auto-Refresh */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#f6821f]" />
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {currentT.settings.autoRefreshTitle}
                  </span>
                </div>
                {isAutoRefreshActive && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {currentT.settings.active}
                  </span>
                )}
              </div>

              {/* Interval selection */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {intervalOptions.map((opt) => {
                  const isSelected = draftAutoRefreshInterval === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDraftAutoRefreshInterval(opt.value)}
                      className={cn(
                        'py-2 px-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer text-center',
                        'backdrop-blur-md border',
                        isSelected
                          ? 'bg-gradient-to-br from-[#f6821f] to-[#ff9838] text-white border-orange-500 shadow-md shadow-orange-500/20'
                          : 'bg-white/60 dark:bg-slate-800/60 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-orange-400/50'
                      )}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>

              {/* Refresh mode selection (active only when interval > 0) */}
              <div
                className={cn(
                  'space-y-2 transition-opacity duration-200',
                  !isAutoRefreshActive && 'opacity-40 pointer-events-none'
                )}
              >
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                  {currentT.settings.refreshModeTitle}:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Quick Delta Sync */}
                  <button
                    type="button"
                    onClick={() => setDraftAutoRefreshMode('first_page')}
                    className={cn(
                      'p-3.5 rounded-xl text-left border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2',
                      'backdrop-blur-md',
                      draftAutoRefreshMode === 'first_page'
                        ? 'bg-orange-500/[0.08] border-[#f6821f] shadow-sm'
                        : 'bg-white/40 dark:bg-slate-800/40 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                        <Zap className="w-3.5 h-3.5 text-[#f6821f]" />
                        {currentT.settings.deltaTitle}
                      </span>
                      {draftAutoRefreshMode === 'first_page' && (
                        <Check className="w-3.5 h-3.5 text-[#f6821f]" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                      {currentT.settings.deltaDesc}
                    </p>
                  </button>

                  {/* Option 2: Full Sync */}
                  <button
                    type="button"
                    onClick={() => setDraftAutoRefreshMode('full')}
                    className={cn(
                      'p-3.5 rounded-xl text-left border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2',
                      'backdrop-blur-md',
                      draftAutoRefreshMode === 'full'
                        ? 'bg-orange-500/[0.08] border-[#f6821f] shadow-sm'
                        : 'bg-white/40 dark:bg-slate-800/40 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                        <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
                        {currentT.settings.fullTitle}
                      </span>
                      {draftAutoRefreshMode === 'full' && (
                        <Check className="w-3.5 h-3.5 text-[#f6821f]" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                      {currentT.settings.fullDesc}
                    </p>
                  </button>
                </div>
              </div>

              {/* Section 3: Inactivity Auto-Logout (Auto-Lock) */}
              <div className="space-y-3 pt-1 border-t border-slate-200/60 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-[#f6821f]" />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {currentT.settings.inactivityTitle}
                    </span>
                  </div>
                  {draftInactivityTimeout > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {draftInactivityTimeout}m
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {currentT.settings.inactivityDesc}
                </p>

                {/* Inactivity timeout segmented buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {inactivityOptions.map((opt) => {
                    const isSelected = draftInactivityTimeout === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDraftInactivityTimeout(opt.value)}
                        className={cn(
                          'py-2 px-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer text-center',
                          'backdrop-blur-md border',
                          isSelected
                            ? 'bg-gradient-to-br from-[#f6821f] to-[#ff9838] text-white border-transparent shadow-md shadow-orange-500/25 scale-[1.02]'
                            : 'bg-white/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                        )}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* CORS Proxy Endpoint */}
              <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-white/10">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-[#f6821f]" />
                  {currentT.settings.proxyTitle}:
                </label>
                <GlassInput
                  value={draftProxyUrl}
                  onChange={(e) => setDraftProxyUrl(e.target.value)}
                  placeholder="https://cf-proxy.yourdomain.workers.dev/api/cf or /api/cf"
                  helperText={currentT.settings.proxyDesc}
                />
              </div>
            </div>

            {/* Modal footer with Cancel and Save buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200/70 dark:border-white/10">
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={handleRestoreDefaults}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                className="w-full sm:w-auto text-xs"
              >
                {currentT.settings.restoreDefaults}
              </GlassButton>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <GlassButton
                  variant="ghost"
                  size="md"
                  onClick={handleCancel}
                  className="flex-1 sm:flex-none text-xs"
                >
                  {currentT.settings.cancel}
                </GlassButton>

                <GlassButton
                  variant="primary"
                  size="md"
                  onClick={handleSave}
                  className={cn('flex-1 sm:flex-none text-xs font-bold shadow-md shadow-orange-500/20')}
                  leftIcon={isDirty ? <Sparkles className="w-3.5 h-3.5" /> : undefined}
                >
                  {currentT.settings.save}
                </GlassButton>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  )
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && <SettingsModalDialog onClose={onClose} />}
    </AnimatePresence>,
    document.body
  )
}

export default SettingsModal
