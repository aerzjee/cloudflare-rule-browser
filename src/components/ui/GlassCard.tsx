import React, { forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean
  glow?: boolean
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, hoverEffect = false, glow = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative rounded-2xl p-6 transition-all duration-300',
          'backdrop-blur-xl bg-white/65 dark:bg-slate-900/60',
          'border border-white/40 dark:border-white/10 shadow-xl',
          hoverEffect &&
            'hover:shadow-2xl hover:border-orange-500/30 dark:hover:border-orange-500/20 hover:-translate-y-0.5',
          glow &&
            'after:absolute after:-inset-px after:rounded-2xl after:pointer-events-none after:bg-gradient-to-r after:from-orange-500/10 after:to-indigo-500/10 after:opacity-50',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

GlassCard.displayName = 'GlassCard'

export const GlassCardHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 pb-4', className)}
    {...props}
  />
))
GlassCardHeader.displayName = 'GlassCardHeader'

export const GlassCardTitle = forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight text-slate-900 dark:text-slate-100',
      className
    )}
    {...props}
  >
    {children}
  </h3>
))
GlassCardTitle.displayName = 'GlassCardTitle'

export const GlassCardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-slate-500 dark:text-slate-400', className)}
    {...props}
  />
))
GlassCardDescription.displayName = 'GlassCardDescription'

export const GlassCardContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('pt-0', className)} {...props} />
))
GlassCardContent.displayName = 'GlassCardContent'

export const GlassCardFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4', className)}
    {...props}
  />
))
GlassCardFooter.displayName = 'GlassCardFooter'

export default GlassCard
