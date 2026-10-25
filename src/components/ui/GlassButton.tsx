import React, { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

export type ButtonVariant =
  | 'primary'
  | 'glass'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon'

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  (
    {
      className,
      variant = 'glass',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-gradient-to-r from-[#f6821f] to-[#ff9b40] text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:brightness-105 border border-orange-400/40 active:scale-[0.98]',
      glass:
        'backdrop-blur-md bg-white/70 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 border border-white/60 dark:border-white/10 hover:bg-white/90 dark:hover:bg-slate-800/90 shadow-md shadow-black/5 hover:shadow-lg active:scale-[0.98]',
      secondary:
        'backdrop-blur-md bg-slate-100/90 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 active:scale-[0.98]',
      outline:
        'backdrop-blur-sm border border-slate-300/80 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/50 active:scale-[0.98]',
      ghost:
        'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white',
      danger:
        'backdrop-blur-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500/20 active:scale-[0.98]',
    }

    const sizeStyles: Record<ButtonSize, string> = {
      xs: 'h-7 px-2.5 text-xs rounded-lg gap-1.5',
      sm: 'h-8 px-3 text-xs font-medium rounded-lg gap-1.5',
      md: 'h-10 px-4 text-sm font-medium rounded-xl gap-2',
      lg: 'h-12 px-6 text-base font-medium rounded-xl gap-2.5',
      icon: 'h-9 w-9 rounded-xl p-0 justify-center',
    }

    const isDisabled = disabled || isLoading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center font-medium select-none transition-all duration-200 cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6821f]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
          variantStyles[variant],
          sizeStyles[size],
          isDisabled &&
            'opacity-50 cursor-not-allowed pointer-events-none shadow-none active:scale-100',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    )
  }
)

GlassButton.displayName = 'GlassButton'

export default GlassButton
