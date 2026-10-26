import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  Calendar,
  Check,
  Copy,
  GitBranch,
  GitCommit,
  History,
  Sparkles,
  Tag,
  X,
} from 'lucide-react'
import rawChangelog from '../../generated/changelog.json'
import type { ChangelogData, ChangelogRelease } from '../../types/changelog'
import { useTranslation } from '../../i18n/useTranslation'
import { GlassButton } from '../ui/GlassButton'
import { GlassCard } from '../ui/GlassCard'
import { cn } from '../../lib/utils'

export interface ChangelogModalProps {
  isOpen: boolean
  onClose: () => void
}

const changelogData = rawChangelog as unknown as ChangelogData
const allReleases: ChangelogRelease[] = changelogData?.releases || []
const totalCommitsCount = allReleases.reduce((acc, r) => acc + (r.changes?.length || 0), 0)

interface TypeBadgeConfig {
  label: string
  className: string
}

const TYPE_CONFIGS: Record<string, TypeBadgeConfig> = {
  feat: {
    label: 'FEAT',
    className:
      'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  fix: {
    label: 'FIX',
    className:
      'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  },
  perf: {
    label: 'PERF',
    className:
      'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  },
  refactor: {
    label: 'REFACTOR',
    className:
      'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  },
  docs: {
    label: 'DOCS',
    className:
      'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
  },
  style: {
    label: 'STYLE',
    className:
      'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30',
  },
  chore: {
    label: 'CHORE',
    className:
      'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
  },
  build: {
    label: 'BUILD',
    className:
      'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  ci: {
    label: 'CI',
    className:
      'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
  test: {
    label: 'TEST',
    className:
      'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
  },
}

function getTypeBadge(type: string): TypeBadgeConfig {
  const normalized = type.toLowerCase()
  return (
    TYPE_CONFIGS[normalized] || {
      label: type.toUpperCase(),
      className:
        'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-400/30',
    }
  )
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation()
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all')
  const [copiedHash, setCopiedHash] = useState<string | null>(null)

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const copyHash = (hash: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(hash)
    setCopiedHash(hash)
    setTimeout(() => {
      setCopiedHash((prev) => (prev === hash ? null : prev))
    }, 1500)
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="changelog-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
        >
          {/* Backdrop overlay */}
          <motion.div
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          {/* Modal dialog window */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="relative w-full max-w-2xl z-10 my-8"
          >
            <GlassCard className="p-0 overflow-hidden shadow-2xl border-white/60 dark:border-white/15">
              {/* Top gradient accent bar in Cloudflare & Neon colors */}
              <div className="h-1.5 bg-gradient-to-r from-[#f6821f] via-rose-500 to-indigo-500" />

              <div className="p-6 space-y-6">
                {/* Modal header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-orange-500/10 text-[#f6821f] border border-orange-500/20 shadow-sm">
                      <History className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3
                          id="changelog-modal-title"
                          className="text-lg font-bold text-slate-900 dark:text-white"
                        >
                          {t.changelog.title}
                        </h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-orange-500/10 text-[#f6821f] border border-orange-500/20">
                          <Tag className="w-3 h-3" />
                          v{changelogData.latestVersion}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {t.changelog.subtitle(totalCommitsCount, allReleases.length, changelogData.latestCommit)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    aria-label={t.common.close}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Change type filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedTypeFilter('all')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer shrink-0',
                      selectedTypeFilter === 'all'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                        : 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                    )}
                  >
                    {t.changelog.all(totalCommitsCount)}
                  </button>
                  {['feat', 'fix', 'perf', 'chore'].map((typeKey) => {
                    const cfg = getTypeBadge(typeKey)
                    const count = allReleases.reduce(
                      (acc, r) =>
                        acc +
                        (r.changes?.filter((c) => c.type === typeKey).length || 0),
                      0
                    )
                    if (count === 0) return null
                    return (
                      <button
                        key={typeKey}
                        type="button"
                        onClick={() => setSelectedTypeFilter(typeKey)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer shrink-0 border',
                          selectedTypeFilter === typeKey
                            ? cn(cfg.className, 'font-bold shadow-sm ring-1 ring-current')
                            : 'border-transparent bg-slate-200/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                        )}
                      >
                        {cfg.label} ({count})
                      </button>
                    )
                  })}
                </div>

                {/* Scrollable releases list */}
                <div className="max-h-[62vh] overflow-y-auto space-y-6 pr-1 divide-y divide-slate-200/60 dark:divide-white/10">
                  {allReleases.map((release: ChangelogRelease, releaseIdx: number) => {
                    const filteredChanges =
                      selectedTypeFilter === 'all'
                        ? release.changes
                        : release.changes.filter(
                            (c) => c.type === selectedTypeFilter
                          )

                    if (filteredChanges.length === 0 && selectedTypeFilter !== 'all') {
                      return null
                    }

                    const isUnreleased = release.tag === 'HEAD' || release.version.includes('Unreleased')

                    return (
                      <div
                        key={release.tag || release.version || releaseIdx}
                        className={cn('space-y-3.5', releaseIdx > 0 && 'pt-5')}
                      >
                        {/* Release header */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs',
                                isUnreleased
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                  : 'bg-orange-500/15 text-[#f6821f] dark:text-[#ff9838] border-orange-500/30'
                              )}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              {release.tag || `v${release.version}`}
                            </span>

                            {isUnreleased && (
                              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                {t.changelog.unreleased}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 opacity-70" />
                              {release.date}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="inline-flex items-center gap-1 font-mono">
                              <GitCommit className="w-3.5 h-3.5 text-[#f6821f]" />
                              {release.commit}
                            </span>
                          </div>
                        </div>

                        {/* List of individual commits in release */}
                        <div className="space-y-2">
                          {filteredChanges.map((change, changeIdx) => {
                            const badge = getTypeBadge(change.type)
                            const isCopied = copiedHash === change.hash

                            return (
                              <div
                                key={`${change.hash}-${changeIdx}`}
                                className="group flex items-start justify-between gap-3 p-2.5 rounded-xl transition-all duration-150 backdrop-blur-xs bg-slate-100/60 dark:bg-slate-900/40 hover:bg-white/80 dark:hover:bg-slate-800/60 border border-slate-200/50 dark:border-white/5"
                              >
                                <div className="flex items-start gap-2.5 min-w-0">
                                  {/* Commit type badge */}
                                  <span
                                    className={cn(
                                      'shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold border tracking-wider',
                                      badge.className
                                    )}
                                  >
                                    {badge.label}
                                  </span>

                                  {/* Commit message description */}
                                  <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed break-words">
                                    {change.scope && (
                                      <span className="font-semibold text-slate-900 dark:text-white mr-1.5">
                                        {change.scope}:
                                      </span>
                                    )}
                                    <span>{change.message}</span>
                                  </div>
                                </div>

                                {/* Copy commit hash button */}
                                <button
                                  type="button"
                                  onClick={(e) => copyHash(change.hash, e)}
                                  title={t.changelog.copyCommit}
                                  className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-300/50 dark:hover:bg-slate-700/50 border border-slate-300/40 dark:border-white/10 transition-colors cursor-pointer"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-500" />
                                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                        {t.changelog.copied}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span>{change.hash}</span>
                                      <Copy className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
                                    </>
                                  )}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Modal footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200/70 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-[#f6821f]" />
                    <span>{t.changelog.generatedFromGit}</span>
                  </div>

                  <GlassButton variant="primary" size="md" onClick={onClose}>
                    {t.common.close}
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

export default ChangelogModal
