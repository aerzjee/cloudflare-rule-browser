import pLimit from 'p-limit'
import { cfFetch } from './cfClient'
import type {
  AccessRulesFetchProgress,
  CloudflareAccessRule,
  CloudflareAccount,
  CloudflareZone,
  NormalizedAccessRule,
} from '../types/cloudflare'

/**
 * Helper to fetch all pages from a paginated Cloudflare endpoint.
 * Fetches page 1, reads `result_info.total_pages`, and fetches subsequent pages in sequence.
 */
export async function fetchAllPages<T>(
  endpoint: string,
  defaultPerPage: number = 100
): Promise<T[]> {
  const urlObj = new URL(endpoint, 'http://localhost')

  if (!urlObj.searchParams.has('per_page')) {
    urlObj.searchParams.set('per_page', String(defaultPerPage))
  }
  urlObj.searchParams.set('page', '1')

  const firstPath = urlObj.pathname + urlObj.search
  const firstRes = await cfFetch<T[]>(firstPath)

  const items: T[] = [...(firstRes.result || [])]
  const totalPages =
    firstRes.result_info?.total_pages ??
    (firstRes.result_info?.total_count
      ? Math.ceil(
          firstRes.result_info.total_count /
            (firstRes.result_info.per_page || defaultPerPage)
        )
      : 1)

  if (totalPages > 1) {
    for (let page = 2; page <= totalPages; page++) {
      urlObj.searchParams.set('page', String(page))
      const nextPath = urlObj.pathname + urlObj.search
      const nextRes = await cfFetch<T[]>(nextPath)
      if (nextRes.result && Array.isArray(nextRes.result)) {
        items.push(...nextRes.result)
      }
    }
  }

  return items
}

/**
 * Normalizes a raw Cloudflare access rule into a unified NormalizedAccessRule.
 */
export function normalizeAccessRule(
  rule: CloudflareAccessRule,
  context?: {
    zoneId?: string
    zoneName?: string
    accountId?: string
  }
): NormalizedAccessRule {
  const isAccountScope = rule.scope?.type === 'account'

  return {
    id: rule.id,
    target: rule.configuration?.target || '',
    value: rule.configuration?.value || '',
    mode: rule.mode,
    notes: rule.notes || '',
    created_on: rule.created_on || '',
    scopeType: isAccountScope ? 'account' : 'zone',
    zoneId: isAccountScope
      ? undefined
      : context?.zoneId || (rule.scope?.type === 'zone' ? rule.scope.id : undefined),
    zoneName: isAccountScope
      ? undefined
      : context?.zoneName || (rule.scope?.type === 'zone' ? rule.scope.name : undefined),
    accountId: isAccountScope
      ? (rule.scope?.id || context?.accountId)
      : context?.accountId,
  }
}

export interface FetchAccessRulesOptions {
  accountLevelOnly?: boolean
  onProgress?: (progress: AccessRulesFetchProgress) => void
}

/**
 * Fetches all access rules from Cloudflare API.
 * - If accountLevelOnly === true: fetches accounts, then fetches rules for each account.
 * - If accountLevelOnly === false: fetches zones, then concurrently fetches rules for each zone with p-limit(5).
 * Deduplicates account rules and zone rules using a Map with specified keys.
 */
export async function fetchAccessRules(
  options: FetchAccessRulesOptions = {}
): Promise<NormalizedAccessRule[]> {
  const { accountLevelOnly = false, onProgress } = options
  const rulesMap = new Map<string, NormalizedAccessRule>()

  if (accountLevelOnly) {
    // 2a: Pobierz konta (GET /api/cf/accounts), a następnie reguły dla kont
    onProgress?.({
      stage: 'accounts',
      current: 0,
      total: 1,
      percentage: 10,
      message: 'Pobieranie listy kont Cloudflare...',
    })

    const accounts = await fetchAllPages<CloudflareAccount>('/accounts', 50)

    if (accounts.length === 0) {
      onProgress?.({
        stage: 'complete',
        current: 0,
        total: 0,
        percentage: 100,
        message: 'Brak dostępnych kont Cloudflare dla bieżącego tokenu.',
      })
      return []
    }

    let processedAccounts = 0
    for (const account of accounts) {
      onProgress?.({
        stage: 'rules',
        current: processedAccounts,
        total: accounts.length,
        percentage: Math.round((processedAccounts / accounts.length) * 100),
        message: `Pobieranie reguł konta: ${account.name} (${processedAccounts + 1}/${accounts.length})...`,
      })

      try {
        const rules = await fetchAllPages<CloudflareAccessRule>(
          `/accounts/${account.id}/firewall/access_rules/rules?per_page=100`,
          100
        )

        for (const rule of rules) {
          const key = `account-${rule.id}`
          rulesMap.set(
            key,
            normalizeAccessRule(rule, { accountId: account.id })
          )
        }
      } catch (err) {
        console.warn(`Błąd podczas pobierania reguł konta ${account.name} (${account.id}):`, err)
      } finally {
        processedAccounts++
      }
    }

    onProgress?.({
      stage: 'complete',
      current: accounts.length,
      total: accounts.length,
      percentage: 100,
      message: `Pobrano ${rulesMap.size} reguł na poziomie konta.`,
    })

    return Array.from(rulesMap.values())
  }

  // 2b: Jeśli accountLevelOnly === false:
  // Pobierz wszystkie domeny (GET /api/cf/zones?per_page=50)
  onProgress?.({
    stage: 'zones',
    current: 0,
    total: 1,
    percentage: 15,
    message: 'Pobieranie listy domen (stref) Cloudflare...',
  })

  const zones = await fetchAllPages<CloudflareZone>('/zones?per_page=50', 50)

  // Jeśli brak domen na koncie, sprawdźmy reguły konta
  if (zones.length === 0) {
    onProgress?.({
      stage: 'accounts',
      current: 0,
      total: 1,
      percentage: 50,
      message: 'Brak domen. Pobieranie reguł poziomu konta...',
    })

    const accounts = await fetchAllPages<CloudflareAccount>('/accounts', 50)
    for (const account of accounts) {
      try {
        const rules = await fetchAllPages<CloudflareAccessRule>(
          `/accounts/${account.id}/firewall/access_rules/rules?per_page=100`,
          100
        )
        for (const rule of rules) {
          rulesMap.set(
            `account-${rule.id}`,
            normalizeAccessRule(rule, { accountId: account.id })
          )
        }
      } catch (err) {
        console.warn(`Błąd reguł konta ${account.name}:`, err)
      }
    }

    onProgress?.({
      stage: 'complete',
      current: 1,
      total: 1,
      percentage: 100,
      message: `Pobrano ${rulesMap.size} reguł.`,
    })

    return Array.from(rulesMap.values())
  }

  // Pobierz reguły równolegle dla każdej domeny z ograniczeniem p-limit(5)
  const limit = pLimit(5)
  let completedZones = 0

  onProgress?.({
    stage: 'rules',
    current: 0,
    total: zones.length,
    percentage: 20,
    message: `Rozpoczynanie pobierania reguł dla ${zones.length} domen (limit równoległości: 5)...`,
  })

  const tasks = zones.map((zone) =>
    limit(async () => {
      try {
        const rules = await fetchAllPages<CloudflareAccessRule>(
          `/zones/${zone.id}/firewall/access_rules/rules?per_page=100`,
          100
        )

        for (const rule of rules) {
          if (rule.scope?.type === 'account') {
            // Reguła z poziomu konta – pojawi się w tabeli tylko raz
            const key = `account-${rule.id}`
            if (!rulesMap.has(key)) {
              rulesMap.set(
                key,
                normalizeAccessRule(rule, {
                  accountId: zone.account?.id || rule.scope.id,
                })
              )
            }
          } else {
            // Reguła specyficzna dla strefy
            const key = `zone-${zone.id}-${rule.id}`
            rulesMap.set(
              key,
              normalizeAccessRule(rule, {
                zoneId: zone.id,
                zoneName: zone.name,
                accountId: zone.account?.id,
              })
            )
          }
        }
      } catch (err) {
        console.warn(
          `Błąd podczas pobierania reguł dla strefy ${zone.name} (${zone.id}):`,
          err
        )
      } finally {
        completedZones++
        const percent = Math.round(20 + (completedZones / zones.length) * 80)
        onProgress?.({
          stage: 'rules',
          current: completedZones,
          total: zones.length,
          percentage: Math.min(100, percent),
          message: `Pobrano reguły dla strefy ${zone.name} (${completedZones}/${zones.length})`,
        })
      }
    })
  )

  await Promise.all(tasks)

  onProgress?.({
    stage: 'complete',
    current: zones.length,
    total: zones.length,
    percentage: 100,
    message: `Ukończono. Znaleziono łącznie ${rulesMap.size} unikalnych reguł.`,
  })

  return Array.from(rulesMap.values())
}

/**
 * Usuwa pojedynczą regułę dostępu z Cloudflare.
 * - Dla 'account': DELETE /api/cf/accounts/{accountId}/firewall/access_rules/rules/{id}
 * - Dla 'zone': DELETE /api/cf/zones/{zoneId}/firewall/access_rules/rules/{id}
 */
export async function deleteAccessRule(
  rule: NormalizedAccessRule
): Promise<{ id: string }> {
  if (rule.scopeType === 'account') {
    if (!rule.accountId) {
      throw new Error(
        `Nie można usunąć reguły ${rule.id}: brak wymaganego accountId dla reguły na poziomie konta.`
      )
    }
    const res = await cfFetch<{ id: string }>(
      `/accounts/${rule.accountId}/firewall/access_rules/rules/${rule.id}`,
      {
        method: 'DELETE',
      }
    )
    return res.result
  }

  // scopeType === 'zone'
  if (!rule.zoneId) {
    throw new Error(
      `Nie można usunąć reguły ${rule.id}: brak wymaganego zoneId dla reguły strefy.`
    )
  }

  const res = await cfFetch<{ id: string }>(
    `/zones/${rule.zoneId}/firewall/access_rules/rules/${rule.id}`,
    {
      method: 'DELETE',
    }
  )
  return res.result
}

export interface BulkDeleteProgress {
  current: number
  total: number
  percentage: number
}

export interface BulkDeleteResult {
  total: number
  successful: NormalizedAccessRule[]
  failed: Array<{ rule: NormalizedAccessRule; error: string }>
}

/**
 * Usuwa wiele reguł współbieżnie z p-limit(5) i Promise.allSettled,
 * dzięki czemu pojedynczy błąd nie przerywa usuwania pozostałych reguł.
 */
export async function bulkDeleteAccessRules(
  rules: NormalizedAccessRule[],
  onProgress?: (progress: BulkDeleteProgress) => void
): Promise<BulkDeleteResult> {
  const limit = pLimit(5)
  const total = rules.length
  let current = 0

  onProgress?.({ current: 0, total, percentage: 0 })

  const tasks = rules.map((rule) =>
    limit(async () => {
      try {
        await deleteAccessRule(rule)
        return { success: true as const, rule }
      } catch (err) {
        return {
          success: false as const,
          rule,
          error:
            err instanceof Error ? err.message : 'Nieznany błąd podczas usuwania',
        }
      } finally {
        current++
        onProgress?.({
          current,
          total,
          percentage: Math.round((current / total) * 100),
        })
      }
    })
  )

  const settled = await Promise.allSettled(tasks)
  const successful: NormalizedAccessRule[] = []
  const failed: Array<{ rule: NormalizedAccessRule; error: string }> = []

  for (const item of settled) {
    if (item.status === 'fulfilled') {
      if (item.value.success) {
        successful.push(item.value.rule)
      } else {
        failed.push({ rule: item.value.rule, error: item.value.error })
      }
    } else {
      failed.push({
        rule: rules[0],
        error:
          item.reason instanceof Error
            ? item.reason.message
            : 'Nieoczekiwany błąd zadania',
      })
    }
  }

  return {
    total,
    successful,
    failed,
  }
}

