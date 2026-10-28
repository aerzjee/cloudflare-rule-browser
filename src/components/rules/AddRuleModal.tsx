import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Building2,
  CheckCircle2,
  Clock,
  Cpu,
  Globe,
  Loader2,
  Plus,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  X,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import type {
  CloudflareAccessRuleMode,
  CreateRuleInput,
  NormalizedAccessRule,
} from '../../types/cloudflare'
import {
  bulkCreateAccessRules,
  detectTargetType,
  getRuleUniqueKey,
} from '../../api/accessRules'
import { useAuthStore } from '../../store/useAuthStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useHighlightStore } from '../../store/useHighlightStore'
import { useRateLimitStore } from '../../store/useRateLimitStore'
import { useAvailableScopes } from '../../hooks/useAvailableScopes'
import { setCachedRules } from '../../utils/rulesCache'
import { useTranslation } from '../../i18n/useTranslation'
import { GlassButton } from '../ui/GlassButton'
import { GlassCard } from '../ui/GlassCard'
import { cn } from '../../lib/utils'

export interface AddRuleModalProps {
  isOpen: boolean
  onClose: () => void
  rules?: NormalizedAccessRule[]
  onSuccess?: (newRules: NormalizedAccessRule[]) => void
}

interface ParsedLine {
  line: string
  detected: {
    target: 'ip' | 'ip6' | 'ip_range' | 'asn' | 'country'
    normalizedValue: string
  } | null
  lineNumber: number
}

const MODES: Array<{
  mode: CloudflareAccessRuleMode
  icon: React.ComponentType<{ className?: string }>
  activeClass: string
}> = [
  {
    mode: 'block',
    icon: Ban,
    activeClass:
      'bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/30',
  },
  {
    mode: 'managed_challenge',
    icon: ShieldAlert,
    activeClass:
      'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/30',
  },
  {
    mode: 'js_challenge',
    icon: Cpu,
    activeClass:
      'bg-orange-500/15 border-[#f6821f] text-[#f6821f] ring-2 ring-orange-500/30',
  },
  {
    mode: 'challenge',
    icon: ShieldQuestion,
    activeClass:
      'bg-yellow-500/15 border-yellow-500 text-yellow-600 dark:text-yellow-400 ring-2 ring-yellow-500/30',
  },
  {
    mode: 'whitelist',
    icon: ShieldCheck,
    activeClass:
      'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/30',
  },
]

export const AddRuleModal: React.FC<AddRuleModalProps> = ({
  isOpen,
  onClose,
  rules = [],
  onSuccess,
}) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const accountLevelOnly = useAuthStore((s) => s.accountLevelOnly)
  const concurrency = useSettingsStore((s) => s.concurrency)

  const { scopes, isLoading: isScopesLoading } = useAvailableScopes(rules)

  // Form states
  const [userSelectedScopeId, setUserSelectedScopeId] = useState<string>('')
  const [rawValues, setRawValues] = useState<string>('')
  const [selectedMode, setSelectedMode] = useState<CloudflareAccessRuleMode>('block')
  const [notes, setNotes] = useState<string>('')

  // Derived effective scope (avoids state-in-effect warning)
  const effectiveScopeId =
    userSelectedScopeId && scopes.some((s) => s.id === userSelectedScopeId)
      ? userSelectedScopeId
      : scopes[0]?.id || ''

  // Selected scope object
  const currentScope = useMemo(() => {
    return scopes.find((s) => s.id === effectiveScopeId) || scopes[0]
  }, [scopes, effectiveScopeId])

  // Submission & progress state
  const isThrottled = useRateLimitStore((s) => s.isThrottled)
  const throttleRemainingSeconds = useRateLimitStore((s) => s.throttleRemainingSeconds)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState<{ completed: number; total: number }>({
    completed: 0,
    total: 0,
  })
  const [submitErrors, setSubmitErrors] = useState<
    Array<{ value: string; message: string }>
  >([])
  const [submitSuccessCount, setSubmitSuccessCount] = useState<number>(0)

  const modalRef = useRef<HTMLDivElement>(null)

  // Clean reset upon closing the dialog
  const handleClose = useCallback(() => {
    if (isSubmitting) return
    setRawValues('')
    setSelectedMode('block')
    setNotes('')
    setSubmitErrors([])
    setSubmitSuccessCount(0)
    setUserSelectedScopeId('')
    setProgress({ completed: 0, total: 0 })
    onClose()
  }, [isSubmitting, onClose])

  // Close on Escape when not submitting
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting && isOpen) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, handleClose])

  // Parse lines and detect target types in real-time
  const parsedLines = useMemo<ParsedLine[]>(() => {
    const lines = rawValues.split('\n')
    const result: ParsedLine[] = []
    let lineNum = 0
    for (const line of lines) {
      lineNum++
      const trimmed = line.trim()
      if (!trimmed) continue
      result.push({
        line: trimmed,
        detected: detectTargetType(trimmed),
        lineNumber: lineNum,
      })
    }
    return result
  }, [rawValues])

  const validItems = useMemo(
    () => parsedLines.filter((p) => p.detected !== null),
    [parsedLines]
  )
  const invalidItems = useMemo(
    () => parsedLines.filter((p) => p.detected === null),
    [parsedLines]
  )

  // Breakdown of detected valid types
  const breakdownText = useMemo(() => {
    let ipv4 = 0
    let ipv6 = 0
    let cidr = 0
    let asn = 0
    let country = 0
    for (const item of validItems) {
      if (!item.detected) continue
      if (item.detected.target === 'ip') ipv4++
      else if (item.detected.target === 'ip6') ipv6++
      else if (item.detected.target === 'ip_range') cidr++
      else if (item.detected.target === 'asn') asn++
      else if (item.detected.target === 'country') country++
    }
    const parts: string[] = []
    if (ipv4 > 0) parts.push(`${ipv4} IPv4`)
    if (ipv6 > 0) parts.push(`${ipv6} IPv6`)
    if (cidr > 0) parts.push(`${cidr} CIDR`)
    if (asn > 0) parts.push(`${asn} ASN`)
    if (country > 0) parts.push(`${country} Country`)
    return parts.join(', ')
  }, [validItems])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validItems.length === 0 || isSubmitting || !currentScope) return

    setIsSubmitting(true)
    useSettingsStore.getState().setIsMutatingRules(true)
    setSubmitErrors([])
    setSubmitSuccessCount(0)
    setProgress({ completed: 0, total: validItems.length })

    // Build creation payloads
    const createPayloads: CreateRuleInput[] = validItems.map((item) => {
      const detected = item.detected!
      if (currentScope.type === 'account') {
        return {
          scopeType: 'account',
          accountId: currentScope.accountId,
          accountName: currentScope.accountName,
          mode: selectedMode,
          target: detected.target,
          value: detected.normalizedValue,
          notes: notes.trim(),
        }
      }
      return {
        scopeType: 'zone',
        zoneId: currentScope.zoneId,
        zoneName: currentScope.zoneName,
        accountId: currentScope.accountId,
        accountName: currentScope.accountName,
        mode: selectedMode,
        target: detected.target,
        value: detected.normalizedValue,
        notes: notes.trim(),
      }
    })

    try {
      const result = await bulkCreateAccessRules(
        createPayloads,
        concurrency,
        (completed, total) => {
          setProgress({ completed, total })
        }
      )

      setSubmitErrors(result.errors)
      setSubmitSuccessCount(result.createdRules.length)

      // Immediately prepend created rules to cache and IndexedDB without reloading whole table
      if (result.createdRules.length > 0) {
        queryClient.setQueriesData<NormalizedAccessRule[]>(
          { queryKey: ['cloudflare', 'access_rules'] },
          (old) => {
            const updated = [...result.createdRules, ...(old || [])]
            setCachedRules(accountLevelOnly, updated).catch((err) =>
              console.warn('[AddRuleModal] Error updating IndexedDB:', err)
            )
            return updated
          }
        )

        // Green blink animation on newly created rows
        const createdKeys = result.createdRules.map(getRuleUniqueKey)
        useHighlightStore.getState().highlightNewRules(createdKeys)

        onSuccess?.(result.createdRules)
      }

      if (result.errors.length === 0) {
        // Complete success: close modal after 600ms
        setTimeout(() => {
          handleClose()
        }, 600)
      } else {
        // Partial or total failure: retain only failed inputs in the textarea
        const failedValues = new Set(result.errors.map((e) => e.value.toLowerCase()))
        const remainingLines = parsedLines
          .filter((p) => p.detected && failedValues.has(p.detected.normalizedValue.toLowerCase()))
          .map((p) => p.line)
        setRawValues(remainingLines.join('\n'))
      }
    } catch (err) {
      console.error('[AddRuleModal] Unexpected error:', err)
      setSubmitErrors([
        {
          value: 'All',
          message: err instanceof Error ? err.message : 'Failed to create rules.',
        },
      ])
    } finally {
      setIsSubmitting(false)
      useSettingsStore.getState().setIsMutatingRules(false)
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-rule-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              if (!isSubmitting) handleClose()
            }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-2xl my-auto"
          >
            <GlassCard
              glow
              className="p-5 sm:p-6 shadow-2xl border-white/60 dark:border-white/10 max-h-[92vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-500/10 text-[#f6821f] border border-orange-500/20">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h2
                      id="add-rule-modal-title"
                      className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white"
                    >
                      {t.addRuleModal.title}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {t.addRuleModal.subtitle}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  aria-label={t.addRuleModal.btnClose}
                  className={cn(
                    'p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200',
                    'hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors cursor-pointer',
                    isSubmitting && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4">
                {/* 1. Scope selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>{t.addRuleModal.scopeTitle}</span>
                    {isScopesLoading && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {t.addRuleModal.loadingScopes}
                      </span>
                    )}
                  </label>

                  {accountLevelOnly ? (
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300">
                      <Building2 className="w-4 h-4 text-[#f6821f] shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold">
                          {currentScope ? currentScope.name : 'Account Level'}
                        </span>
                        <span className="ml-2 text-[11px] text-slate-400">
                          {t.addRuleModal.scopeAccountOnlyDesc}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={effectiveScopeId}
                        onChange={(e) => setUserSelectedScopeId(e.target.value)}
                        disabled={isSubmitting || scopes.length === 0}
                        aria-label={t.addRuleModal.scopeTitle}
                        className={cn(
                          'w-full h-10 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer appearance-none',
                          'backdrop-blur-md bg-white/70 dark:bg-slate-900/60',
                          'border border-slate-200/90 dark:border-white/10',
                          'text-slate-800 dark:text-slate-200 shadow-xs',
                          'focus:outline-none focus:ring-2 focus:ring-[#f6821f]/40 focus:border-[#f6821f]',
                          isSubmitting && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        {scopes.length === 0 ? (
                          <option value="">{t.addRuleModal.noScopes}</option>
                        ) : (
                          scopes.map((scope) => (
                            <option key={scope.id} value={scope.id}>
                              {scope.type === 'account'
                                ? t.addRuleModal.scopeAccountOption(scope.name)
                                : t.addRuleModal.scopeZoneOption(scope.name)}
                            </option>
                          ))
                        )}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                        {currentScope?.type === 'account' ? (
                          <Building2 className="w-4 h-4 text-[#f6821f]" />
                        ) : (
                          <Globe className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Values Textarea (Single / Bulk) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t.addRuleModal.valueTitle}
                    </label>
                    <span className="text-[11px] text-[#f6821f] font-medium bg-orange-500/10 px-2 py-0.5 rounded-md">
                      {t.addRuleModal.autoDetectBadge}
                    </span>
                  </div>

                  <textarea
                    rows={5}
                    value={rawValues}
                    onChange={(e) => setRawValues(e.target.value)}
                    disabled={isSubmitting}
                    placeholder={t.addRuleModal.valuePlaceholder}
                    className={cn(
                      'w-full p-3 rounded-xl font-mono text-xs sm:text-sm leading-relaxed transition-all duration-200',
                      'backdrop-blur-md bg-white/70 dark:bg-slate-900/60',
                      'border border-slate-200/90 dark:border-white/10',
                      'text-slate-800 dark:text-slate-200 shadow-inner',
                      'placeholder:text-slate-400/80 focus:outline-none focus:ring-2 focus:ring-[#f6821f]/40 focus:border-[#f6821f]',
                      invalidItems.length > 0 &&
                        'border-amber-500/60 focus:ring-amber-500/40 focus:border-amber-500'
                    )}
                  />

                  {/* Real-time validation summary */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs">
                    {validItems.length > 0 ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {t.addRuleModal.summaryValid(validItems.length)}{' '}
                          {breakdownText && t.addRuleModal.summaryBreakdown(breakdownText)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">
                        {t.addRuleModal.valueHelp}
                      </span>
                    )}

                    {invalidItems.length > 0 && (
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-md">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{t.addRuleModal.summaryInvalid(invalidItems.length)}</span>
                      </div>
                    )}
                  </div>

                  {/* Warning details for invalid lines */}
                  {invalidItems.length > 0 && (
                    <div className="text-[11px] text-amber-700 dark:text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 leading-relaxed">
                      {t.addRuleModal.invalidSamples(
                        invalidItems
                          .slice(0, 3)
                          .map((i) => `L${i.lineNumber}: "${i.line}"`)
                          .join(', ') + (invalidItems.length > 3 ? '...' : '')
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Action Mode Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t.addRuleModal.modeTitle}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {MODES.map(({ mode, icon: Icon, activeClass }) => {
                      const isSelected = selectedMode === mode
                      const label = t.modeDropdown.modes[mode].label
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setSelectedMode(mode)}
                          disabled={isSubmitting}
                          className={cn(
                            'flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer',
                            'backdrop-blur-md shadow-xs active:scale-95',
                            isSelected
                              ? activeClass
                              : 'bg-white/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-slate-800/80'
                          )}
                        >
                          <Icon className="w-4 h-4 mb-1 shrink-0" />
                          <span className="truncate max-w-full">{label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 4. Notes input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t.addRuleModal.notesTitle}
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {t.addRuleModal.charCount(notes.length, 500)}
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={500}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isSubmitting}
                    placeholder={t.addRuleModal.notesPlaceholder}
                    className={cn(
                      'w-full h-10 px-3 py-1.5 rounded-xl text-xs sm:text-sm transition-all duration-200',
                      'backdrop-blur-md bg-white/70 dark:bg-slate-900/60',
                      'border border-slate-200/90 dark:border-white/10',
                      'text-slate-800 dark:text-slate-200 shadow-xs',
                      'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f6821f]/40 focus:border-[#f6821f]'
                    )}
                  />
                </div>

                {/* Progress bar during bulk execution */}
                {isSubmitting && progress.total > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1.5 font-medium">
                        {isThrottled ? (
                          <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                        ) : (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#f6821f]" />
                        )}
                        {t.addRuleModal.progressText(
                          progress.completed,
                          progress.total,
                          Math.round((progress.completed / progress.total) * 100)
                        )}
                      </span>
                      {isThrottled && (
                        <span className="font-mono text-[11px] font-bold text-amber-500 animate-pulse">
                          {throttleRemainingSeconds}s
                        </span>
                      )}
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all duration-300',
                          isThrottled
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-500 animate-pulse'
                            : 'bg-linear-to-r from-orange-500 to-amber-500'
                        )}
                        style={{
                          width: `${Math.round((progress.completed / progress.total) * 100)}%`,
                        }}
                      />
                    </div>
                    {isThrottled && (
                      <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold animate-pulse mt-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{t.rateLimitWaiting.replace('{seconds}', String(throttleRemainingSeconds))}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Success Banner */}
                {submitSuccessCount > 0 && submitErrors.length === 0 && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{t.addRuleModal.resultSuccessAll(submitSuccessCount)}</span>
                  </div>
                )}

                {/* Error Banner & list */}
                {submitErrors.length > 0 && (
                  <div className="space-y-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>
                        {t.addRuleModal.resultPartial(submitSuccessCount, submitErrors.length)}
                      </span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 max-h-32 overflow-y-auto font-mono text-[11px] opacity-90 pl-1">
                      {submitErrors.map((err, i) => (
                        <li key={i}>
                          <span className="font-semibold">{err.value}:</span> {err.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </form>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-white/10 shrink-0">
                <GlassButton
                  type="button"
                  variant="glass"
                  size="md"
                  disabled={isSubmitting}
                  onClick={handleClose}
                >
                  {t.addRuleModal.btnCancel}
                </GlassButton>

                <GlassButton
                  type="button"
                  variant="primary"
                  size="md"
                  disabled={validItems.length === 0 || isSubmitting || !currentScope}
                  isLoading={isSubmitting}
                  onClick={handleSubmit}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  {isSubmitting
                    ? t.addRuleModal.btnSubmitting
                    : validItems.length > 1
                    ? t.addRuleModal.btnSubmitBulk(validItems.length)
                    : t.addRuleModal.btnSubmitSingle}
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

export default AddRuleModal
