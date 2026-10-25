import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAccessRules, fetchFirstPageRules } from '../api/accessRules'
import { useAuthStore } from '../store/useAuthStore'
import { useSettingsStore } from '../store/useSettingsStore'
import {
  getCachedRules,
  setCachedRules,
  clearCachedRules,
} from '../utils/rulesCache'
import type {
  FetchProgress,
  NormalizedAccessRule,
} from '../types/cloudflare'

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
      // 1. Sprawdź cache IndexedDB jeśli nie wymuszono odświeżenia
      if (!forceRefreshRef.current) {
        const cached = await getCachedRules(accountLevelOnly)
        if (cached && cached.length > 0) {
          setProgress({
            loaded: cached.length,
            total: cached.length,
            percentage: 100,
            label: `Wczytano ${cached.length} reguł z pamięci IndexedDB.`,
          })
          return cached
        }
      }

      // Reset flagi wymuszonego odświeżenia
      forceRefreshRef.current = false

      // 2. Pobierz świeże dane z Cloudflare API
      setProgress({
        loaded: 0,
        total: 100,
        percentage: 5,
        label: 'Inicjalizacja pobierania reguł Cloudflare...',
      })

      const freshRules = await fetchAccessRules({
        accountLevelOnly,
        onProgress: setProgress,
      })

      // 3. Zapisz w IndexedDB w tle
      await setCachedRules(accountLevelOnly, freshRules)

      return freshRules
    },
    enabled: Boolean(email && token),
    // Nieskończony czas świeżości – brak niepotrzebnych refetchy sieciowych
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  // Wymuszone odświeżenie: czyści IndexedDB i pobiera z sieci z paskiem postępu
  const forceRefresh = useCallback(async () => {
    forceRefreshRef.current = true
    await clearCachedRules(accountLevelOnly)
    setProgress({
      loaded: 0,
      total: 100,
      percentage: 5,
      label: 'Wymuszone odświeżanie z Cloudflare API...',
    })
    return await query.refetch()
  }, [accountLevelOnly, query])

  // Cykliczne odświeżanie reguł w tle (Auto-Refresh)
  useEffect(() => {
    if (!email || !token || autoRefreshInterval <= 0) {
      return
    }

    const intervalId = setInterval(async () => {
      // Pomiń odświeżanie, jeśli aktualnie trwa inne zapytanie
      if (query.isFetching) return

      if (autoRefreshMode === 'full') {
        await forceRefresh()
      } else {
        // Quick Delta Sync (pobranie tylko 1. strony - 100 najnowszych reguł)
        try {
          const deltaRules = await fetchFirstPageRules(accountLevelOnly, concurrency)

          if (deltaRules.length > 0) {
            const queryKey = ['cloudflare', 'access_rules', { email, accountLevelOnly }]

            queryClient.setQueryData<NormalizedAccessRule[]>(queryKey, (old = []) => {
              const getRuleKey = (r: NormalizedAccessRule) =>
                r.scopeType === 'account'
                  ? `account-${r.accountId}-${r.id}`
                  : `zone-${r.zoneId}-${r.id}`

              // 1. Zbuduj mapę istniejących reguł po unikalnym kluczu
              const existingMap = new Map<string, NormalizedAccessRule>()
              for (const r of old) {
                existingMap.set(getRuleKey(r), r)
              }

              const newRulesToPrepend: NormalizedAccessRule[] = []

              // 2. Zaktualizuj istniejące wpisy nowymi danymi z 1. strony,
              //    a zupełnie nowe reguły zbierz do wstawienia na początek listy
              for (const delta of deltaRules) {
                const key = getRuleKey(delta)
                if (existingMap.has(key)) {
                  existingMap.set(key, delta)
                } else {
                  newRulesToPrepend.push(delta)
                  existingMap.set(key, delta)
                }
              }

              // 3. Scalenie: nowe reguły na początku listy + zaktualizowana kolejność istniejących
              const updated = [
                ...newRulesToPrepend,
                ...old.map((existing) => existingMap.get(getRuleKey(existing)) ?? existing),
              ]

              // 4. Zapisz zaktualizowaną tablicę w IndexedDB w tle
              setCachedRules(accountLevelOnly, updated).catch((err) =>
                console.warn('[AutoRefresh] Błąd aktualizacji IndexedDB:', err)
              )

              return updated
            })
          }
        } catch (err) {
          console.warn('[AutoRefresh] Błąd podczas synchronizacji różnicowej:', err)
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
        label: `Załadowano ${query.data?.length || 0} reguł.`,
      }
    : query.isError
    ? {
        loaded: 0,
        total: 0,
        percentage: 0,
        label: query.error?.message || 'Błąd podczas pobierania reguł',
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
