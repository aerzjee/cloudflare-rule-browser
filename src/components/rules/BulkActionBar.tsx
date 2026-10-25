import React from 'react'
import { CheckSquare, Trash2, X } from 'lucide-react'
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
  if (selectedCount === 0) return null

  return (
    <aside
      role="region"
      aria-label="Pasek akcji masowych"
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-40',
        'w-[calc(100%-2rem)] sm:w-auto max-w-xl',
        'backdrop-blur-2xl bg-white/90 dark:bg-slate-900/90',
        'border border-white/60 dark:border-white/15',
        'shadow-2xl shadow-orange-500/10 dark:shadow-black/40',
        'rounded-2xl px-4 sm:px-6 py-3',
        'flex items-center justify-between sm:justify-start gap-3 sm:gap-5',
        'animate-in fade-in slide-in-from-bottom-5 duration-300',
        className
      )}
    >
      {/* Licznik zaznaczonych elementów */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-orange-500/15 text-[#f6821f] shrink-0">
          <CheckSquare className="w-4 h-4" />
        </div>
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
            {selectedCount}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {selectedCount === 1
              ? 'zaznaczona reguła'
              : selectedCount < 5
              ? 'zaznaczone reguły'
              : 'zaznaczonych reguł'}
          </span>
        </div>
      </div>

      <div className="h-5 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />

      {/* Przyciski akcji */}
      <div className="flex items-center gap-2 shrink-0">
        <GlassButton
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          leftIcon={<X className="w-3.5 h-3.5" />}
        >
          <span className="hidden sm:inline">Odznacz</span>
          <span className="sm:hidden">Wyczyść</span>
        </GlassButton>

        <GlassButton
          variant="danger"
          size="sm"
          onClick={onDeleteSelected}
          leftIcon={<Trash2 className="w-4 h-4" />}
          className="shadow-md shadow-red-500/20"
        >
          Usuń ({selectedCount})
        </GlassButton>
      </div>
    </aside>
  )
}

export default BulkActionBar
