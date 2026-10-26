import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAccessRules, fetchFirstPageRules } from '../api/accessRules'
import { useAuthStore } from '../store/useAuthStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useHighlightStore } from '../store/useHighlightStore'
import { getCachedRules, setCachedRules, clearCachedRules } from '../utils/rulesCache'
import { getTranslations } from '../i18n/useTranslation'
import type { FetchProgress, NormalizedAccessRule } from '../types/cloudflare'

function getRuleKey(rule: NormalizedAccessRule): string {
  return rule.scopeType === 'account'
    ? `account-${rule.accountId}-${rule.id}`
    : `zone-${rule.zoneId}-${rule.id}`
}

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

  const autoRefreshInterval = useSettingsStore((s) => s.autoRefreshInterval)

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

  // Store forceRefresh in a ref to avoid recreating the interval effect
  const forceRefreshRefCurrent = useRef(forceRefresh)
  useEffect(() => {
    forceRefreshRefCurrent.current = forceRefresh
  }, [forceRefresh])

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
      const { isMutatingRules, autoRefreshMode, concurrency } = useSettingsStore.getState()

      // Skip auto-refresh if a mutation is ongoing or query is actively fetching
      const isQueryFetching = queryClient.isFetching({ queryKey: ['cloudflare', 'access_rules'] }) > 0
      if (isMutatingRules || isQueryFetching) {
        useSettingsStore.getState().scheduleNextRefresh()
        return
      }

      useSettingsStore.getState().setIsAutoRefreshing(true)

      try {
        const queryKey = ['cloudflare', 'access_rules', { email, accountLevelOnly }]
        const previousRules = queryClient.getQueryData<NormalizedAccessRule[]>(queryKey) || []

        if (autoRefreshMode === 'full') {
          // Perform full network refresh
          await forceRefreshRefCurrent.current()

          // Compare fresh rules with previous ones to highlight newly synced entries
          const freshRules = queryClient.getQueryData<NormalizedAccessRule[]>(queryKey) || []
          if (previousRules.length > 0 && freshRules.length > 0) {
            const prevKeys = new Set(previousRules.map(getRuleKey))
            const newKeys = freshRules.filter((r) => !prevKeys.has(getRuleKey(r))).map(getRuleKey)
            if (newKeys.length > 0) {
              useHighlightStore.getState().highlightNewRules(newKeys)
            }
          }
        } else {
          // Quick Delta Sync (fetch page 1 only - up to 100 newest rules)
          const deltaRules = await fetchFirstPageRules(accountLevelOnly, concurrency)

          if (deltaRules.length > 0) {
            queryClient.setQueryData<NormalizedAccessRule[]>(queryKey, (old = []) => {
              const existingMap = new Map<string, NormalizedAccessRule>()
              for (const r of old) {
                existingMap.set(getRuleKey(r), r)
              }

              const newRulesToPrepend: NormalizedAccessRule[] = []
              const newlyAddedKeys: string[] = []

              for (const delta of deltaRules) {
                const key = getRuleKey(delta)
                if (existingMap.has(key)) {
                  existingMap.set(key, delta)
                } else {
                  newRulesToPrepend.push(delta)
                  newlyAddedKeys.push(key)
                  existingMap.set(key, delta)
                }
              }

              if (newlyAddedKeys.length > 0) {
                useHighlightStore.getState().highlightNewRules(newlyAddedKeys)
              }

              // Merge: prepend brand new rules + keep updated order of existing entries
              const updated = [
                ...newRulesToPrepend,
                ...old.map((existing) => existingMap.get(getRuleKey(existing)) ?? existing),
              ]

              // Persist updated rules array to IndexedDB in background
              setCachedRules(accountLevelOnly, updated).catch((err) =>
                console.warn('[AutoRefresh] Error updating IndexedDB:', err)
              )

              return updated
            })
          }
        }
      } catch (err) {
        console.warn('[AutoRefresh] Error during background refresh:', err)
      } finally {
        // ALWAYS mark refreshed and reset isAutoRefreshing to false in finally block
        useSettingsStore.getState().markRefreshed()
        useSettingsStore.getState().setIsAutoRefreshing(false)
      }
    }, autoRefreshInterval * 1000)

    return () => clearInterval(intervalId)
  }, [
    email,
    token,
    accountLevelOnly,
    autoRefreshInterval,
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
