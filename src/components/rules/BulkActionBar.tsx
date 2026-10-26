import React from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckSquare, Trash2, X } from 'lucide-react'
import { useTranslation } from '../../i18n/useTranslation'
import { GlassButton } from '../ui/GlassButton'
import { cn } from '../../lib/utils'

export interface BulkActionBarProps {
  selectedCount: number
  onClearSelection: () => void
  onDeleteSelected: () => void
  className?: string
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  onDeleteSelected,
  className,
}) => {
  const { t } = useTranslation()

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
            'w-[calc(100%-2rem)] sm:w-auto max-w-xl',
            'backdrop-blur-2xl bg-white/90 dark:bg-slate-900/90',
            'border border-white/60 dark:border-white/15',
            'shadow-2xl shadow-orange-500/10 dark:shadow-black/40',
            'rounded-2xl px-4 sm:px-6 py-3',
            'flex items-center justify-between sm:justify-start gap-3 sm:gap-5',
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
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              leftIcon={<X className="w-3.5 h-3.5" />}
            >
              <span>{t.bulk.deselect}</span>
            </GlassButton>

            <GlassButton
              variant="danger"
              size="sm"
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
