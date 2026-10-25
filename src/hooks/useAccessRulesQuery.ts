import { useState, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAccessRules } from '../api/accessRules'
import { useAuthStore } from '../store/useAuthStore'
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
  const email = useAuthStore((s) => s.email)
  const token = useAuthStore((s) => s.token)
  const accountLevelOnly = useAuthStore((s) => s.accountLevelOnly)

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
