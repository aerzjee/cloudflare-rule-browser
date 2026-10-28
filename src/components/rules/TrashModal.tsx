import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertCircle,
  ArchiveRestore,
  Building2,
  Clock,
  Globe,
  Loader2,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import pLimit from 'p-limit'
import type {
  CloudflareAccessRuleMode,
  NormalizedAccessRule,
} from '../../types/cloudflare'
import {
  createAccessRule,
  getRuleUniqueKey,
} from '../../api/accessRules'
import { useAuthStore } from '../../store/useAuthStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useHighlightStore } from '../../store/useHighlightStore'
import { useTrashStore, type DeletedRuleEntry } from '../../store/useTrashStore'
import { useRateLimitStore } from '../../store/useRateLimitStore'
import { setCachedRules } from '../../utils/rulesCache'
import { useTranslation } from '../../i18n/useTranslation'
import { GlassButton } from '../ui/GlassButton'
import { GlassCard } from '../ui/GlassCard'
import { cn } from '../../lib/utils'

export interface TrashModalProps {
  isOpen: boolean
  onClose: () => void
}

function formatDeletedTime(isoString: string, lang: string): string {
  if (!isoString) return '-'
  try {
    const d = new Date(isoString)
    if (Number.isNaN(d.getTime())) return isoString
    return d.toLocaleString(lang === 'pl' ? 'pl-PL' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoString
  }
}

export const TrashModal: React.FC<TrashModalProps> = ({ isOpen, onClose }) => {
  const { t, language } = useTranslation()
  const queryClient = useQueryClient()
  const accountLevelOnly = useAuthStore((s) => s.accountLevelOnly)
  const concurrency = useSettingsStore((s) => s.concurrency)

  const trashRules = useTrashStore((s) => s.trashRules)
  const removeRulesFromTrash = useTrashStore((s) => s.removeRulesFromTrash)
  const emptyTrash = useTrashStore((s) => s.emptyTrash)
  const isThrottled = useRateLimitStore((s) => s.isThrottled)
  const throttleRemainingSeconds = useRateLimitStore((s) => s.throttleRemainingSeconds)

  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [isRestoringAll, setIsRestoringAll] = useState(false)
  const [errorMessages, setErrorMessages] = useState<
    Array<{ value: string; message: string }>
  >([])

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !restoringId && !isRestoringAll) {
        onClose()
      }
    },
    [onClose, restoringId, isRestoringAll]
  )

  useEffect(() => {
    if (!isOpen) return
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  // Restore a single rule
  const handleRestoreRule = async (entry: DeletedRuleEntry) => {
    const { rule } = entry
    setRestoringId(rule.id)
    setErrorMessages([])
    useSettingsStore.getState().setIsMutatingRules(true)

    try {
      const restored = await createAccessRule({
        scopeType: rule.scopeType,
        accountId: rule.accountId,
        accountName: rule.accountName,
        zoneId: rule.zoneId,
        zoneName: rule.zoneName,
        mode: rule.mode as CloudflareAccessRuleMode,
        target: rule.target as 'ip' | 'ip6' | 'ip_range' | 'asn' | 'country',
        value: rule.value,
        notes: rule.notes,
      })

      // 1. Remove from local trash
      await removeRulesFromTrash([rule.id])

      // 2. Prepend to table cache and persist to IndexedDB
      queryClient.setQueriesData<NormalizedAccessRule[]>(
        { queryKey: ['cloudflare', 'access_rules'] },
        (old) => {
          const updated = [restored, ...(old || [])]
          setCachedRules(accountLevelOnly, updated).catch((err) =>
            console.warn('[TrashModal] Error writing to IndexedDB:', err)
          )
          return updated
        }
      )

      // 3. Highlight recreated row
      const restoredKey = getRuleUniqueKey(restored)
      useHighlightStore.getState().highlightNewRules([restoredKey])
    } catch (err) {
      console.error('[TrashModal] Error restoring rule:', err)
      setErrorMessages([
        {
          value: rule.value,
          message:
            err instanceof Error ? err.message : t.trashModal.errorGeneric,
        },
      ])
    } finally {
      setRestoringId(null)
      useSettingsStore.getState().setIsMutatingRules(false)
      useSettingsStore.getState().scheduleNextRefresh()
    }
  }

  // Restore all rules in trash
  const handleRestoreAll = async () => {
    if (trashRules.length === 0 || isRestoringAll) return

    setIsRestoringAll(true)
    setErrorMessages([])
    useSettingsStore.getState().setIsMutatingRules(true)

    const limit = pLimit(concurrency)
    const successfulRestored: NormalizedAccessRule[] = []
    const successfulOriginalIds: string[] = []
    const failed: Array<{ value: string; message: string }> = []

    const tasks = trashRules.map((entry) =>
      limit(async () => {
        const { rule } = entry
        try {
          const restored = await createAccessRule({
            scopeType: rule.scopeType,
            accountId: rule.accountId,
            accountName: rule.accountName,
            zoneId: rule.zoneId,
            zoneName: rule.zoneName,
            mode: rule.mode as CloudflareAccessRuleMode,
            target: rule.target as 'ip' | 'ip6' | 'ip_range' | 'asn' | 'country',
            value: rule.value,
            notes: rule.notes,
          })
          return { success: true as const, restored, originalId: rule.id }
        } catch (err) {
          return {
            success: false as const,
            value: rule.value,
            message:
              err instanceof Error ? err.message : t.trashModal.errorGeneric,
          }
        }
      })
    )

    try {
      const outcomes = await Promise.allSettled(tasks)

      for (const outcome of outcomes) {
        if (outcome.status === 'fulfilled') {
          if (outcome.value.success) {
            successfulRestored.push(outcome.value.restored)
            successfulOriginalIds.push(outcome.value.originalId)
          } else {
            failed.push({
              value: outcome.value.value,
              message: outcome.value.message,
            })
          }
        } else {
          failed.push({
            value: 'unknown',
            message:
              outcome.reason instanceof Error
                ? outcome.reason.message
                : String(outcome.reason),
          })
        }
      }

      // Remove successful from trash
      if (successfulOriginalIds.length > 0) {
        await removeRulesFromTrash(successfulOriginalIds)

        // Prepend to React Query & IndexedDB
        queryClient.setQueriesData<NormalizedAccessRule[]>(
          { queryKey: ['cloudflare', 'access_rules'] },
          (old) => {
            const updated = [...successfulRestored, ...(old || [])]
            setCachedRules(accountLevelOnly, updated).catch((err) =>
              console.warn('[TrashModal] Error writing to IndexedDB:', err)
            )
            return updated
          }
        )

        // Highlight recreated rows
        const restoredKeys = successfulRestored.map(getRuleUniqueKey)
        useHighlightStore.getState().highlightNewRules(restoredKeys)
      }

      if (failed.length > 0) {
        setErrorMessages(failed)
      } else {
        // Complete restore success: close modal
        onClose()
      }
    } finally {
      setIsRestoringAll(false)
      useSettingsStore.getState().setIsMutatingRules(false)
      useSettingsStore.getState().scheduleNextRefresh()
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="trash-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              if (!restoringId && !isRestoringAll) onClose()
            }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-2xl my-auto"
          >
            <GlassCard
              glow
              className="p-5 sm:p-6 shadow-2xl border-white/60 dark:border-white/10 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-500/10 text-[#f6821f] border border-orange-500/20">
                    <ArchiveRestore className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2
                        id="trash-modal-title"
                        className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white"
                      >
                        {t.trashModal.title}
                      </h2>
                      {trashRules.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-500/15 text-[#f6821f] border border-orange-500/20">
                          {trashRules.length}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {t.trashModal.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={Boolean(restoringId) || isRestoringAll}
                    aria-label={t.trashModal.btnClose}
                    className={cn(
                      'p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200',
                      'hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors cursor-pointer',
                      (Boolean(restoringId) || isRestoringAll) &&
                        'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Action Bar (when trash has items) */}
              {trashRules.length > 0 && (
                <div className="flex items-center justify-between gap-2 py-3 border-b border-slate-200/50 dark:border-white/5 shrink-0">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {t.trashModal.itemCount(trashRules.length)}
                  </span>

                  <div className="flex items-center gap-2">
                    <GlassButton
                      variant="ghost"
                      size="xs"
                      disabled={Boolean(restoringId) || isRestoringAll}
                      onClick={() => emptyTrash()}
                      leftIcon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                    >
                      <span className="text-red-600 dark:text-red-400">
                        {t.trashModal.btnEmpty}
                      </span>
                    </GlassButton>

                    <GlassButton
                      variant="primary"
                      size="xs"
                      disabled={Boolean(restoringId) || isRestoringAll}
                      isLoading={isRestoringAll}
                      onClick={handleRestoreAll}
                      leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                    >
                      <span>
                        {isRestoringAll
                          ? t.trashModal.btnRestoringAll
                          : t.trashModal.btnRestoreAll}
                      </span>
                    </GlassButton>
                  </div>
                </div>
              )}

              {/* Throttled status indicator during restore */}
              {(isRestoringAll || Boolean(restoringId)) && isThrottled && (
                <div className="flex items-center justify-center gap-2 p-2.5 my-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold animate-pulse shrink-0">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>
                    {t.rateLimitWaiting.replace('{seconds}', String(throttleRemainingSeconds))}
                  </span>
                </div>
              )}

              {/* Error messages */}
              {errorMessages.length > 0 && (
                <div className="my-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs shrink-0 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{t.trashModal.restoreErrorsHeading}</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px] opacity-90 pl-1">
                    {errorMessages.map((err, i) => (
                      <li key={i}>
                        <span className="font-semibold">{err.value}:</span>{' '}
                        {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Body: List of deleted rules */}
              <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
                {trashRules.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 text-slate-400">
                      <Trash2 className="w-8 h-8 opacity-60" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {t.trashModal.emptyTitle}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                        {t.trashModal.emptyDesc}
                      </p>
                    </div>
                  </div>
                ) : (
                  trashRules.map((entry) => {
                    const { rule, deletedAt } = entry
                    const isAccount = rule.scopeType === 'account'
                    const isBusy = restoringId === rule.id || isRestoringAll

                    return (
                      <div
                        key={rule.id}
                        className={cn(
                          'p-3 rounded-xl transition-all duration-200',
                          'backdrop-blur-md bg-white/60 dark:bg-slate-800/40',
                          'border border-slate-200/70 dark:border-white/10',
                          'flex flex-col sm:flex-row sm:items-center justify-between gap-3'
                        )}
                      >
                        {/* Rule details */}
                        <div className="space-y-1.5 min-w-0 flex-1">
                          {/* Badges row */}
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Scope badge */}
                            {isAccount ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25">
                                <Building2 className="w-3 h-3 text-indigo-500" />
                                {rule.accountName || 'ACCOUNT'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25">
                                <Globe className="w-3 h-3 text-blue-500" />
                                {rule.zoneName || 'ZONE'}
                              </span>
                            )}

                            {/* Mode badge */}
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300">
                              {rule.mode}
                            </span>

                            {/* Deleted time */}
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                              <Clock className="w-3 h-3" />
                              {formatDeletedTime(deletedAt, language)}
                            </span>
                          </div>

                          {/* Target & Value */}
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-100 select-all">
                              {rule.value}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase font-mono">
                              ({rule.target})
                            </span>
                          </div>

                          {/* Notes (if any) */}
                          {rule.notes && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic truncate max-w-md">
                              "{rule.notes}"
                            </p>
                          )}
                        </div>

                        {/* Restore Button */}
                        <div className="shrink-0 flex items-center justify-end sm:justify-center">
                          <GlassButton
                            variant="primary"
                            size="xs"
                            disabled={isBusy}
                            isLoading={restoringId === rule.id}
                            onClick={() => handleRestoreRule(entry)}
                            leftIcon={
                              restoringId === rule.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3 h-3" />
                              )
                            }
                          >
                            <span>{t.trashModal.btnRestore}</span>
                          </GlassButton>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end pt-3 border-t border-slate-200/60 dark:border-white/10 shrink-0">
                <GlassButton
                  type="button"
                  variant="glass"
                  size="sm"
                  onClick={onClose}
                  disabled={Boolean(restoringId) || isRestoringAll}
                >
                  {t.trashModal.btnClose}
                </GlassButton>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default TrashModal
