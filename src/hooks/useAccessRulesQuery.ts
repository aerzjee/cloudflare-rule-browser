import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAccessRules, fetchFirstPageRules } from '../api/accessRules'
import { useAuthStore } from '../store/useAuthStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { getCachedRules, setCachedRules, clearCachedRules } from '../utils/rulesCache'
import { getTranslations } from '../i18n/useTranslation'
import type { FetchProgress, NormalizedAccessRule } from '../types/cloudflare'

export interface UseAccessRulesQueryResult {
  rules: NormalizedAccessRule[]
  data: NormalizedAccessRule[] | undefined
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  error: Error | null
  refetch: () => Promise<unknown>
  forceRefresh: () => Promise<unknown>
  progress: FetchProgress
}

export function useAccessRulesQuery(): UseAccessRulesQueryResult {
  const queryClient = useQueryClient()
  const email = useAuthStore((s) => s.email)
  const token = useAuthStore((s) => s.token)
  const accountLevelOnly = useAuthStore((s) => s.accountLevelOnly)

  const concurrency = useSettingsStore((s) => s.concurrency)
  const autoRefreshInterval = useSettingsStore((s) => s.autoRefreshInterval)
  const autoRefreshMode = useSettingsStore((s) => s.autoRefreshMode)

  const forceRefreshRef = useRef<boolean>(false)

  const [progress, setProgress] = useState<FetchProgress>({
    loaded: 0,
    total: 100,
    percentage: 0,
    label: '',
  })

  const query = useQuery<NormalizedAccessRule[], Error>({
    queryKey: ['cloudflare', 'access_rules', { email, accountLevelOnly }],
    queryFn: async () => {
      // 1. Check IndexedDB cache unless forced refresh was requested
      if (!forceRefreshRef.current) {
        const cached = await getCachedRules(accountLevelOnly)
        if (cached && cached.length > 0) {
          setProgress({
            loaded: cached.length,
            total: cached.length,
            percentage: 100,
            label: getTranslations().api.rulesLoadedIndexedDb(cached.length),
          })
          // Initialize lastRefreshAt timestamp if not already set
          if (!useSettingsStore.getState().lastRefreshAt) {
            useSettingsStore.getState().markRefreshed()
          }
          return cached
        }
      }

      // Reset force refresh flag
      forceRefreshRef.current = false

      // 2. Fetch fresh data from Cloudflare API
      setProgress({
        loaded: 0,
        total: 100,
        percentage: 5,
        label: getTranslations().api.initFetch,
      })

      const freshRules = await fetchAccessRules({
        accountLevelOnly,
        onProgress: setProgress,
      })

      // 3. Persist to IndexedDB in background
      await setCachedRules(accountLevelOnly, freshRules)

      // Register successful refresh and schedule the next cycle
      useSettingsStore.getState().markRefreshed()

      return freshRules
    },
    enabled: Boolean(email && token),
    // Infinite stale time – prevent automatic background network refetches
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  // Force refresh: clears IndexedDB and refetches from network with progress bar
  const forceRefresh = useCallback(async () => {
    forceRefreshRef.current = true
    await clearCachedRules(accountLevelOnly)
    setProgress({
      loaded: 0,
      total: 100,
      percentage: 5,
      label: getTranslations().api.forcedRefresh,
    })
    return await query.refetch()
  }, [accountLevelOnly, query])

  // Periodic background auto-refresh
  useEffect(() => {
    if (!email || !token || autoRefreshInterval <= 0) {
      return
    }

    // Ensure nextRefreshAt timestamp is scheduled
    if (!useSettingsStore.getState().nextRefreshAt) {
      useSettingsStore.getState().scheduleNextRefresh()
    }

    const intervalId = setInterval(async () => {
      // Skip auto-refresh if a network request is already ongoing
      if (query.isFetching) {
        useSettingsStore.getState().scheduleNextRefresh()
        return
      }

      useSettingsStore.getState().setIsAutoRefreshing(true)

      if (autoRefreshMode === 'full') {
        try {
          await forceRefresh()
          useSettingsStore.getState().markRefreshed()
        } catch (err) {
          console.warn('[AutoRefresh] Error during full refresh:', err)
          useSettingsStore.getState().setIsAutoRefreshing(false)
          useSettingsStore.getState().scheduleNextRefresh()
        }
      } else {
        // Quick Delta Sync (fetch page 1 only - up to 100 newest rules)
        try {
          const deltaRules = await fetchFirstPageRules(accountLevelOnly, concurrency)

          if (deltaRules.length > 0) {
            const queryKey = ['cloudflare', 'access_rules', { email, accountLevelOnly }]

            queryClient.setQueryData<NormalizedAccessRule[]>(queryKey, (old = []) => {
              const getRuleKey = (r: NormalizedAccessRule) =>
                r.scopeType === 'account'
                  ? `account-${r.accountId}-${r.id}`
                  : `zone-${r.zoneId}-${r.id}`

              // 1. Build map of existing rules keyed by unique ID
              const existingMap = new Map<string, NormalizedAccessRule>()
              for (const r of old) {
                existingMap.set(getRuleKey(r), r)
              }

              const newRulesToPrepend: NormalizedAccessRule[] = []

              // 2. Update existing entries with fresh page 1 data, and collect brand new rules
              for (const delta of deltaRules) {
                const key = getRuleKey(delta)
                if (existingMap.has(key)) {
                  existingMap.set(key, delta)
                } else {
                  newRulesToPrepend.push(delta)
                  existingMap.set(key, delta)
                }
              }

              // 3. Merge: prepend brand new rules + keep updated order of existing entries
              const updated = [
                ...newRulesToPrepend,
                ...old.map((existing) => existingMap.get(getRuleKey(existing)) ?? existing),
              ]

              // 4. Persist updated rules array to IndexedDB in background
              setCachedRules(accountLevelOnly, updated).catch((err) =>
                console.warn('[AutoRefresh] Error updating IndexedDB:', err)
              )

              return updated
            })
          }

          useSettingsStore.getState().markRefreshed()
        } catch (err) {
          console.warn('[AutoRefresh] Błąd podczas synchronizacji różnicowej:', err)
          useSettingsStore.getState().setIsAutoRefreshing(false)
          useSettingsStore.getState().scheduleNextRefresh()
        }
      }
    }, autoRefreshInterval * 1000)

    return () => clearInterval(intervalId)
  }, [
    email,
    token,
    accountLevelOnly,
    autoRefreshInterval,
    autoRefreshMode,
    concurrency,
    forceRefresh,
    query.isFetching,
    queryClient,
  ])

  // Compute effective progress
  const effectiveProgress: FetchProgress = query.isFetching
    ? progress
    : query.isSuccess
    ? {
        loaded: query.data?.length || 0,
        total: query.data?.length || 0,
        percentage: 100,
        label: getTranslations().api.rulesLoaded(query.data?.length || 0),
      }
    : query.isError
    ? {
        loaded: 0,
        total: 0,
        percentage: 0,
        label: query.error?.message || getTranslations().api.fetchError,
      }
    : progress

  return {
    rules: query.data ?? [],
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: forceRefresh,
    forceRefresh,
    progress: effectiveProgress,
  }
}

export default useAccessRulesQuery
