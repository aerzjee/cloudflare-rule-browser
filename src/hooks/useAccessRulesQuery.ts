import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAccessRules } from '../api/accessRules'
import { useAuthStore } from '../store/useAuthStore'
import type {
  AccessRulesFetchProgress,
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
  progress: AccessRulesFetchProgress
}

export function useAccessRulesQuery(): UseAccessRulesQueryResult {
  const email = useAuthStore((s) => s.email)
  const token = useAuthStore((s) => s.token)
  const accountLevelOnly = useAuthStore((s) => s.accountLevelOnly)

  const [progress, setProgress] = useState<AccessRulesFetchProgress>({
    stage: 'idle',
    current: 0,
    total: 0,
    percentage: 0,
    message: '',
  })

  const query = useQuery<NormalizedAccessRule[], Error>({
    queryKey: ['cloudflare', 'access_rules', { email, accountLevelOnly }],
    queryFn: async () => {
      setProgress({
        stage: 'idle',
        current: 0,
        total: 0,
        percentage: 0,
        message: 'Inicjalizacja pobierania reguł Cloudflare...',
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

  // Format the effective progress
  const effectiveProgress: AccessRulesFetchProgress = query.isFetching
    ? progress
    : query.isSuccess
    ? {
        stage: 'complete',
        current: query.data?.length || 0,
        total: query.data?.length || 0,
        percentage: 100,
        message: `Załadowano ${query.data?.length || 0} reguł.`,
      }
    : query.isError
    ? {
        stage: 'idle',
        current: 0,
        total: 0,
        percentage: 0,
        message: query.error?.message || 'Błąd podczas pobierania reguł',
      }
    : progress

  return {
    rules: query.data ?? [],
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    progress: effectiveProgress,
  }
}

export default useAccessRulesQuery
