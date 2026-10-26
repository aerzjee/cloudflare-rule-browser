import React, { useState, useCallback } from 'react'
import {
  Cloud,
  KeyRound,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  Sparkles,
  Globe,
  Lock,
} from 'lucide-react'
import { GlassCard, GlassCardContent } from '../components/ui/GlassCard'
import { GlassInput } from '../components/ui/GlassInput'
import { GlassButton } from '../components/ui/GlassButton'
import { GlassSwitch } from '../components/ui/GlassSwitch'
import { AmbientBackground } from '../components/ui/AmbientBackground'
import { GlassNavbar } from '../components/layout/GlassNavbar'
import { useAuthStore, type AuthType } from '../store/useAuthStore'
import { useTranslation } from '../i18n/useTranslation'
import { cn } from '../lib/utils'

interface LoginFormErrors {
  email?: string
  token?: string
}

/**
 * Auto-detect whether a token is a Bearer API Token or a Global API Key.
 * CF API Tokens typically start with a specific prefix pattern and are longer,
 * while Global API Keys are 37-char hex strings.
 */
function detectAuthType(token: string): AuthType {
  const trimmed = token.trim()
  if (/^[0-9a-f]{37}$/i.test(trimmed)) return 'global_key'
  return 'bearer'
}

export const LandingPage: React.FC = () => {
  const { t } = useTranslation()
  const login = useAuthStore((s) => s.login)

  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [accountLevelOnly, setAccountLevelOnly] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [errors, setErrors] = useState<LoginFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const clearFieldError = useCallback((field: keyof LoginFormErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      const fieldErrors: LoginFormErrors = {}
      const trimmedEmail = email.trim()
      const trimmedToken = token.trim()

      if (!trimmedEmail) {
        fieldErrors.email = t.landing.emailRequired
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        fieldErrors.email = t.landing.emailInvalid
      }

      if (!trimmedToken) {
        fieldErrors.token = t.landing.tokenRequired
      } else if (trimmedToken.length < 6) {
        fieldErrors.token = t.landing.tokenMin
      }

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
        return
      }

      setErrors({})
      setIsSubmitting(true)

      // Brief delay for smooth entrance transition animation
      setTimeout(() => {
        const authType = detectAuthType(trimmedToken)
        login({
          email: trimmedEmail,
          token: trimmedToken,
          authType,
          accountLevelOnly,
        })
        setIsSubmitting(false)
      }, 500)
    },
    [email, token, accountLevelOnly, login, t]
  )

  return (
    <div className="relative min-h-screen flex flex-col selection:bg-orange-500/25">
      <AmbientBackground />

      {/* Top navigation bar with EN | PL language switcher and theme control */}
      <GlassNavbar />

      <div className="flex-1 flex items-center justify-center px-4 py-12 z-10">
        <div className="w-full max-w-md space-y-8">
          {/* Branding */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f6821f] to-[#ff9838] text-white shadow-xl shadow-orange-500/30">
                <Cloud className="w-8 h-8 fill-current" />
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white dark:border-slate-900" />
                </span>
              </div>
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                {t.landing.title}{' '}
                <span className="text-[#f6821f]">{t.landing.titleHighlight}</span>
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                {t.landing.subtitle}
              </p>
            </div>
          </div>

          {/* Login Card */}
          <GlassCard glow className="p-0 overflow-hidden">
            {/* Card Header Accent */}
            <div className="h-1 bg-gradient-to-r from-[#f6821f] via-indigo-500 to-blue-500" />

            <GlassCardContent className="px-6 py-8 sm:px-8">
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* Email */}
                <GlassInput
                  label={t.landing.emailLabel}
                  type="email"
                  placeholder={t.landing.emailPlaceholder}
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    clearFieldError('email')
                  }}
                  leftIcon={<Mail className="w-4 h-4" />}
                  error={errors.email}
                />

                {/* Token */}
                <GlassInput
                  label={t.landing.tokenLabel}
                  type={showToken ? 'text' : 'password'}
                  placeholder={t.landing.tokenPlaceholder}
                  autoComplete="current-password"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value)
                    clearFieldError('token')
                  }}
                  leftIcon={<KeyRound className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowToken((v) => !v)}
                      className="cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                      tabIndex={-1}
                      aria-label={showToken ? t.landing.hideToken : t.landing.showToken}
                    >
                      {showToken ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  }
                  error={errors.token}
                  helperText={
                    token
                      ? t.landing.tokenDetected(detectAuthType(token))
                      : t.landing.tokenAutoDetect
                  }
                />

                {/* Account Level Only toggle */}
                <div className="pt-1">
                  <GlassSwitch
                    checked={accountLevelOnly}
                    onChange={setAccountLevelOnly}
                    size="md"
                    label={t.landing.accountLevelOnly}
                    description={t.landing.accountLevelOnlyDesc}
                  />
                </div>

                {/* Submit */}
                <GlassButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  isLoading={isSubmitting}
                  leftIcon={<LogIn className="w-5 h-5" />}
                >
                  {t.landing.connectButton}
                </GlassButton>
              </form>
            </GlassCardContent>
          </GlassCard>

          {/* Footer info pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px]">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                'backdrop-blur-md bg-white/50 dark:bg-slate-900/40',
                'border border-white/60 dark:border-white/10',
                'text-slate-500 dark:text-slate-400'
              )}
            >
              <Lock className="w-3 h-3 text-emerald-500" />
              {t.landing.footerEncrypted}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                'backdrop-blur-md bg-white/50 dark:bg-slate-900/40',
                'border border-white/60 dark:border-white/10',
                'text-slate-500 dark:text-slate-400'
              )}
            >
              <ShieldCheck className="w-3 h-3 text-orange-500" />
              {t.landing.footerProxy}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                'backdrop-blur-md bg-white/50 dark:bg-slate-900/40',
                'border border-white/60 dark:border-white/10',
                'text-slate-500 dark:text-slate-400'
              )}
            >
              <Globe className="w-3 h-3 text-indigo-500" />
              {t.landing.footerCsp}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                'backdrop-blur-md bg-white/50 dark:bg-slate-900/40',
                'border border-white/60 dark:border-white/10',
                'text-slate-500 dark:text-slate-400'
              )}
            >
              <Sparkles className="w-3 h-3 text-blue-500" />
              {t.landing.footerZeroData}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LandingPage
