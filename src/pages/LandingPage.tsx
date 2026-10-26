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
  Sun,
  Moon,
  ChevronDown,
  AlertTriangle,
  Server,
} from 'lucide-react'
import { GlassCard, GlassCardContent } from '../components/ui/GlassCard'
import { GlassInput } from '../components/ui/GlassInput'
import { GlassButton } from '../components/ui/GlassButton'
import { GlassSwitch } from '../components/ui/GlassSwitch'
import { AmbientBackground } from '../components/ui/AmbientBackground'
import { useAuthStore, type AuthType } from '../store/useAuthStore'
import { useThemeStore } from '../store/useThemeStore'
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
  const { t, language, setLanguage } = useTranslation()
  const { theme, toggleTheme } = useThemeStore()
  const isDark = theme === 'dark'
  const login = useAuthStore((s) => s.login)
  const storedProxyUrl = useAuthStore((s) => s.proxyUrl)
  const setProxyUrl = useAuthStore((s) => s.setProxyUrl)

  const isGitHubPages =
    typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')

  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [accountLevelOnly, setAccountLevelOnly] = useState(false)
  const [proxyUrlInput, setProxyUrlInput] = useState(storedProxyUrl || '/api/cf')
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(
    () => isGitHubPages && (!storedProxyUrl || storedProxyUrl === '/api/cf')
  )
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
        const cleanProxy = proxyUrlInput.trim() || '/api/cf'
        setProxyUrl(cleanProxy)
        login({
          email: trimmedEmail,
          token: trimmedToken,
          authType,
          accountLevelOnly,
          proxyUrl: cleanProxy,
        })
        setIsSubmitting(false)
      }, 500)
    },
    [email, token, accountLevelOnly, proxyUrlInput, setProxyUrl, login, t]
  )

  return (
    <div className="relative min-h-screen flex flex-col selection:bg-orange-500/25">
      <AmbientBackground />

      {/* Floating Header Controls: Language switcher and Theme toggle */}
      <header className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-2 sm:gap-3">
        {/* Language switch EN | PL */}
        <div
          role="group"
          aria-label={t.navbar.language}
          className="flex items-center p-0.5 rounded-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/40 dark:border-white/10 text-xs font-semibold shadow-xs"
        >
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={cn(
              'px-2.5 py-1 rounded-lg transition-all cursor-pointer font-mono text-[11px]',
              language === 'en'
                ? 'bg-gradient-to-br from-[#f6821f] to-[#ff9838] text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            )}
            aria-label="Switch to English"
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLanguage('pl')}
            className={cn(
              'px-2.5 py-1 rounded-lg transition-all cursor-pointer font-mono text-[11px]',
              language === 'pl'
                ? 'bg-gradient-to-br from-[#f6821f] to-[#ff9838] text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            )}
            aria-label="Przełącz na język polski"
          >
            PL
          </button>
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title={isDark ? t.navbar.light : t.navbar.dark}
          aria-label={t.navbar.toggleTheme}
          className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/40 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-xs cursor-pointer transition-all active:scale-95"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-500" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
        </button>
      </header>

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

                {/* Advanced: CORS Proxy Endpoint */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsAdvancedOpen((v) => !v)}
                    className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1"
                    aria-expanded={isAdvancedOpen}
                  >
                    <span className="flex items-center gap-2">
                      <Server className="w-3.5 h-3.5 text-[#f6821f]" />
                      {t.landing.advancedProxy}
                    </span>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 transition-transform duration-200',
                        isAdvancedOpen && 'rotate-180'
                      )}
                    />
                  </button>

                  {isAdvancedOpen && (
                    <div className="mt-3 space-y-3 pt-1">
                      {isGitHubPages && (!proxyUrlInput || proxyUrlInput === '/api/cf') && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                          <p className="leading-relaxed">{t.landing.proxyUrlGitHubNotice}</p>
                        </div>
                      )}

                      <GlassInput
                        label={t.landing.proxyUrlLabel}
                        type="text"
                        placeholder={t.landing.proxyUrlPlaceholder}
                        value={proxyUrlInput}
                        onChange={(e) => setProxyUrlInput(e.target.value)}
                        leftIcon={<Globe className="w-4 h-4" />}
                        helperText={t.landing.proxyUrlHelper}
                      />

                      {proxyUrlInput !== '/api/cf' && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setProxyUrlInput('/api/cf')}
                            className="text-xs text-slate-500 hover:text-orange-500 transition-colors cursor-pointer"
                          >
                            {t.landing.resetProxy}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
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
              title={storedProxyUrl || '/api/cf'}
            >
              <ShieldCheck className="w-3 h-3 text-orange-500" />
              {storedProxyUrl && storedProxyUrl !== '/api/cf'
                ? `Proxy: ${storedProxyUrl.length > 28 ? `${storedProxyUrl.slice(0, 28)}...` : storedProxyUrl}`
                : t.landing.footerProxy}
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

          {/* Subtle version & commit footer */}
          <footer className="text-center text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5 font-mono pt-2">
            <span>v{__APP_VERSION__}</span>
            <span>•</span>
            <span>{__GIT_COMMIT__}</span>
          </footer>
        </div>
      </div>
    </div>
  )
}

export default LandingPage
