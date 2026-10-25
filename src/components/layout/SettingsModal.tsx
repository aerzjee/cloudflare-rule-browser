import React from 'react'
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
} from 'lucide-react'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useTranslation } from '../../i18n/useTranslation'
import { GlassButton } from '../ui/GlassButton'
import { GlassCard } from '../ui/GlassCard'
import { cn } from '../../lib/utils'

export interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const CONCURRENCY_OPTIONS = [1, 2, 3, 4, 5, 6]

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t, language, setLanguage } = useTranslation()

  const concurrency = useSettingsStore((s) => s.concurrency)
  const setConcurrency = useSettingsStore((s) => s.setConcurrency)
  const autoRefreshInterval = useSettingsStore((s) => s.autoRefreshInterval)
  const setAutoRefreshInterval = useSettingsStore((s) => s.setAutoRefreshInterval)
  const autoRefreshMode = useSettingsStore((s) => s.autoRefreshMode)
  const setAutoRefreshMode = useSettingsStore((s) => s.setAutoRefreshMode)
  const resetSettings = useSettingsStore((s) => s.resetSettings)

  const isAutoRefreshActive = autoRefreshInterval > 0

  const intervalOptions = [
    { value: 0, label: t.settings.intervalDisabled },
    { value: 30, label: t.settings.interval30s },
    { value: 60, label: t.settings.interval1m },
    { value: 300, label: t.settings.interval5m },
    { value: 600, label: t.settings.interval10m },
  ]

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
        >
          {/* Tło (backdrop) */}
          <motion.div
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          {/* Okno modala */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="relative w-full max-w-xl z-10 my-8"
          >
            <GlassCard className="p-0 overflow-hidden shadow-2xl border-white/60 dark:border-white/15">
              {/* Górny pasek gradientowy w barwach Cloudflare */}
              <div className="h-1.5 bg-gradient-to-r from-[#f6821f] via-amber-500 to-indigo-500" />

              <div className="p-6 space-y-6">
                {/* Nagłówek */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-orange-500/10 text-[#f6821f] border border-orange-500/20 shadow-sm">
                      <Settings className="w-5 h-5" />
                    </div>
                    <div>
                      <h3
                        id="settings-modal-title"
                        className="text-lg font-bold text-slate-900 dark:text-white"
                      >
                        {t.settings.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t.settings.subtitle}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    aria-label={t.common.close}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Sekcja 0: Język interfejsu (Language) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Languages className="w-4 h-4 text-[#f6821f]" />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {t.settings.languageTitle}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                      {language === 'en' ? 'English (EN)' : 'Polski (PL)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200/80 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setLanguage('en')}
                      className={cn(
                        'py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2',
                        language === 'en'
                          ? 'bg-gradient-to-br from-[#f6821f] to-[#ff9838] text-white shadow-md shadow-orange-500/25'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-700/40'
                      )}
                    >
                      <span>English (EN)</span>
                      {language === 'en' && <Check className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setLanguage('pl')}
                      className={cn(
                        'py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2',
                        language === 'pl'
                          ? 'bg-gradient-to-br from-[#f6821f] to-[#ff9838] text-white shadow-md shadow-orange-500/25'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-700/40'
                      )}
                    >
                      <span>Polski (PL)</span>
                      {language === 'pl' && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t.settings.languageDesc}
                  </p>
                </div>

                <div className="h-px bg-slate-200/70 dark:bg-white/10" />

                {/* Sekcja 1: Wielowątkowość (Concurrency) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-[#f6821f]" />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {t.settings.concurrencyTitle}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                      {t.settings.threads(concurrency)}
                    </span>
                  </div>

                  {/* Segmented control dla liczby wątków (1-6) */}
                  <div className="grid grid-cols-6 gap-1.5 p-1 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200/80 dark:border-white/10">
                    {CONCURRENCY_OPTIONS.map((num) => {
                      const isSelected = concurrency === num
                      const isDefault = num === 2
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setConcurrency(num)}
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
                              {t.settings.optimum}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Informacja o optymalnej wartości */}
                  <div className="flex items-start gap-2.5 p-3 rounded-xl backdrop-blur-md bg-orange-500/[0.06] border border-orange-500/20 text-xs text-slate-600 dark:text-slate-300">
                    <Info className="w-4 h-4 text-[#f6821f] shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{t.settings.concurrencyInfo}</p>
                  </div>
                </div>

                <div className="h-px bg-slate-200/70 dark:bg-white/10" />

                {/* Sekcja 2: Cykliczne odświeżanie (Auto-Refresh) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#f6821f]" />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {t.settings.autoRefreshTitle}
                      </span>
                    </div>
                    {isAutoRefreshActive && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {t.settings.active}
                      </span>
                    )}
                  </div>

                  {/* Wybór interwału czasu */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {intervalOptions.map((opt) => {
                      const isSelected = autoRefreshInterval === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAutoRefreshInterval(opt.value)}
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

                  {/* Wybór trybu odświeżania (aktywny tylko, gdy interwał > 0) */}
                  <div
                    className={cn(
                      'space-y-2 transition-opacity duration-200',
                      !isAutoRefreshActive && 'opacity-40 pointer-events-none'
                    )}
                  >
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                      {t.settings.refreshModeTitle}:
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Opcja 1: Quick Delta Sync */}
                      <button
                        type="button"
                        onClick={() => setAutoRefreshMode('first_page')}
                        className={cn(
                          'p-3.5 rounded-xl text-left border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2',
                          'backdrop-blur-md',
                          autoRefreshMode === 'first_page'
                            ? 'bg-orange-500/[0.08] border-[#f6821f] shadow-sm'
                            : 'bg-white/40 dark:bg-slate-800/40 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                            <Zap className="w-3.5 h-3.5 text-[#f6821f]" />
                            {t.settings.deltaTitle}
                          </span>
                          {autoRefreshMode === 'first_page' && (
                            <Check className="w-3.5 h-3.5 text-[#f6821f]" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                          {t.settings.deltaDesc}
                        </p>
                      </button>

                      {/* Opcja 2: Full Sync */}
                      <button
                        type="button"
                        onClick={() => setAutoRefreshMode('full')}
                        className={cn(
                          'p-3.5 rounded-xl text-left border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2',
                          'backdrop-blur-md',
                          autoRefreshMode === 'full'
                            ? 'bg-orange-500/[0.08] border-[#f6821f] shadow-sm'
                            : 'bg-white/40 dark:bg-slate-800/40 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                            <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
                            {t.settings.fullTitle}
                          </span>
                          {autoRefreshMode === 'full' && (
                            <Check className="w-3.5 h-3.5 text-[#f6821f]" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                          {t.settings.fullDesc}
                        </p>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stopka modala */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200/70 dark:border-white/10">
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={resetSettings}
                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  >
                    {t.settings.restoreDefaults}
                  </GlassButton>

                  <GlassButton variant="primary" size="md" onClick={onClose}>
                    {t.settings.done}
                  </GlassButton>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default SettingsModal
