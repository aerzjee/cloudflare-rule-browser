import React from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { RefreshCw } from 'lucide-react'
import type { FetchProgress } from '../../types/cloudflare'
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
                'p-4 sm:p-5 border-orange-500/30 dark:border-orange-500/20 shadow-lg shadow-orange-500/5',
                className
              )}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                  <span className="flex items-center gap-2 text-slate-800 dark:text-slate-200 truncate">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#f6821f] shrink-0" />
                    <span className="truncate">
                      {progress.label || 'Pobieranie danych z Cloudflare...'}
                    </span>
                  </span>
                  <span className="font-mono text-sm font-bold text-[#f6821f] shrink-0 ml-2">
                    {percentage}%
                  </span>
                </div>

                {/* Pasek postępu z płynną animacją */}
                <div className="w-full h-2.5 rounded-full bg-slate-200/80 dark:bg-slate-800/80 overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-[#f6821f] via-orange-500 to-amber-500 transition-all duration-300 ease-out rounded-full shadow-sm shadow-orange-500/30"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Opcjonalny wskaźnik liczbowy stron/domen */}
                {progress.total > 0 && progress.loaded > 0 && (
                  <div className="flex justify-end text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {progress.loaded} z {progress.total}
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
