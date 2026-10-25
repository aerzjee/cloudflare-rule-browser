import { useState, useMemo, lazy, Suspense } from 'react'
import type { RowSelectionState } from '@tanstack/react-table'
import {
  ShieldCheck,
  Flame,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Ban,
  ShieldAlert,
} from 'lucide-react'
import { AmbientBackground } from './components/ui/AmbientBackground'
import { GlassNavbar } from './components/layout/GlassNavbar'
import { GlassCard } from './components/ui/GlassCard'
import { GlassButton } from './components/ui/GlassButton'
import { ProgressBar } from './components/ui/ProgressBar'
import { BulkActionBar } from './components/rules/BulkActionBar'
import { ConfirmDeleteDialog } from './components/rules/ConfirmDeleteDialog'
import { LandingPage } from './pages/LandingPage'
import { useAuthStore, selectIsAuthenticated } from './store/useAuthStore'
import { useAccessRulesQuery } from './hooks/useAccessRulesQuery'
import { useTranslation } from './i18n/useTranslation'
import type { NormalizedAccessRule } from './types/cloudflare'

// Leniwe ładowanie tabeli reguł (Code-Splitting dla zalogowanego użytkownika)
const RulesTable = lazy(() => import('./components/rules/RulesTable'))

/** Szklany loader szkieletowy podczas asynchronicznego ładowania RulesTable */
function GlassLoadingSkeleton() {
  return (
    <GlassCard className="p-6 space-y-4 animate-pulse border-white/50 dark:border-white/10 shadow-2xl">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-white/10">
        <div className="h-10 bg-slate-200/70 dark:bg-slate-800/70 rounded-xl w-full sm:w-72" />
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="h-10 bg-slate-200/70 dark:bg-slate-800/70 rounded-xl w-36" />
          <div className="h-10 bg-slate-200/70 dark:bg-slate-800/70 rounded-xl w-28" />
        </div>
      </div>
      <div className="space-y-3 pt-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-12 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl w-full"
          />
        ))}
      </div>
    </GlassCard>
  )
}

export function App() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)

  if (!isAuthenticated) {
    return <LandingPage />
  }

  return <Dashboard />
}

/** Main dashboard — rendered when authenticated */
function Dashboard() {
  const { t } = useTranslation()
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

  // Row selection state for TanStack Table (keyed by getRuleRowId)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const getRuleRowId = (rule: NormalizedAccessRule) =>
    rule.scopeType === 'account'
      ? `account-${rule.accountId}-${rule.id}`
      : `zone-${rule.zoneId}-${rule.id}`

  // Compute selected NormalizedAccessRule items based on rowSelection keys
  const selectedRules = useMemo(() => {
    return rules.filter((rule) => {
      const key = getRuleRowId(rule)
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
    const deletedKeys = new Set(deleted.map(getRuleRowId))
    setRowSelection((prev) => {
      const next = { ...prev }
      for (const k of deletedKeys) {
        delete next[k]
      }
      return next
    })
  }

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
                  ? t.dashboard.badgeAccount
                  : t.dashboard.badgeZones}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              {t.dashboard.heroTitle} <span className="text-[#f6821f]">{t.dashboard.heroTitleHighlight}</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              {t.dashboard.heroDescription}
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
              {t.common.refresh}
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
                <h4 className="font-semibold text-sm">Error</h4>
                <p className="text-xs text-red-600 dark:text-red-400">
                  {error?.message || 'Failed to fetch rules.'}
                </p>
                <div className="pt-2">
                  <GlassButton variant="danger" size="xs" onClick={() => refetch()}>
                    {t.common.refresh}
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
                {t.dashboard.statTotal}
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
                {t.dashboard.rulesUnit}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t.dashboard.statTotalDesc}
            </p>
          </GlassCard>

          {/* Card 2: Blocked */}
          <GlassCard hoverEffect className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t.dashboard.statBlock}
              </span>
              <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                <Ban className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-red-600 dark:text-red-400">
                {isLoading ? '...' : blockCount}
              </span>
              <span className="text-xs font-medium text-slate-500">{t.dashboard.rulesUnit}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t.dashboard.statBlockDesc}
            </p>
          </GlassCard>

          {/* Card 3: Whitelisted */}
          <GlassCard hoverEffect className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t.dashboard.statAllow}
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {isLoading ? '...' : whitelistCount}
              </span>
              <span className="text-xs font-medium text-slate-500">{t.dashboard.rulesUnit}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t.dashboard.statAllowDesc}
            </p>
          </GlassCard>

          {/* Card 4: Challenges */}
          <GlassCard hoverEffect className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t.dashboard.statChallenge}
              </span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-[#f6821f]">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                {isLoading ? '...' : challengeCount}
              </span>
              <span className="text-xs font-medium text-slate-500">{t.dashboard.rulesUnit}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t.dashboard.statChallengeDesc}
            </p>
          </GlassCard>
        </section>

        {/* Real Rules Table Section with controlled selection & Suspense */}
        <section className="space-y-4">
          <Suspense fallback={<GlassLoadingSkeleton />}>
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
          </Suspense>
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
