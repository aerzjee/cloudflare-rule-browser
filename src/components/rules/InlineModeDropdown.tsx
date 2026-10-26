import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  Ban,
  Check,
  ChevronDown,
  Cpu,
  Loader2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
} from 'lucide-react'
import type {
  CloudflareAccessRuleMode,
  NormalizedAccessRule,
} from '../../types/cloudflare'
import { useTranslation } from '../../i18n/useTranslation'
import { useUpdateAccessRule } from '../../hooks/useUpdateAccessRule'
import { cn } from '../../lib/utils'

export interface InlineModeDropdownProps {
  rule: NormalizedAccessRule
  className?: string
  onUpdate?: (
    rule: NormalizedAccessRule,
    mode: CloudflareAccessRuleMode
  ) => Promise<unknown>
}

interface ModeVisualConfig {
  badgeClass: string
  dotClass: string
  icon: React.ComponentType<{ className?: string }>
}

const MODE_VISUALS: Record<CloudflareAccessRuleMode, ModeVisualConfig> = {
  block: {
    badgeClass:
      'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:border-rose-500/60 shadow-rose-500/10',
    dotClass: 'bg-rose-500',
    icon: Ban,
  },
  managed_challenge: {
    badgeClass:
      'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:border-amber-500/60 shadow-amber-500/10',
    dotClass: 'bg-amber-500',
    icon: ShieldAlert,
  },
  js_challenge: {
    badgeClass:
      'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 hover:border-orange-500/60 shadow-orange-500/10',
    dotClass: 'bg-orange-500',
    icon: Cpu,
  },
  challenge: {
    badgeClass:
      'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 hover:border-yellow-500/60 shadow-yellow-500/10',
    dotClass: 'bg-yellow-500',
    icon: ShieldQuestion,
  },
  whitelist: {
    badgeClass:
      'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:border-emerald-500/60 shadow-emerald-500/10',
    dotClass: 'bg-emerald-500',
    icon: ShieldCheck,
  },
}

export const InlineModeDropdown: React.FC<InlineModeDropdownProps> = ({
  rule,
  className,
  onUpdate,
}) => {
  const { t } = useTranslation()
  const { mutateRule } = useUpdateAccessRule()
  const [isOpen, setIsOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [justUpdated, setJustUpdated] = useState(false)
  const [showSuccessText, setShowSuccessText] = useState(false)

  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [coords, setCoords] = useState<{ top: number; left: number; showAbove: boolean }>({
    top: 0,
    left: 0,
    showAbove: false,
  })

  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Clear micro-animation timers on unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }, [])

  const currentMode = rule.mode.toLowerCase() as CloudflareAccessRuleMode
  const visual = MODE_VISUALS[currentMode] || {
    badgeClass:
      'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-400/20 hover:border-slate-400/40',
    dotClass: 'bg-slate-400',
    icon: Shield,
  }

  const modeTranslation = t.modeDropdown.modes[currentMode]
  const modeLabel = modeTranslation?.label || rule.mode
  const Icon = visual.icon

  // Calculate viewport coordinates for Portal rendering
  const updatePosition = () => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const estimatedHeight = 240
    const showAbove = spaceBelow < estimatedHeight && rect.top > estimatedHeight

    const top = showAbove
      ? rect.top + window.scrollY - 6
      : rect.bottom + window.scrollY + 6
    const left = Math.max(12, Math.min(window.innerWidth - 270, rect.left + window.scrollX))

    setCoords({ top, left, showAbove })
  }

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isUpdating) return
    if (!isOpen) {
      updatePosition()
    }
    setIsOpen((prev) => !prev)
  }

  // Close on click outside, scroll, or resize
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleScrollOrResize = () => {
      setIsOpen(false)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = async (modeKey: CloudflareAccessRuleMode, e: React.MouseEvent) => {
    e.stopPropagation()
    if (modeKey === currentMode) {
      setIsOpen(false)
      return
    }

    setIsOpen(false)
    setIsUpdating(true)

    try {
      if (onUpdate) {
        await onUpdate(rule, modeKey)
      } else {
        await mutateRule(rule, { mode: modeKey })
      }

      // Animacja potwierdzenia sukcesu
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)

      setJustUpdated(true)
      setShowSuccessText(true)

      successTimerRef.current = setTimeout(() => {
        setShowSuccessText(false)
      }, 650)

      resetTimerRef.current = setTimeout(() => {
        setJustUpdated(false)
      }, 950)
    } catch (err) {
      console.error('Error while updating rule mode:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className={cn('relative inline-flex items-center', className)}>
      {/* Inline action mode badge button with elastic feedback animation */}
      <motion.button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        disabled={isUpdating}
        title={t.modeDropdown.clickToChange}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        animate={
          justUpdated
            ? { scale: [1, 1.12, 0.97, 1] }
            : { scale: 1 }
        }
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'relative group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold',
          'backdrop-blur-md border shadow-sm transition-colors duration-200 cursor-pointer select-none',
          'active:scale-95 hover:shadow-md',
          visual.badgeClass,
          isUpdating && 'opacity-80 cursor-wait'
        )}
      >
        {/* Expanding & fading glow ring in the color of the selected mode */}
        {justUpdated && (
          <motion.span
            key="glow-ring"
            initial={{ opacity: 0.75, scale: 0.95 }}
            animate={{ opacity: 0, scale: 1.35 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-0 rounded-lg border-2 border-current"
          />
        )}

        <AnimatePresence mode="wait" initial={false}>
          {isUpdating ? (
            <motion.span
              key="updating"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.15 }}
              className="inline-flex items-center gap-1.5"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
              <span>{t.modeDropdown.saving}</span>
            </motion.span>
          ) : showSuccessText ? (
            <motion.span
              key="success"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>{t.modeDropdown.saved}</span>
            </motion.span>
          ) : (
            <motion.span
              key={`mode-${currentMode}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="inline-flex items-center gap-1.5"
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{modeLabel}</span>
            </motion.span>
          )}
        </AnimatePresence>

        <ChevronDown
          className={cn(
            'w-3 h-3 opacity-60 group-hover:opacity-100 transition-transform duration-200 shrink-0',
            isOpen && 'rotate-180'
          )}
        />
      </motion.button>

      {/* Glass dropdown rendered into document.body via Portal */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                ref={menuRef}
                initial={{
                  opacity: 0,
                  scale: 0.95,
                  y: coords.showAbove ? 6 : -6,
                }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.95,
                  y: coords.showAbove ? 6 : -6,
                }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: 'absolute',
                  top: coords.showAbove ? undefined : `${coords.top}px`,
                  bottom: coords.showAbove
                    ? `${window.innerHeight - coords.top + window.scrollY}px`
                    : undefined,
                  left: `${coords.left}px`,
                  zIndex: 9999,
                }}
                className={cn(
                  'w-64 rounded-2xl p-1.5 shadow-2xl overflow-hidden',
                  'backdrop-blur-2xl bg-white/95 dark:bg-slate-900/95',
                  'border border-white/60 dark:border-white/15',
                  'shadow-slate-950/20 dark:shadow-black/70'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200/60 dark:border-white/5">
                  {t.table.colMode}
                </div>

                <div className="py-1 space-y-0.5">
                  {(
                    Object.keys(MODE_VISUALS) as CloudflareAccessRuleMode[]
                  ).map((modeKey) => {
                    const opt = MODE_VISUALS[modeKey]
                    const isSelected = modeKey === currentMode
                    const ItemIcon = opt.icon
                    const trans = t.modeDropdown.modes[modeKey]

                    return (
                      <button
                        key={modeKey}
                        type="button"
                        onClick={(e) => handleSelect(modeKey, e)}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all duration-150 cursor-pointer',
                          isSelected
                            ? 'bg-orange-500/10 text-[#f6821f] font-semibold'
                            : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={cn(
                              'w-2 h-2 rounded-full shrink-0',
                              opt.dotClass
                            )}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="flex items-center gap-1.5 text-xs font-medium truncate">
                              <ItemIcon className="w-3.5 h-3.5 shrink-0" />
                              {trans?.label || modeKey}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate">
                              {trans?.desc || ''}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-[#f6821f] shrink-0 ml-2" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  )
}

export default InlineModeDropdown
