import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/useAuthStore'
import {
  updateAccessRule,
  type UpdateAccessRulePayload,
} from '../api/accessRules'
import { setCachedRules } from '../utils/rulesCache'
import type { NormalizedAccessRule } from '../types/cloudflare'

export function useUpdateAccessRule() {
  const queryClient = useQueryClient()
  const accountLevelOnly = useAuthStore((s) => s.accountLevelOnly)

  const mutateRule = async (
    rule: NormalizedAccessRule,
    payload: UpdateAccessRulePayload
  ): Promise<NormalizedAccessRule> => {
    const updatedRule = await updateAccessRule(rule, payload)

    // Natychmiastowa lokalna aktualizacja w pamięci cache TanStack Query
    queryClient.setQueriesData<NormalizedAccessRule[]>(
      { queryKey: ['cloudflare', 'access_rules'] },
      (old = []) => {
        const getRuleKey = (r: NormalizedAccessRule) =>
          r.scopeType === 'account'
            ? `account-${r.accountId}-${r.id}`
            : `zone-${r.zoneId}-${r.id}`

        const targetKey = getRuleKey(rule)
        const updated = old.map((r) => (getRuleKey(r) === targetKey ? updatedRule : r))

        // Aktualizacja IndexedDB w tle bez przeładowywania sieciowego
        setCachedRules(accountLevelOnly, updated).catch((err) =>
          console.warn('[useUpdateAccessRule] Błąd zapisu do IndexedDB:', err)
        )

        return updated
      }
    )

    return updatedRule
  }

  return { mutateRule }
}

export default useUpdateAccessRule
