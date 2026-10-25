import { useState } from 'react'
import {
  ShieldCheck,
  Search,
  Key,
  Flame,
  Globe,
  Sliders,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Lock,
  Layers,
  CheckCircle2,
  AlertCircle,
  Eye,
  Filter,
} from 'lucide-react'
import { AmbientBackground } from './components/ui/AmbientBackground'
import { GlassNavbar } from './components/layout/GlassNavbar'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
} from './components/ui/GlassCard'
import { GlassButton } from './components/ui/GlassButton'
import { GlassInput } from './components/ui/GlassInput'
import { GlassSwitch } from './components/ui/GlassSwitch'
import { LandingPage } from './pages/LandingPage'
import { useThemeStore } from './store/useThemeStore'
import { useAuthStore, selectIsAuthenticated } from './store/useAuthStore'

export function App() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)

  // Show landing page if not authenticated
  if (!isAuthenticated) {
    return <LandingPage />
  }

  return <Dashboard />
}

/** Main dashboard — rendered only when the user is authenticated */
function Dashboard() {
  const { theme, toggleTheme } = useThemeStore()
  const [filterEnabled, setFilterEnabled] = useState(true)
  const [autoSync, setAutoSync] = useState(false)
  const [wafStrict, setWafStrict] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSimulateSync = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
    }, 1200)
  }

  const sampleRules = [
    {
      id: 'rule_1001',
      name: 'Block Known Botnets & Malicious ASN',
      phase: 'http_request_firewall_custom',
      action: 'block',
      enabled: true,
      hits: '24.5k',
      expression: '(ip.geoip.asnum in {13335, 9009} and cf.threat_score gt 40)',
    },
    {
      id: 'rule_1002',
      name: 'Managed WAF - OWASP Core Ruleset High Sensitivity',
      phase: 'http_request_firewall_managed',
      action: 'managed_challenge',
      enabled: wafStrict,
      hits: '182.1k',
      expression: '(cf.waf.score le 25 and not http.request.uri.path contains "/healthz")',
    },
    {
      id: 'rule_1003',
      name: 'Cache Bypass for Admin & Auth Endpoints',
      phase: 'http_request_cache_settings',
      action: 'bypass_cache',
      enabled: true,
      hits: '9.2k',
      expression: '(http.request.uri.path starts_with "/admin" or http.cookie contains "cf_sess")',
    },
  ]

  return (
    <div className="relative min-h-screen text-slate-900 dark:text-slate-100 selection:bg-orange-500/25 selection:text-orange-600 dark:selection:text-orange-300">
      {/* 1. Ambient Background with Cloudflare Orange, Indigo & Blue blur */}
      <AmbientBackground />

      {/* 2. Top Navigation Bar */}
      <GlassNavbar />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-10">
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-orange-500/10 text-[#f6821f] border border-orange-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tailwind v4 • Glassmorphism Design System</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Cloudflare <span className="text-[#f6821f]">Rule Browser</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Nowoczesny interfejs inspekcji reguł WAF, Cache i Firewall. Motyw{' '}
              <strong className="text-slate-800 dark:text-slate-200 uppercase font-mono">
                {theme}
              </strong>{' '}
              synchronizowany z LocalStorage i klasą na elemencie{' '}
              <code className="text-xs px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono">
                &lt;html&gt;
              </code>
              .
            </p>
          </div>

          <div className="flex items-center gap-3">
            <GlassButton
              variant="primary"
              size="md"
              isLoading={isLoading}
              onClick={handleSimulateSync}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Odśwież reguły
            </GlassButton>
            <GlassButton
              variant="glass"
              size="md"
              onClick={toggleTheme}
            >
              Zmień motyw
            </GlassButton>
          </div>
        </div>

        {/* Quick Stat Cards using GlassCard */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <GlassCard hoverEffect glow className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Aktywne reguły
              </span>
              <div className="p-2 rounded-xl bg-orange-500/10 text-[#f6821f]">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                48
              </span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center">
                +3 nowe
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              W 3 strefach Cloudflare
            </p>
          </GlassCard>

          <GlassCard hoverEffect className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                WAF Managed
              </span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                OWASP v3
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Sensitivity: High (Anomaly 25)
            </p>
          </GlassCard>

          <GlassCard hoverEffect className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Średni czas odpowiedzi
              </span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <Globe className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                14 ms
              </span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                98.2% Cache Hit
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Edge PoP Frankfurt &amp; Warsaw
            </p>
          </GlassCard>

          <GlassCard hoverEffect className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Stan API Proxy
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                /api/cf ➜ 200 OK
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              CORS &amp; CSP Zabezpieczone
            </p>
          </GlassCard>
        </section>

        {/* UI Components Playground */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/10 pb-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#f6821f]" />
                Komponenty UI Glassmorphism
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Zaprojektowane w Tailwind v4 z elastycznymi wariantami
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Buttons & Switches */}
            <GlassCard hoverEffect>
              <GlassCardHeader>
                <GlassCardTitle>Przyciski i Przełączniki</GlassCardTitle>
                <GlassCardDescription>
                  Warianty: Primary Cloudflare, Glass, Secondary, Outline i Ghost
                </GlassCardDescription>
              </GlassCardHeader>

              <GlassCardContent className="space-y-6">
                {/* Button variants showcase */}
                <div className="flex flex-wrap items-center gap-3">
                  <GlassButton variant="primary">
                    Primary Button
                  </GlassButton>
                  <GlassButton variant="glass">
                    Glass Neutral
                  </GlassButton>
                  <GlassButton variant="secondary">
                    Secondary
                  </GlassButton>
                  <GlassButton variant="outline">
                    Outline
                  </GlassButton>
                  <GlassButton variant="ghost">
                    Ghost
                  </GlassButton>
                  <GlassButton variant="danger">
                    Danger
                  </GlassButton>
                </div>

                <div className="pt-2 border-t border-slate-200/50 dark:border-white/5 space-y-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Nowoczesny GlassSwitch
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <GlassSwitch
                      checked={filterEnabled}
                      onChange={setFilterEnabled}
                      label="Aktywne filtry WAF"
                      description="Przeglądaj tylko reguły ze statusem Enabled"
                      size="md"
                    />

                    <GlassSwitch
                      checked={wafStrict}
                      onChange={setWafStrict}
                      label="Tryb restrykcyjny (Strict)"
                      description="Automatyczny challenge dla podejrzanych sesji"
                      size="md"
                    />

                    <GlassSwitch
                      checked={autoSync}
                      onChange={setAutoSync}
                      label="Automatyczna synchronizacja"
                      description="Cykliczne zapytania do endpointu /api/cf"
                      size="sm"
                    />

                    <GlassSwitch
                      checked={theme === 'dark'}
                      onChange={toggleTheme}
                      label="Tryb nocny (Dark mode)"
                      description="Zapisany pod kluczem 'cf-theme'"
                      size="sm"
                    />
                  </div>
                </div>
              </GlassCardContent>

              <GlassCardFooter className="justify-between border-t border-slate-200/50 dark:border-white/5">
                <span className="text-xs text-slate-500">
                  Kompatybilność z motywem jasnym i ciemnym
                </span>
                <GlassButton variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Więcej
                </GlassButton>
              </GlassCardFooter>
            </GlassCard>

            {/* Card 2: Glass Inputs & Filters */}
            <GlassCard hoverEffect>
              <GlassCardHeader>
                <GlassCardTitle>Formularze i Pola Wprowadzania</GlassCardTitle>
                <GlassCardDescription>
                  Pola GlassInput z ikonami, walidacją i akcentem Cloudflare
                </GlassCardDescription>
              </GlassCardHeader>

              <GlassCardContent className="space-y-4">
                <GlassInput
                  label="Szukaj reguł"
                  placeholder="Wyszukaj po nazwie, fazie lub wyrażeniu (np. ip.geoip.asnum)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                  helperText="Wyszukiwanie pełnotekstowe w regułach WAF i Firewall"
                />

                <GlassInput
                  label="Klucz API Cloudflare"
                  type="password"
                  placeholder="Bearer token lub Global API Key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  leftIcon={<Key className="w-4 h-4" />}
                  rightIcon={
                    apiKey ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Eye className="w-4 h-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300" />
                    )
                  }
                  helperText="Bezpiecznie przesyłany przez lokalny proxy /api/cf"
                />

                <GlassInput
                  label="Podgląd walidacji (Error state)"
                  defaultValue="invalid_zone_id_format"
                  error="Identyfikator strefy musi mieć 32 znaki alfanumeryczne."
                  leftIcon={<AlertCircle className="w-4 h-4 text-red-500" />}
                />
              </GlassCardContent>
            </GlassCard>
          </div>
        </section>

        {/* Live Cloudflare Rules Preview Section */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#f6821f]" />
                Podgląd Reguł Cloudflare
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Prezentacja danych z wykorzystaniem komponentów GlassCard
              </p>
            </div>

            <div className="flex items-center gap-2">
              <GlassButton variant="outline" size="sm" leftIcon={<Filter className="w-3.5 h-3.5" />}>
                Filtruj fazy
              </GlassButton>
            </div>
          </div>

          <div className="space-y-3">
            {sampleRules.map((rule) => (
              <GlassCard
                key={rule.id}
                hoverEffect
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base truncate">
                      {rule.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-slate-200/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300">
                      {rule.phase}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider ${
                        rule.action === 'block'
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                          : rule.action === 'managed_challenge'
                          ? 'bg-orange-500/10 text-[#f6821f] border border-orange-500/20'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {rule.action}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-black/5 dark:bg-black/30 font-mono text-xs text-slate-700 dark:text-slate-300 overflow-x-auto border border-black/5 dark:border-white/5">
                    {rule.expression}
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-5 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/50 dark:border-white/5">
                  <div className="text-right">
                    <span className="block text-xs text-slate-400">Wywołania</span>
                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                      {rule.hits}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <GlassSwitch
                      checked={rule.enabled}
                      onChange={() => {}}
                      size="sm"
                      aria-label={`Toggle rule ${rule.name}`}
                    />
                    <GlassButton variant="glass" size="xs">
                      Szczegóły
                    </GlassButton>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
