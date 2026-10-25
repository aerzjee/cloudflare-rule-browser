import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAccessRules } from '../api/accessRules'
import { useAuthStore } from '../store/useAuthStore'
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
  progress: FetchProgress
}

export function useAccessRulesQuery(): UseAccessRulesQueryResult {
  const email = useAuthStore((s) => s.email)
  const token = useAuthStore((s) => s.token)
  const accountLevelOnly = useAuthStore((s) => s.accountLevelOnly)

  const [progress, setProgress] = useState<FetchProgress>({
    loaded: 0,
    total: 100,
    percentage: 0,
    label: '',
  })

  const query = useQuery<NormalizedAccessRule[], Error>({
    queryKey: ['cloudflare', 'access_rules', { email, accountLevelOnly }],
    queryFn: async () => {
      // Reset progress at the start of fetch
      setProgress({
        loaded: 0,
        total: 100,
        percentage: 5,
        label: 'Inicjalizacja pobierania reguł Cloudflare...',
      })

      return await fetchAccessRules({
        accountLevelOnly,
        onProgress: setProgress,
      })
    },
    enabled: Boolean(email && token),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  })

  // Explicit refetch handler that resets progress
  const handleRefetch = useCallback(async () => {
    setProgress({
      loaded: 0,
      total: 100,
      percentage: 5,
      label: 'Odświeżanie danych Cloudflare...',
    })
    return await query.refetch()
  }, [query])

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
    refetch: handleRefetch,
    progress: effectiveProgress,
  }
}

export default useAccessRulesQuery
