import React, { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  CheckSquare,
  ChevronUp,
  Clock,
  Download,
  FileJson,
  FileSpreadsheet,
  Shield,
  Trash2,
  X,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import type {
  CloudflareAccessRuleMode,
  NormalizedAccessRule,
} from '../../types/cloudflare'
import {
  bulkUpdateAccessRulesMode,
  getRuleUniqueKey,
} from '../../api/accessRules'
import { exportRulesToCsv, exportRulesToJson } from '../../utils/exportRules'
import { useAuthStore } from '../../store/useAuthStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useHighlightStore } from '../../store/useHighlightStore'
import { useRateLimitStore } from '../../store/useRateLimitStore'
import { setCachedRules } from '../../utils/rulesCache'
import { useTranslation } from '../../i18n/useTranslation'
import { GlassButton } from '../ui/GlassButton'
import { cn } from '../../lib/utils'

export interface BulkActionBarProps {
  selectedCount: number
  selectedRules?: NormalizedAccessRule[]
  onClearSelection: () => void
  onDeleteSelected: () => void
  className?: string
}

interface ModeOption {
  mode: CloudflareAccessRuleMode
  dotClass: string
}

const MODE_OPTIONS: ModeOption[] = [
  { mode: 'block', dotClass: 'bg-rose-500' },
  { mode: 'managed_challenge', dotClass: 'bg-amber-500' },
  { mode: 'js_challenge', dotClass: 'bg-orange-500' },
  { mode: 'challenge', dotClass: 'bg-yellow-500' },
  { mode: 'whitelist', dotClass: 'bg-emerald-500' },
]

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  selectedRules = [],
  onClearSelection,
  onDeleteSelected,
  className,
}) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const accountLevelOnly = useAuthStore((s) => s.accountLevelOnly)
  const concurrency = useSettingsStore((s) => s.concurrency)
  const isThrottled = useRateLimitStore((s) => s.isThrottled)
  const throttleRemainingSeconds = useRateLimitStore((s) => s.throttleRemainingSeconds)

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  })

  const menuRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click or Escape key
  const closeDropdowns = useCallback(() => {
    setIsMenuOpen(false)
    setIsExportOpen(false)
  }, [])

  useEffect(() => {
    if (!isMenuOpen && !isExportOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (menuRef.current && !menuRef.current.contains(target)) {
        setIsMenuOpen(false)
      }
      if (exportRef.current && !exportRef.current.contains(target)) {
        setIsExportOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDropdowns()
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMenuOpen, isExportOpen, closeDropdowns])

  // Handle mode selection and execute bulk update
  const handleModeSelect = async (newMode: CloudflareAccessRuleMode) => {
    if (selectedRules.length === 0 || isUpdating) return

    closeDropdowns()

    const toUpdate = selectedRules.filter((r) => r.mode !== newMode)
    if (toUpdate.length === 0) {
      // All selected rules already have this mode
      return
    }

    setIsUpdating(true)
    setProgress({ current: 0, total: toUpdate.length })

    try {
      const result = await bulkUpdateAccessRulesMode(
        selectedRules,
        newMode,
        concurrency,
        (current, total) => {
          setProgress({ current, total })
        }
      )

      if (result.updatedRules.length > 0) {
        const updatedMap = new Map<string, NormalizedAccessRule>()
        for (const r of result.updatedRules) {
          updatedMap.set(getRuleUniqueKey(r), r)
        }

        // 1. Update React Query cache locally without table refetch
        queryClient.setQueriesData<NormalizedAccessRule[]>(
          { queryKey: ['cloudflare', 'access_rules'] },
          (old) => {
            if (!old) return []
            const next = old.map((r) => updatedMap.get(getRuleUniqueKey(r)) || r)
            // 2. Persist updated rules to IndexedDB in background
            setCachedRules(accountLevelOnly, next).catch((err) =>
              console.warn('[BulkActionBar] Error updating IndexedDB:', err)
            )
            return next
          }
        )

        // 3. Highlight updated rules with success blink
        const updatedKeys = result.updatedRules.map(getRuleUniqueKey)
        useHighlightStore.getState().highlightNewRules(updatedKeys)

        // 4. Clear row selection
        onClearSelection()
      }
    } catch (err) {
      console.error('[BulkActionBar] Error updating rule mode:', err)
    } finally {
      setIsUpdating(false)
      setProgress({ current: 0, total: 0 })
    }
  }

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.aside
          role="region"
          aria-label={t.bulk.regionLabel}
          initial={{ opacity: 0, y: 40, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 40, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={cn(
            'fixed bottom-6 left-1/2 z-40',
            'w-[calc(100%-2rem)] sm:w-auto max-w-2xl',
            'backdrop-blur-2xl bg-white/90 dark:bg-slate-900/90',
            'border border-white/60 dark:border-white/15',
            'shadow-2xl shadow-orange-500/10 dark:shadow-black/40',
            'rounded-2xl px-4 sm:px-6 py-3',
            'flex items-center justify-between sm:justify-start gap-3 sm:gap-4',
            className
          )}
        >
          {/* Selected rules counter */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-orange-500/15 text-[#f6821f] shrink-0">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                {selectedCount}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t.bulk.ruleSelected(selectedCount)}
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Throttled queue indicator during bulk update */}
            {isUpdating && isThrottled && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold animate-pulse shrink-0">
                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="hidden sm:inline">
                  {t.rateLimitWaiting.replace('{seconds}', String(throttleRemainingSeconds))}
                </span>
                <span className="sm:hidden font-mono font-bold">
                  {throttleRemainingSeconds}s
                </span>
              </div>
            )}

            {/* Deselect button */}
            <GlassButton
              variant="ghost"
              size="sm"
              disabled={isUpdating}
              onClick={onClearSelection}
              leftIcon={<X className="w-3.5 h-3.5" />}
            >
              <span>{t.bulk.deselect}</span>
            </GlassButton>

            {/* Change Mode Dropdown Button */}
            <div className="relative" ref={menuRef}>
              <GlassButton
                variant="glass"
                size="sm"
                disabled={isUpdating}
                isLoading={isUpdating}
                onClick={() => setIsMenuOpen((prev) => !prev)}
                leftIcon={
                  !isUpdating && <Shield className="w-3.5 h-3.5 text-[#f6821f]" />
                }
                rightIcon={
                  !isUpdating && (
                    <ChevronUp
                      className={cn(
                        'w-3.5 h-3.5 transition-transform duration-200',
                        isMenuOpen && 'rotate-180'
                      )}
                    />
                  )
                }
              >
                <span>
                  {isUpdating
                    ? isThrottled
                      ? t.rateLimit.rateLimitThrottledBadge.replace(
                          '{seconds}',
                          String(throttleRemainingSeconds)
                        )
                      : t.bulk.updatingRules(progress.current, progress.total)
                    : t.bulk.changeMode}
                </span>
              </GlassButton>

              {/* Mode Selection Popover expanding upwards */}
              <AnimatePresence>
                {isMenuOpen && !isUpdating && (
                  <motion.div
                    role="menu"
                    aria-label={t.bulk.changeMode}
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute bottom-full mb-2.5 right-0 sm:right-auto sm:left-0 z-50 min-w-[210px] p-1.5 rounded-2xl backdrop-blur-2xl bg-white/95 dark:bg-slate-900/95 border border-white/60 dark:border-white/15 shadow-2xl shadow-black/25 flex flex-col space-y-0.5"
                  >
                    {MODE_OPTIONS.map((item) => (
                      <button
                        key={item.mode}
                        type="button"
                        role="menuitem"
                        onClick={() => handleModeSelect(item.mode)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer w-full text-left"
                      >
                        <span
                          className={cn('w-2.5 h-2.5 rounded-full shrink-0', item.dotClass)}
                        />
                        <span>{t.modeDropdown.modes[item.mode].label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Export Selected Button */}
            <div className="relative" ref={exportRef}>
              <GlassButton
                variant="glass"
                size="sm"
                disabled={isUpdating}
                onClick={() => setIsExportOpen((prev) => !prev)}
                leftIcon={<Download className="w-3.5 h-3.5 text-blue-500" />}
                rightIcon={
                  <ChevronUp
                    className={cn(
                      'w-3.5 h-3.5 transition-transform duration-200',
                      isExportOpen && 'rotate-180'
                    )}
                  />
                }
              >
                <span>{t.table.export}</span>
              </GlassButton>

              <AnimatePresence>
                {isExportOpen && !isUpdating && (
                  <motion.div
                    role="menu"
                    aria-label={t.table.export}
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute bottom-full mb-2.5 right-0 sm:right-auto sm:left-0 z-50 min-w-[170px] p-1.5 rounded-2xl backdrop-blur-2xl bg-white/95 dark:bg-slate-900/95 border border-white/60 dark:border-white/15 shadow-2xl shadow-black/25 flex flex-col space-y-0.5"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsExportOpen(false)
                        exportRulesToCsv(selectedRules)
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer w-full text-left"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{t.table.exportCsv}</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsExportOpen(false)
                        exportRulesToJson(selectedRules)
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer w-full text-left"
                    >
                      <FileJson className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{t.table.exportJson}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Delete button */}
            <GlassButton
              variant="danger"
              size="sm"
              disabled={isUpdating}
              onClick={onDeleteSelected}
              leftIcon={<Trash2 className="w-4 h-4" />}
              className="shadow-md shadow-red-500/20"
            >
              {t.bulk.delete(selectedCount)}
            </GlassButton>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

export default BulkActionBar
