import React, { useState } from 'react'
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
  type BulkDeleteProgress,
  type BulkDeleteResult,
} from '../../api/accessRules'
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
  const queryClient = useQueryClient()
  const [isDeleting, setIsDeleting] = useState(false)
  const [progress, setProgress] = useState<BulkDeleteProgress>({
    current: 0,
    total: rules.length,
    percentage: 0,
  })
  const [result, setResult] = useState<BulkDeleteResult | null>(null)

  if (!isOpen || rules.length === 0) return null

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    setProgress({ current: 0, total: rules.length, percentage: 0 })
    setResult(null)

    try {
      const deleteResult = await bulkDeleteAccessRules(rules, setProgress)
      setResult(deleteResult)

      // Zaktualizuj cache TanStack Query dla pomyślnie usuniętych reguł
      if (deleteResult.successful.length > 0) {
        const deletedIds = new Set(deleteResult.successful.map((r) => r.id))

        queryClient.setQueriesData<NormalizedAccessRule[]>(
          { queryKey: ['cloudflare', 'access_rules'] },
          (old) => (old ? old.filter((rule) => !deletedIds.has(rule.id)) : [])
        )

        queryClient.invalidateQueries({
          queryKey: ['cloudflare', 'access_rules'],
        })

        onSuccess?.(deleteResult.successful)
      }

      // Jeśli nie ma błędów, zamknij modal po krótkim opóźnieniu
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
      console.error('Błąd podczas usuwania reguł:', err)
      setIsDeleting(false)
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      {/* Tło / Backdrop */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity"
      />

      {/* Okno modala GlassCard */}
      <GlassCard className="relative w-full max-w-lg p-0 overflow-hidden shadow-2xl border-white/60 dark:border-white/15 z-10">
        {/* Pasek akcentowy u góry */}
        <div className="h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />

        <div className="p-6 space-y-5">
          {/* Nagłówek modala */}
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
                    ? 'Usuń regułę dostępu'
                    : `Usuń ${count} zaznaczonych reguł`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Potwierdź operację usunięcia w Cloudflare
                </p>
              </div>
            </div>

            {!isDeleting && (
              <button
                type="button"
                onClick={handleClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                aria-label="Zamknij"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Stan: w trakcie usuwania z paskiem postępu */}
          {isDeleting ? (
            <div className="space-y-4 py-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                  Usuwanie z serwerów brzegowych ({progress.current} z {progress.total})...
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
                Współbieżność kontrolowana przez p-limit(5)
              </p>
            </div>
          ) : result ? (
            // Stan: po zakończeniu operacji z ewentualnymi błędami
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                Pomyślnie usunięto {result.successful.length} z {result.total} reguł.
              </div>

              {result.failed.length > 0 && (
                <div className="space-y-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400">
                    <XCircle className="w-3.5 h-3.5" />
                    Nie udało się usunąć {result.failed.length} reguł:
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
            // Stan: przed rozpoczęciem (potwierdzenie)
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p>
                Czy na pewno chcesz bezpowrotnie usunąć wybrane reguły z Cloudflare?
                Po zatwierdzeniu ruch sieciowy przestanie być filtrowany przez te reguły.
              </p>

              {/* Podgląd pojedynczej reguły */}
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

                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    {singleRule.scopeType === 'account' ? (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-indigo-500" /> Poziom konta
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-blue-500" /> Domena:{' '}
                        {singleRule.zoneName || singleRule.zoneId}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Podgląd wielu reguł (zwięzła lista) */}
              {!isSingle && (
                <div className="p-3 rounded-xl backdrop-blur-md bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 max-h-40 overflow-y-auto space-y-1.5">
                  {rules.slice(0, 8).map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between text-xs font-mono"
                    >
                      <span className="truncate max-w-[280px]">
                        {r.target}: {r.value}
                      </span>
                      <span className="text-[10px] uppercase font-semibold text-slate-500">
                        {r.scopeType === 'account' ? 'account' : r.zoneName || 'zone'}
                      </span>
                    </div>
                  ))}
                  {rules.length > 8 && (
                    <div className="text-[11px] text-slate-400 italic pt-1 text-center">
                      + {rules.length - 8} kolejnych reguł...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Przyciski w stopce */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/70 dark:border-white/10">
            {result ? (
              <GlassButton variant="glass" size="md" onClick={handleClose}>
                Zamknij
              </GlassButton>
            ) : (
              <>
                <GlassButton
                  variant="ghost"
                  size="md"
                  onClick={handleClose}
                  disabled={isDeleting}
                >
                  Anuluj
                </GlassButton>

                <GlassButton
                  variant="danger"
                  size="md"
                  onClick={handleConfirmDelete}
                  isLoading={isDeleting}
                  leftIcon={<Trash2 className="w-4 h-4" />}
                >
                  {isSingle ? 'Usuń regułę' : `Usuń ${count} reguł`}
                </GlassButton>
              </>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  )
}

export default ConfirmDeleteDialog
