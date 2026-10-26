import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Globe,
  Loader2,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import type { NormalizedAccessRule } from '../../types/cloudflare'
import {
  bulkDeleteAccessRules,
  getRuleUniqueKey,
  type BulkDeleteProgress,
  type BulkDeleteResult,
} from '../../api/accessRules'
import { useAuthStore } from '../../store/useAuthStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useHighlightStore } from '../../store/useHighlightStore'
import { setCachedRules } from '../../utils/rulesCache'
import { useTranslation } from '../../i18n/useTranslation'
import { GlassButton } from '../ui/GlassButton'
import { GlassCard } from '../ui/GlassCard'

export interface ConfirmDeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  rules: NormalizedAccessRule[]
  onSuccess?: (deletedRules: NormalizedAccessRule[]) => void
}

export const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  isOpen,
  onClose,
  rules,
  onSuccess,
}) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const accountLevelOnly = useAuthStore((s) => s.accountLevelOnly)
  const concurrency = useSettingsStore((s) => s.concurrency)

  const [isDeleting, setIsDeleting] = useState(false)
  const [progress, setProgress] = useState<BulkDeleteProgress>({
    current: 0,
    total: rules.length,
    percentage: 0,
  })
  const [result, setResult] = useState<BulkDeleteResult | null>(null)

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    useSettingsStore.getState().setIsMutatingRules(true)
    setProgress({ current: 0, total: rules.length, percentage: 0 })
    setResult(null)

    try {
      const deleteResult = await bulkDeleteAccessRules(rules, setProgress, concurrency)
      setResult(deleteResult)

      // Immediate cache update with exit animation phase
      if (deleteResult.successful.length > 0) {
        const deletedKeys = deleteResult.successful.map((r) => getRuleUniqueKey(r))
        const deletedIds = new Set(deleteResult.successful.map((r) => r.id))

        // Phase 1 (Exit animation): Mark rows as removing to trigger CSS exit animation
        useHighlightStore.getState().markRulesAsRemoving(deletedKeys)

        // Wait 350ms for CSS exit animation to complete
        await new Promise((resolve) => setTimeout(resolve, 350))

        // Phase 2 (Purge): Remove deleted items from query cache and IndexedDB
        queryClient.setQueriesData<NormalizedAccessRule[]>(
          { queryKey: ['cloudflare', 'access_rules'] },
          (old) => {
            const updated = old ? old.filter((rule) => !deletedIds.has(rule.id)) : []
            // Update IndexedDB in background without network reload
            setCachedRules(accountLevelOnly, updated).catch((err) =>
              console.warn('[ConfirmDeleteDialog] Error updating IndexedDB:', err)
            )
            return updated
          }
        )

        useHighlightStore.getState().clearRemovingRules(deletedKeys)
        onSuccess?.(deleteResult.successful)
      }

      // If no errors, close modal after short delay
      if (deleteResult.failed.length === 0) {
        setTimeout(() => {
          setIsDeleting(false)
          setResult(null)
          onClose()
        }, 800)
      } else {
        setIsDeleting(false)
      }
    } catch (err) {
      console.error('Error while deleting rules:', err)
      setIsDeleting(false)
    } finally {
      useSettingsStore.getState().setIsMutatingRules(false)
      useSettingsStore.getState().scheduleNextRefresh()
    }
  }

  const handleClose = () => {
    if (isDeleting) return
    setResult(null)
    onClose()
  }

  const count = rules.length
  const isSingle = count === 1
  const singleRule = rules[0]

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && rules.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
        >
          {/* Backdrop with smooth animation */}
          <motion.div
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          {/* GlassCard modal window with spring animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="relative w-full max-w-lg z-10"
          >
            <GlassCard className="p-0 overflow-hidden shadow-2xl border-white/60 dark:border-white/15">
              {/* Top accent bar */}
              <div className="h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />

              <div className="p-6 space-y-5">
                {/* Modal header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3
                        id="confirm-delete-title"
                        className="text-lg font-bold text-slate-900 dark:text-white"
                      >
                        {isSingle
                          ? t.deleteModal.titleSingle
                          : t.deleteModal.titleBulk(count)}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t.deleteModal.subtitle}
                      </p>
                    </div>
                  </div>

                  {!isDeleting && (
                    <button
                      type="button"
                      onClick={handleClose}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                      aria-label={t.common.close}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* State: deleting in progress with progress bar */}
                {isDeleting ? (
                  <div className="space-y-4 py-3">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                        {t.deleteModal.deleting} ({progress.current} / {progress.total})...
                      </span>
                      <span className="font-mono text-red-600 dark:text-red-400">
                        {progress.percentage}%
                      </span>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-300 rounded-full"
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>

                    <p className="text-xs text-center text-slate-500">
                      {t.settings.threads(concurrency)}
                    </p>
                  </div>
                ) : result ? (
                  // State: operation completed with possible error summary
                  <div className="space-y-3 py-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      {result.failed.length === 0
                        ? t.deleteModal.completedAll(result.successful.length)
                        : t.deleteModal.completedPartial(result.successful.length, result.failed.length)}
                    </div>

                    {result.failed.length > 0 && (
                      <div className="space-y-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400">
                          <XCircle className="w-3.5 h-3.5" />
                          {result.failed.length} {t.deleteModal.errorsHeading}
                        </div>
                        <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 max-h-32 overflow-y-auto">
                          {result.failed.map((f, idx) => (
                            <li key={idx} className="font-mono">
                              {f.rule.value}: {f.error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  // State: before start (confirmation prompt)
                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p>
                      {isSingle
                        ? t.deleteModal.warningSingle
                        : t.deleteModal.warningBulk(count)}
                    </p>

                    {/* Single rule preview */}
                    {isSingle && singleRule && (
                      <div className="p-3 rounded-xl backdrop-blur-md bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            {singleRule.target.toUpperCase()}: {singleRule.value}
                          </span>
                          <span className="capitalize px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-600 border border-red-500/20">
                            {singleRule.mode}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          {singleRule.scopeType === 'account' ? (
                            <span className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25">
                                ACCOUNT
                              </span>
                              <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span>{singleRule.accountName || t.table.entireAccount}</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25">
                                ZONE
                              </span>
                              <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span>{singleRule.zoneName || t.table.cloudflareZone}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Multi-rule preview (compact list) */}
                    {!isSingle && (
                      <div className="p-3 rounded-xl backdrop-blur-md bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 max-h-40 overflow-y-auto space-y-1.5">
                        {rules.slice(0, 8).map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="font-mono truncate max-w-[260px] text-slate-800 dark:text-slate-200">
                              {r.target}: {r.value}
                            </span>
                            {r.scopeType === 'account' ? (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25"
                                title={r.accountName || t.table.entireAccount}
                              >
                                ACCOUNT
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25"
                                title={r.zoneName || t.table.cloudflareZone}
                              >
                                ZONE
                              </span>
                            )}
                          </div>
                        ))}
                        {rules.length > 8 && (
                          <div className="text-[11px] text-slate-400 italic pt-1 text-center">
                            + {rules.length - 8} ...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/70 dark:border-white/10">
                  {result ? (
                    <GlassButton variant="glass" size="md" onClick={handleClose}>
                      {t.common.close}
                    </GlassButton>
                  ) : (
                    <>
                      <GlassButton
                        variant="ghost"
                        size="md"
                        onClick={handleClose}
                        disabled={isDeleting}
                      >
                        {t.common.cancel}
                      </GlassButton>

                      <GlassButton
                        variant="danger"
                        size="md"
                        onClick={handleConfirmDelete}
                        isLoading={isDeleting}
                        leftIcon={<Trash2 className="w-4 h-4" />}
                      >
                        {isSingle ? t.deleteModal.confirmDelete : t.deleteModal.confirmDeleteBulk(count)}
                      </GlassButton>
                    </>
                  )}
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

export default ConfirmDeleteDialog
