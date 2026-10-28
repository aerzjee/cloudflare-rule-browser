import React from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Clock, RefreshCw } from 'lucide-react'
import type { FetchProgress } from '../../types/cloudflare'
import { useRateLimitStore } from '../../store/useRateLimitStore'
import { useTranslation } from '../../i18n/useTranslation'
import { GlassCard } from './GlassCard'
import { cn } from '../../lib/utils'

export interface ProgressBarProps {
  progress: FetchProgress
  isVisible?: boolean
  className?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  isVisible = true,
  className,
}) => {
  const { t } = useTranslation()
  const isThrottled = useRateLimitStore((s) => s.isThrottled)
  const throttleRemainingSeconds = useRateLimitStore((s) => s.throttleRemainingSeconds)

  const percentage = Math.min(100, Math.max(0, progress.percentage))

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, height: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, height: 'auto', y: 0, scale: 1 }}
          exit={{ opacity: 0, height: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden w-full"
        >
          <div className="py-1">
            <GlassCard
              className={cn(
                'p-4 sm:p-5 transition-colors duration-300',
                isThrottled
                  ? 'border-amber-500/40 dark:border-amber-500/30 shadow-lg shadow-amber-500/10'
                  : 'border-orange-500/30 dark:border-orange-500/20 shadow-lg shadow-orange-500/5',
                className
              )}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                  <span className="flex items-center gap-2 text-slate-800 dark:text-slate-200 truncate">
                    {isThrottled ? (
                      <Clock className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
                    ) : (
                      <RefreshCw className="w-4 h-4 animate-spin text-[#f6821f] shrink-0" />
                    )}
                    <span
                      className={cn(
                        'truncate',
                        isThrottled && 'text-amber-600 dark:text-amber-400 font-semibold'
                      )}
                    >
                      {isThrottled
                        ? t.rateLimitWaiting.replace('{seconds}', String(throttleRemainingSeconds))
                        : progress.label || 'Loading Cloudflare data...'}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'font-mono text-sm font-bold shrink-0 ml-2',
                      isThrottled ? 'text-amber-500' : 'text-[#f6821f]'
                    )}
                  >
                    {percentage}%
                  </span>
                </div>

                {/* Animated progress track and fill bar */}
                <div className="w-full h-2.5 rounded-full bg-slate-200/80 dark:bg-slate-800/80 overflow-hidden shadow-inner">
                  <div
                    className={cn(
                      'h-full transition-all duration-300 ease-out rounded-full shadow-sm',
                      isThrottled
                        ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 animate-pulse shadow-amber-500/30'
                        : 'bg-gradient-to-r from-[#f6821f] via-orange-500 to-amber-500 shadow-orange-500/30'
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Optional page/zone count indicator */}
                {progress.total > 0 && progress.loaded > 0 && (
                  <div className="flex justify-end text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {progress.loaded} / {progress.total}
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ProgressBar
