import pLimit from 'p-limit'
import { cfFetch } from './cfClient'
import type {
  CloudflareAccessRule,
  CloudflareAccount,
  CloudflareZone,
  FetchProgress,
  NormalizedAccessRule,
} from '../types/cloudflare'

/**
 * Helper to fetch all pages from a paginated Cloudflare endpoint.
 * Fetches page 1, reads `result_info.total_pages`, and fetches subsequent pages in sequence.
 * Optionally reports per-page progress via onPageProgress.
 */
export async function fetchAllPages<T>(
  endpoint: string,
  defaultPerPage: number = 100,
  onPageProgress?: (page: number, totalPages: number) => void
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

  onPageProgress?.(1, totalPages)

  if (totalPages > 1) {
    for (let page = 2; page <= totalPages; page++) {
      urlObj.searchParams.set('page', String(page))
      const nextPath = urlObj.pathname + urlObj.search
      const nextRes = await cfFetch<T[]>(nextPath)
      if (nextRes.result && Array.isArray(nextRes.result)) {
        items.push(...nextRes.result)
      }
      onPageProgress?.(page, totalPages)
    }
  }

  return items
}

/**
 * Helper sprawdzający, czy dany typ zakresu Cloudflare reprezentuje poziom konta.
 * W Cloudflare API v4 IP Access Rules zwracają 'user', 'organization' lub 'account'.
 */
export const isAccountLevelScope = (type?: string): boolean =>
  type === 'user' || type === 'organization' || type === 'account'

/**
 * Normalizes a raw Cloudflare access rule into a unified NormalizedAccessRule.
 */
export function normalizeAccessRule(
  rule: CloudflareAccessRule,
  context?: {
    zoneId?: string
    zoneName?: string
    accountId?: string
    accountName?: string
  }
): NormalizedAccessRule {
  const rawType = rule.scope?.type
  const isAccount =
    isAccountLevelScope(rawType) || (!context?.zoneId && Boolean(context?.accountId))

  if (isAccount) {
    return {
      id: rule.id,
      target: rule.configuration?.target || '',
      value: rule.configuration?.value || '',
      mode: rule.mode,
      notes: rule.notes || '',
      created_on: rule.created_on || '',
      scopeType: 'account',
      rawScopeType: (rawType as 'user' | 'organization' | 'zone' | 'account') || 'account',
      accountId: context?.accountId || rule.scope?.id,
      accountName:
        context?.accountName ||
        rule.scope?.name ||
        rule.scope?.email ||
        'Konto Cloudflare',
      zoneId: undefined,
      zoneName: undefined,
    }
  }

  return {
    id: rule.id,
    target: rule.configuration?.target || '',
    value: rule.configuration?.value || '',
    mode: rule.mode,
    notes: rule.notes || '',
    created_on: rule.created_on || '',
    scopeType: 'zone',
    rawScopeType: 'zone',
    zoneId: context?.zoneId || (rule.scope?.type === 'zone' ? rule.scope.id : undefined),
    zoneName: context?.zoneName || (rule.scope?.type === 'zone' ? rule.scope.name : undefined),
    accountId: context?.accountId,
    accountName: context?.accountName,
  }
}

export interface FetchAccessRulesOptions {
  accountLevelOnly?: boolean
  onProgress?: (progress: FetchProgress) => void
}

/**
 * Fetches all access rules from Cloudflare API.
 * - If accountLevelOnly === true: fetches accounts, then fetches rules for each account with page progress.
 * - If accountLevelOnly === false: fetches zones, then concurrently fetches rules for each zone with p-limit(5).
 * Deduplicates account rules and zone rules using a Map with specified keys.
 */
export async function fetchAccessRules(
  options: FetchAccessRulesOptions = {}
): Promise<NormalizedAccessRule[]> {
  const { accountLevelOnly = false, onProgress } = options
  const rulesMap = new Map<string, NormalizedAccessRule>()

  if (accountLevelOnly) {
    // 2a: Pobierz konta (GET /api/cf/accounts)
    onProgress?.({
      loaded: 0,
      total: 100,
      percentage: 10,
      label: 'Pobieranie listy kont Cloudflare...',
    })

    const accounts = await fetchAllPages<CloudflareAccount>('/accounts', 50)

    if (accounts.length === 0) {
      onProgress?.({
        loaded: 0,
        total: 0,
        percentage: 100,
        label: 'Brak dostępnych kont Cloudflare dla bieżącego tokenu.',
      })
      return []
    }

    onProgress?.({
      loaded: 25,
      total: 100,
      percentage: 25,
      label: 'Pobieranie reguł dla konta...',
    })

    for (const account of accounts) {
      try {
        const rules = await fetchAllPages<CloudflareAccessRule>(
          `/accounts/${account.id}/firewall/access_rules/rules?per_page=100`,
          100,
          (page, totalPages) => {
            const percentage = Math.min(100, 25 + Math.round((page / totalPages) * 75))
            onProgress?.({
              loaded: page,
              total: totalPages,
              percentage,
              label: `Pobieranie reguł konta (strona ${page} z ${totalPages})...`,
            })
          }
        )

        for (const rule of rules) {
          const key = `account-${rule.id}`
          rulesMap.set(
            key,
            normalizeAccessRule(rule, {
              accountId: account.id,
              accountName: account.name || rule.scope?.name || rule.scope?.email || 'Konto Cloudflare',
            })
          )
        }
      } catch (err) {
        console.warn(`Błąd podczas pobierania reguł konta ${account.name} (${account.id}):`, err)
      }
    }

    onProgress?.({
      loaded: 100,
      total: 100,
      percentage: 100,
      label: `Pobrano ${rulesMap.size} reguł konta.`,
    })

    return Array.from(rulesMap.values())
  }

  // 2b: Jeśli accountLevelOnly === false:
  // Pobierz wszystkie domeny (GET /api/cf/zones?per_page=50)
  onProgress?.({
    loaded: 0,
    total: 100,
    percentage: 10,
    label: 'Pobieranie listy domen...',
  })

  const zones = await fetchAllPages<CloudflareZone>('/zones?per_page=50', 50)

  // Jeśli brak domen na koncie, sprawdźmy reguły konta
  if (zones.length === 0) {
    onProgress?.({
      loaded: 50,
      total: 100,
      percentage: 50,
      label: 'Brak domen. Pobieranie reguł poziomu konta...',
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
            normalizeAccessRule(rule, {
              accountId: account.id,
              accountName: account.name || rule.scope?.name || rule.scope?.email || 'Konto Cloudflare',
            })
          )
        }
      } catch (err) {
        console.warn(`Błąd reguł konta ${account.name}:`, err)
      }
    }

    onProgress?.({
      loaded: 100,
      total: 100,
      percentage: 100,
      label: `Pobrano ${rulesMap.size} reguł.`,
    })

    return Array.from(rulesMap.values())
  }

  // Pobierz reguły równolegle dla każdej domeny z ograniczeniem p-limit(5)
  const limit = pLimit(5)
  const totalZones = zones.length
  let completedZones = 0

  onProgress?.({
    loaded: 0,
    total: totalZones,
    percentage: 15,
    label: `Rozpoczynanie pobierania reguł dla ${totalZones} domen...`,
  })

  const tasks = zones.map((zone) =>
    limit(async () => {
      try {
        const rules = await fetchAllPages<CloudflareAccessRule>(
          `/zones/${zone.id}/firewall/access_rules/rules?per_page=100`,
          100
        )

        for (const rule of rules) {
          if (isAccountLevelScope(rule.scope?.type)) {
            // Reguła z poziomu konta – pojawi się w tabeli tylko raz
            const key = `account-${rule.id}`
            if (!rulesMap.has(key)) {
              rulesMap.set(
                key,
                normalizeAccessRule(rule, {
                  accountId: zone.account?.id || rule.scope?.id,
                  accountName:
                    zone.account?.name ||
                    rule.scope?.name ||
                    rule.scope?.email ||
                    'Konto Cloudflare',
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
                accountName: zone.account?.name,
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
        const percentage = Math.min(100, 15 + Math.round((completedZones / totalZones) * 85))
        onProgress?.({
          loaded: completedZones,
          total: totalZones,
          percentage,
          label: `Pobrano domeny: ${completedZones} / ${totalZones} (${zone.name})`,
        })
      }
    })
  )

  await Promise.all(tasks)

  onProgress?.({
    loaded: totalZones,
    total: totalZones,
    percentage: 100,
    label: `Ukończono pobieranie reguł dla wszystkich domen (${rulesMap.size} reguł).`,
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
  if (rule.scopeType === 'account' || isAccountLevelScope(rule.rawScopeType)) {
    if (!rule.accountId) {
      throw new Error(
        `Brak wymaganego accountId dla reguły konta ${rule.id}`
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

