import React, { forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface GlassSwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean
  onChange?: (checked: boolean) => void
  size?: 'sm' | 'md' | 'lg'
  label?: string
  description?: string
  iconOn?: React.ReactNode
  iconOff?: React.ReactNode
}

export const GlassSwitch = forwardRef<HTMLButtonElement, GlassSwitchProps>(
  (
    {
      checked,
      onChange,
      size = 'md',
      label,
      description,
      iconOn,
      iconOff,
      disabled = false,
      className,
      ...props
    },
    ref
  ) => {
    const handleToggle = () => {
      if (!disabled && onChange) {
        onChange(!checked)
      }
    }

    const sizeStyles = {
      sm: {
        track: 'w-9 h-5 px-0.5',
        thumb: 'w-4 h-4',
        translate: 'translate-x-4',
      },
      md: {
        track: 'w-12 h-6 px-0.5',
        thumb: 'w-5 h-5',
        translate: 'translate-x-6',
      },
      lg: {
        track: 'w-16 h-8 px-1',
        thumb: 'w-6 h-6',
        translate: 'translate-x-8',
      },
    }[size]

    const switchElement = (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          'relative inline-flex shrink-0 items-center rounded-full transition-all duration-300 ease-in-out cursor-pointer',
          'backdrop-blur-md border outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
          sizeStyles.track,
          checked
            ? 'bg-[#f6821f] border-orange-400/80 shadow-md shadow-orange-500/30'
            : 'bg-slate-200/80 dark:bg-slate-800/80 border-slate-300/70 dark:border-white/10 shadow-inner',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        {...props}
      >
        <span
          className={cn(
            'pointer-events-none inline-flex items-center justify-center rounded-full bg-white dark:bg-slate-100 shadow-md transform transition-all duration-300 ease-out text-slate-700',
            sizeStyles.thumb,
            checked ? sizeStyles.translate : 'translate-x-0'
          )}
        >
          {checked ? iconOn : iconOff}
        </span>
      </button>
    )

    if (!label && !description) {
      return switchElement
    }

    return (
      <label
        className={cn(
          'inline-flex items-center gap-3 select-none',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        )}
      >
        {switchElement}
        <div className="flex flex-col">
          {label && (
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {description}
            </span>
          )}
        </div>
      </label>
    )
  }
)

GlassSwitch.displayName = 'GlassSwitch'

export default GlassSwitch
