import React from 'react'

export interface AmbientBackgroundProps {
  className?: string
  children?: React.ReactNode
}

export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({
  className = '',
  children,
}) => {
  return (
    <div
      className={`fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-slate-50 dark:bg-slate-950 transition-colors duration-500 ${className}`}
      aria-hidden="true"
    >
      {/* Cloudflare Orange gradient orb (Top Left / Center) */}
      <div
        className="absolute -top-[15%] left-[5%] md:left-[15%] w-[38rem] h-[38rem] rounded-full blur-[100px] md:blur-[140px] opacity-25 dark:opacity-20 animate-pulse transition-all duration-1000"
        style={{
          background:
            'radial-gradient(circle, #f6821f 0%, rgba(246, 130, 31, 0.4) 50%, transparent 75%)',
          animationDuration: '9s',
        }}
      />

      {/* Indigo gradient orb (Top Right) */}
      <div
        className="absolute top-[5%] -right-[10%] md:right-[5%] w-[42rem] h-[42rem] rounded-full blur-[110px] md:blur-[150px] opacity-20 dark:opacity-25 transition-all duration-1000"
        style={{
          background:
            'radial-gradient(circle, #6366f1 0%, rgba(99, 102, 241, 0.35) 55%, transparent 75%)',
        }}
      />

      {/* Blue / Sky gradient orb (Bottom Left / Center) */}
      <div
        className="absolute -bottom-[15%] left-[10%] md:left-[25%] w-[45rem] h-[45rem] rounded-full blur-[120px] md:blur-[160px] opacity-20 dark:opacity-20 transition-all duration-1000"
        style={{
          background:
            'radial-gradient(circle, #3b82f6 0%, rgba(59, 130, 246, 0.3) 50%, transparent 80%)',
        }}
      />

      {/* Subtle secondary Cloudflare orange glow at bottom right */}
      <div
        className="absolute bottom-[10%] -right-[5%] w-[28rem] h-[28rem] rounded-full blur-[100px] opacity-15 dark:opacity-15 transition-all duration-1000"
        style={{
          background:
            'radial-gradient(circle, #f6821f 0%, rgba(246, 130, 31, 0.2) 60%, transparent 80%)',
        }}
      />

      {/* Micro-dot grid texture for premium depth */}
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(100, 116, 139, 0.25) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {children}
    </div>
  )
}

export default AmbientBackground
