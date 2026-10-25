import { useState, useMemo } from 'react'
import type { RowSelectionState } from '@tanstack/react-table'
import {
  ShieldCheck,
  Search,
  Key,
  Flame,
  Sparkles,
  RefreshCw,
  Layers,
  AlertCircle,
  Ban,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react'
import { AmbientBackground } from './components/ui/AmbientBackground'
import { GlassNavbar } from './components/layout/GlassNavbar'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
} from './components/ui/GlassCard'
import { GlassButton } from './components/ui/GlassButton'
import { GlassInput } from './components/ui/GlassInput'
import { GlassSwitch } from './components/ui/GlassSwitch'
import { ProgressBar } from './components/ui/ProgressBar'
import { RulesTable } from './components/rules/RulesTable'
import { BulkActionBar } from './components/rules/BulkActionBar'
import { ConfirmDeleteDialog } from './components/rules/ConfirmDeleteDialog'
import { LandingPage } from './pages/LandingPage'
import { useThemeStore } from './store/useThemeStore'
import { useAuthStore, selectIsAuthenticated } from './store/useAuthStore'
import { useAccessRulesQuery } from './hooks/useAccessRulesQuery'
import type { NormalizedAccessRule } from './types/cloudflare'

export function App() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)

  if (!isAuthenticated) {
    return <LandingPage />
  }

  return <Dashboard />
}

/** Main dashboard — rendered when authenticated */
function Dashboard() {
  const { theme, toggleTheme } = useThemeStore()
  const accountLevelOnly = useAuthStore((s) => s.accountLevelOnly)

  // Real TanStack Query v5 hook
  const {
    rules,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    progress,
  } = useAccessRulesQuery()

  // Row selection state for TanStack Table (keyed by `${scopeType}-${zoneId??accountId}-${id}`)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Compute selected NormalizedAccessRule items based on rowSelection keys
  const selectedRules = useMemo(() => {
    return rules.filter((rule) => {
      const key = `${rule.scopeType}-${rule.zoneId ?? rule.accountId}-${rule.id}`
      return Boolean(rowSelection[key])
    })
  }, [rules, rowSelection])

  // Dialog state for deletion confirmation
  const [dialogRules, setDialogRules] = useState<NormalizedAccessRule[]>([])
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)

  // Handlers for deleting single rule or bulk selection
  const handleDeleteSingleRule = (rule: NormalizedAccessRule) => {
    setDialogRules([rule])
    setIsConfirmDialogOpen(true)
  }

  const handleDeleteBulk = (rulesToDelete?: NormalizedAccessRule[]) => {
    const targetRules = rulesToDelete && rulesToDelete.length > 0 ? rulesToDelete : selectedRules
    if (targetRules.length === 0) return
    setDialogRules(targetRules)
    setIsConfirmDialogOpen(true)
  }

  const handleClearSelection = () => {
    setRowSelection({})
  }

  const handleDeleteSuccess = (deleted: NormalizedAccessRule[]) => {
    // Clear deleted items from selection
    const deletedKeys = new Set(
      deleted.map((r) => `${r.scopeType}-${r.zoneId ?? r.accountId}-${r.id}`)
    )
    setRowSelection((prev) => {
      const next = { ...prev }
      for (const k of deletedKeys) {
        delete next[k]
      }
      return next
    })
  }

  // Showcase state for component playground
  const [showPlayground, setShowPlayground] = useState(false)
  const [filterEnabled, setFilterEnabled] = useState(true)
  const [wafStrict, setWafStrict] = useState(true)
  const [autoSync, setAutoSync] = useState(false)
  const [testSearch, setTestSearch] = useState('')
  const [testApiKey, setTestApiKey] = useState('')

  // Compute live statistics
  const totalRulesCount = rules.length
  const blockCount = rules.filter((r) => r.mode === 'block').length
  const whitelistCount = rules.filter((r) => r.mode === 'whitelist').length
  const challengeCount = rules.filter((r) => r.mode.includes('challenge')).length

  return (
    <div className="relative min-h-screen text-slate-900 dark:text-slate-100 selection:bg-orange-500/25 selection:text-orange-600 dark:selection:text-orange-300 pb-20">
      {/* 1. Ambient Background with Cloudflare Orange, Indigo & Blue blur */}
      <AmbientBackground />

      {/* 2. Top Navigation Bar */}
      <GlassNavbar />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-8">
        {/* Header Hero Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-orange-500/10 text-[#f6821f] border border-orange-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {accountLevelOnly
                  ? 'Tryb poziomu konta (Account Level)'
                  : 'Tryb wszystkich domen (All Zones)'}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Cloudflare <span className="text-[#f6821f]">Access Rules</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Przeglądaj, filtruj i zarządzaj regułami IP Access Rules Cloudflare dla konta i domen.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <GlassButton
              variant="primary"
              size="md"
              isLoading={isFetching}
              onClick={() => refetch()}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Odśwież dane
            </GlassButton>
            <GlassButton variant="glass" size="md" onClick={toggleTheme}>
              {theme === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'}
            </GlassButton>
          </div>
        </div>

        {/* Progress indicator during fetching */}
        <ProgressBar progress={progress} isVisible={isFetching} />

        {/* Error notification if API fails */}
        {isError && (
          <GlassCard className="p-4 border-red-500/40 bg-red-500/5 text-red-700 dark:text-red-300">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-semibold text-sm">Wystąpił błąd podczas komunikacji z Cloudflare</h4>
                <p className="text-xs text-red-600 dark:text-red-400">
                  {error?.message || 'Nie udało się pobrać reguł. Sprawdź ważność tokenu i uprawnienia.'}
                </p>
                <div className="pt-2">
                  <GlassButton variant="danger" size="xs" onClick={() => refetch()}>
                    Spróbuj ponownie
                  </GlassButton>
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Quick Stat Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total Rules */}
          <GlassCard hoverEffect glow className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Wszystkie reguły
              </span>
              <div className="p-2 rounded-xl bg-orange-500/10 text-[#f6821f]">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {isLoading ? '...' : totalRulesCount}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                zsynchronizowane
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {accountLevelOnly ? 'Poziom konta Cloudflare' : 'Domeny i reguły globalne'}
            </p>
          </GlassCard>

          {/* Card 2: Blocked */}
          <GlassCard hoverEffect className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Blokady (Block)
              </span>
              <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                <Ban className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-red-600 dark:text-red-400">
                {isLoading ? '...' : blockCount}
              </span>
              <span className="text-xs font-medium text-slate-500">reguł</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Blokowanie podejrzanych IP/ASN
            </p>
          </GlassCard>

          {/* Card 3: Whitelisted */}
          <GlassCard hoverEffect className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Biała lista (Whitelist)
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {isLoading ? '...' : whitelistCount}
              </span>
              <span className="text-xs font-medium text-slate-500">reguł</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Zaufane adresy i partnerzy
            </p>
          </GlassCard>

          {/* Card 4: Challenges */}
          <GlassCard hoverEffect className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Wyzwania (Challenges)
              </span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-[#f6821f]">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                {isLoading ? '...' : challengeCount}
              </span>
              <span className="text-xs font-medium text-slate-500">reguł</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Managed &amp; JS Challenges
            </p>
          </GlassCard>
        </section>

        {/* Real Rules Table Section with controlled selection */}
        <section className="space-y-4">
          <RulesTable
            data={rules}
            isLoading={isLoading}
            isFetching={isFetching}
            onRefetch={() => refetch()}
            onDeleteRule={handleDeleteSingleRule}
            onDeleteSelected={handleDeleteBulk}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
          />
        </section>

        {/* Collapsible Design System & Components Playground */}
        <section className="space-y-4 pt-6">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/10 pb-3">
            <button
              type="button"
              onClick={() => setShowPlayground((v) => !v)}
              className="flex items-center gap-2 text-left cursor-pointer group"
            >
              <Layers className="w-5 h-5 text-[#f6821f]" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#f6821f] transition-colors">
                  Komponenty UI Design System (Podgląd)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kliknij, aby {showPlayground ? 'zwinąć' : 'rozwinąć'} podgląd komponentów
                  Glassmorphism
                </p>
              </div>
              <ChevronDown
                className={`w-5 h-5 ml-2 text-slate-400 transition-transform duration-200 ${
                  showPlayground ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>

          {showPlayground && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 animate-in fade-in duration-300">
              {/* Card 1: Buttons & Switches */}
              <GlassCard hoverEffect>
                <GlassCardHeader>
                  <GlassCardTitle>Przyciski i Przełączniki</GlassCardTitle>
                  <GlassCardDescription>
                    Warianty: Primary Cloudflare, Glass, Secondary, Outline i Ghost
                  </GlassCardDescription>
                </GlassCardHeader>

                <GlassCardContent className="space-y-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <GlassButton variant="primary">Primary Button</GlassButton>
                    <GlassButton variant="glass">Glass Neutral</GlassButton>
                    <GlassButton variant="secondary">Secondary</GlassButton>
                    <GlassButton variant="outline">Outline</GlassButton>
                    <GlassButton variant="ghost">Ghost</GlassButton>
                    <GlassButton variant="danger">Danger</GlassButton>
                  </div>

                  <div className="pt-2 border-t border-slate-200/50 dark:border-white/5 space-y-4">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      GlassSwitch
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <GlassSwitch
                        checked={filterEnabled}
                        onChange={setFilterEnabled}
                        label="Aktywne filtry"
                        description="Przełącznik demonstracyjny"
                        size="md"
                      />

                      <GlassSwitch
                        checked={wafStrict}
                        onChange={setWafStrict}
                        label="Tryb restrykcyjny"
                        description="Automatyczny challenge"
                        size="md"
                      />

                      <GlassSwitch
                        checked={autoSync}
                        onChange={setAutoSync}
                        label="Auto synchronizacja"
                        description="Cykliczne odpytywanie API"
                        size="sm"
                      />

                      <GlassSwitch
                        checked={theme === 'dark'}
                        onChange={toggleTheme}
                        label="Tryb ciemny"
                        description="Stan zapisany w Zustand"
                        size="sm"
                      />
                    </div>
                  </div>
                </GlassCardContent>
              </GlassCard>

              {/* Card 2: Glass Inputs */}
              <GlassCard hoverEffect>
                <GlassCardHeader>
                  <GlassCardTitle>Pola Wprowadzania</GlassCardTitle>
                  <GlassCardDescription>
                    GlassInput z obsługą ikon, opisów i walidacji
                  </GlassCardDescription>
                </GlassCardHeader>

                <GlassCardContent className="space-y-4">
                  <GlassInput
                    label="Wyszukiwanie testowe"
                    placeholder="Wpisz frazę..."
                    value={testSearch}
                    onChange={(e) => setTestSearch(e.target.value)}
                    leftIcon={<Search className="w-4 h-4" />}
                  />

                  <GlassInput
                    label="Klucz API"
                    type="password"
                    placeholder="Token Cloudflare..."
                    value={testApiKey}
                    onChange={(e) => setTestApiKey(e.target.value)}
                    leftIcon={<Key className="w-4 h-4" />}
                  />

                  <GlassInput
                    label="Błąd walidacji"
                    defaultValue="invalid_id_value"
                    error="Wartość nie spełnia wymagań formatu IP lub CIDR"
                    leftIcon={<AlertCircle className="w-4 h-4 text-red-500" />}
                  />
                </GlassCardContent>
              </GlassCard>
            </div>
          )}
        </section>
      </main>

      {/* 3. Pływający pasek BulkActionBar pojawiający się, gdy zaznaczono >= 1 regułę */}
      <BulkActionBar
        selectedCount={selectedRules.length}
        onClearSelection={handleClearSelection}
        onDeleteSelected={() => handleDeleteBulk()}
      />

      {/* 4. Modal potwierdzenia usunięcia z paskiem postępu */}
      <ConfirmDeleteDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        rules={dialogRules}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  )
}

export default App
