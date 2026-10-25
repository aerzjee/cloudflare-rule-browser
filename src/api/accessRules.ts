import pLimit from 'p-limit'
import { cfFetch } from './cfClient'
import { useSettingsStore } from '../store/useSettingsStore'
import type {
  CloudflareAccessRule,
  CloudflareAccessRuleMode,
  CloudflareAccount,
  CloudflareZone,
  FetchProgress,
  NormalizedAccessRule,
} from '../types/cloudflare'

/**
 * Wielowątkowe pobieranie wszystkich stron z Cloudflare API z p-limit(concurrency).
 * - Krok A: Pobiera najpierw stronę nr 1 (page=1&per_page=100&order=created_on&direction=desc).
 * - Krok B: Odczytuje result_info.total_pages. Jeśli total_pages <= 1, zwraca od razu stronę 1.
 * - Krok C: Jeśli total_pages > 1, tworzy tablicę pozostałych stron [2, 3, ..., total_pages].
 * - Krok D: Używa pLimit(concurrency) do równoległego pobrania pozostałych stron (Promise.all),
 *   zwiększając atomowo licznik loadedPages i wywołując onPageProgress.
 */
export async function fetchAllPages<T>(
  endpoint: string,
  defaultPerPageOrConcurrency: number = 100,
  concurrencyOrOnProgress?: number | ((loadedPages: number, totalPages: number) => void),
  onPageProgressArg?: (loadedPages: number, totalPages: number) => void
): Promise<T[]> {
  let defaultPerPage = 100
  let effectiveConcurrency = useSettingsStore.getState().concurrency ?? 2
  let onPageProgress: ((loadedPages: number, totalPages: number) => void) | undefined

  if (typeof concurrencyOrOnProgress === 'function') {
    defaultPerPage = defaultPerPageOrConcurrency
    onPageProgress = concurrencyOrOnProgress
  } else if (typeof concurrencyOrOnProgress === 'number') {
    defaultPerPage = defaultPerPageOrConcurrency
    effectiveConcurrency = concurrencyOrOnProgress
    onPageProgress = onPageProgressArg
  } else if (typeof onPageProgressArg === 'function') {
    effectiveConcurrency = defaultPerPageOrConcurrency
    onPageProgress = onPageProgressArg
  } else {
    defaultPerPage = defaultPerPageOrConcurrency
  }

  const urlObj = new URL(endpoint, 'http://localhost')

  if (!urlObj.searchParams.has('per_page')) {
    urlObj.searchParams.set('per_page', String(defaultPerPage))
  }
  urlObj.searchParams.set('page', '1')

  // Dodaj sortowanie chronologiczne od najnowszych dla reguł dostępu, jeśli nie określono
  if (endpoint.includes('access_rules') || endpoint.includes('rules')) {
    if (!urlObj.searchParams.has('order')) {
      urlObj.searchParams.set('order', 'created_on')
    }
    if (!urlObj.searchParams.has('direction')) {
      urlObj.searchParams.set('direction', 'desc')
    }
  }

  // Krok A: Pobierz najpierw stronę nr 1
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

  let loadedPages = 1
  onPageProgress?.(loadedPages, totalPages)

  // Krok B: Jeśli total_pages <= 1, zwróć od razu wyniki z 1. strony
  if (totalPages <= 1) {
    return items
  }

  // Krok C: Jeśli total_pages > 1, utwórz tablicę numerów pozostałych stron [2, 3, ..., total_pages]
  const remainingPages: number[] = []
  for (let p = 2; p <= totalPages; p++) {
    remainingPages.push(p)
  }

  // Krok D: Użyj pLimit(concurrency) i pobierz pozostałe strony równolegle (Promise.all)
  const limit = pLimit(effectiveConcurrency)
  const pageTasks = remainingPages.map((page) =>
    limit(async () => {
      const pageUrl = new URL(urlObj.toString())
      pageUrl.searchParams.set('page', String(page))
      const pagePath = pageUrl.pathname + pageUrl.search
      const pageRes = await cfFetch<T[]>(pagePath)
      loadedPages++
      onPageProgress?.(loadedPages, totalPages)
      return { page, data: pageRes.result || [] }
    })
  )

  const pageResults = await Promise.all(pageTasks)
  pageResults.sort((a, b) => a.page - b.page)
  for (const pr of pageResults) {
    items.push(...pr.data)
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
  concurrency?: number
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
  const effectiveConcurrency = options.concurrency ?? useSettingsStore.getState().concurrency ?? 2
  const rulesMap = new Map<string, NormalizedAccessRule>()

  if (accountLevelOnly) {
    // 2a: Pobierz konta (GET /api/cf/accounts)
    onProgress?.({
      loaded: 0,
      total: 100,
      percentage: 10,
      label: 'Pobieranie listy kont Cloudflare...',
    })

    const accounts = await fetchAllPages<CloudflareAccount>(
      '/accounts',
      50,
      effectiveConcurrency
    )

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
          `/accounts/${account.id}/firewall/access_rules/rules?per_page=100&order=created_on&direction=desc`,
          100,
          effectiveConcurrency,
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
          const key = `account-${account.id}-${rule.id}`
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

  const zones = await fetchAllPages<CloudflareZone>(
    '/zones?per_page=50',
    50,
    effectiveConcurrency
  )

  // Jeśli brak domen na koncie, sprawdźmy reguły konta
  if (zones.length === 0) {
    onProgress?.({
      loaded: 50,
      total: 100,
      percentage: 50,
      label: 'Brak domen. Pobieranie reguł poziomu konta...',
    })

    const accounts = await fetchAllPages<CloudflareAccount>(
      '/accounts',
      50,
      effectiveConcurrency
    )
    for (const account of accounts) {
      try {
        const rules = await fetchAllPages<CloudflareAccessRule>(
          `/accounts/${account.id}/firewall/access_rules/rules?per_page=100&order=created_on&direction=desc`,
          100,
          effectiveConcurrency
        )
        for (const rule of rules) {
          rulesMap.set(
            `account-${account.id}-${rule.id}`,
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

  // Pobierz reguły równolegle dla każdej domeny z ograniczeniem p-limit(effectiveConcurrency)
  const limit = pLimit(effectiveConcurrency)
  const totalZones = zones.length
  let completedZones = 0

  onProgress?.({
    loaded: 0,
    total: totalZones,
    percentage: 15,
    label: `Rozpoczynanie pobierania reguł dla ${totalZones} domen (współbieżność: ${effectiveConcurrency})...`,
  })

  const tasks = zones.map((zone) =>
    limit(async () => {
      try {
        const rules = await fetchAllPages<CloudflareAccessRule>(
          `/zones/${zone.id}/firewall/access_rules/rules?per_page=100&order=created_on&direction=desc`,
          100,
          effectiveConcurrency
        )

        for (const rule of rules) {
          if (isAccountLevelScope(rule.scope?.type)) {
            // Reguła z poziomu konta – unikalny klucz po koncie i ID
            const accountId = zone.account?.id || rule.scope?.id
            const key = `account-${accountId}-${rule.id}`
            if (!rulesMap.has(key)) {
              rulesMap.set(
                key,
                normalizeAccessRule(rule, {
                  accountId,
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
        console.warn(`Błąd podczas pobierania reguł dla strefy ${zone.name} (${zone.id}):`, err)
      } finally {
        completedZones++
        const percentage = Math.min(100, 15 + Math.round((completedZones / totalZones) * 85))
        onProgress?.({
          loaded: completedZones,
          total: totalZones,
          percentage,
          label: `Pobrano reguły dla ${completedZones} z ${totalZones} domen (${rulesMap.size} reguł)...`,
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

export interface UpdateAccessRulePayload {
  mode?: CloudflareAccessRuleMode | string
  notes?: string
}

/**
 * Aktualizuje regułę dostępu (mode lub notes) za pomocą metody PATCH.
 * Zgodnie z oficjalną dokumentacją Cloudflare API v4 dla IP Access Rules:
 * - Dla 'account': PATCH /api/cf/accounts/${rule.accountId}/firewall/access_rules/rules/${rule.id}
 * - Dla 'zone': PATCH /api/cf/zones/${rule.zoneId}/firewall/access_rules/rules/${rule.id}
 */
export async function updateAccessRule(
  rule: NormalizedAccessRule,
  payload: UpdateAccessRulePayload
): Promise<NormalizedAccessRule> {
  const isAccount = rule.scopeType === 'account' || isAccountLevelScope(rule.rawScopeType)
  const endpoint = isAccount
    ? `/accounts/${rule.accountId}/firewall/access_rules/rules/${rule.id}`
    : `/zones/${rule.zoneId}/firewall/access_rules/rules/${rule.id}`

  if (isAccount && !rule.accountId) {
    throw new Error(`Brak wymaganego accountId dla reguły konta ${rule.id}`)
  }
  if (!isAccount && !rule.zoneId) {
    throw new Error(`Brak wymaganego zoneId dla reguły strefy ${rule.id}`)
  }

  // Zawsze przekaż mode reguły (aktualne lub nowe), ponieważ Cloudflare API tego wymaga w PATCH
  const bodyData: { mode: string; notes?: string } = {
    mode: payload.mode ?? rule.mode,
  }
  if (payload.notes !== undefined) {
    bodyData.notes = payload.notes
  } else if (rule.notes) {
    bodyData.notes = rule.notes
  }

  const res = await cfFetch<CloudflareAccessRule>(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(bodyData),
  })

  const updatedRaw = res.result || {
    ...rule,
    mode: bodyData.mode,
    notes: bodyData.notes,
  }

  return normalizeAccessRule(updatedRaw as CloudflareAccessRule, {
    zoneId: rule.zoneId,
    zoneName: rule.zoneName,
    accountId: rule.accountId,
    accountName: rule.accountName,
  })
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
 * Usuwa wiele reguł współbieżnie z p-limit i Promise.allSettled,
 * dzięki czemu pojedynczy błąd nie przerywa usuwania pozostałych reguł.
 */
export async function bulkDeleteAccessRules(
  rules: NormalizedAccessRule[],
  onProgress?: (progress: BulkDeleteProgress) => void,
  concurrency?: number
): Promise<BulkDeleteResult> {
  const effectiveConcurrency = concurrency ?? useSettingsStore.getState().concurrency ?? 2
  const limit = pLimit(effectiveConcurrency)
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

/**
 * Szybkie odświeżanie tylko 1. strony (fetchFirstPageDelta) w accessRules.ts:
 * - Dla accountLevelOnly === true: pobiera TYLKO pierwszą stronę (page=1&per_page=100&order=created_on&direction=desc) dla konta.
 * - Dla accountLevelOnly === false: pobiera tylko pierwszą stronę (page=1&per_page=100&order=created_on&direction=desc) dla stref z pLimit(concurrency).
 * - Zwraca znormalizowaną tablicę NormalizedAccessRule[].
 */
export async function fetchFirstPageRules(
  accountLevelOnlyOrOptions: boolean | { accountLevelOnly?: boolean; concurrency?: number } = false,
  concurrencyArg?: number
): Promise<NormalizedAccessRule[]> {
  let accountLevelOnly = false
  let concurrency = useSettingsStore.getState().concurrency ?? 2

  if (typeof accountLevelOnlyOrOptions === 'boolean') {
    accountLevelOnly = accountLevelOnlyOrOptions
    if (typeof concurrencyArg === 'number') {
      concurrency = concurrencyArg
    }
  } else if (typeof accountLevelOnlyOrOptions === 'object' && accountLevelOnlyOrOptions !== null) {
    accountLevelOnly = accountLevelOnlyOrOptions.accountLevelOnly ?? false
    concurrency = accountLevelOnlyOrOptions.concurrency ?? concurrency
  }

  const effectiveConcurrency = concurrency
  const limit = pLimit(effectiveConcurrency)
  const rulesMap = new Map<string, NormalizedAccessRule>()

  if (accountLevelOnly) {
    const accountsRes = await cfFetch<CloudflareAccount[]>('/accounts?page=1&per_page=50')
    const accounts = accountsRes.result || []
    for (const account of accounts) {
      try {
        const res = await cfFetch<CloudflareAccessRule[]>(
          `/accounts/${account.id}/firewall/access_rules/rules?page=1&per_page=100&order=created_on&direction=desc`
        )
        const rules = res.result || []
        for (const rule of rules) {
          const key = `account-${account.id}-${rule.id}`
          rulesMap.set(
            key,
            normalizeAccessRule(rule, {
              accountId: account.id,
              accountName: account.name || rule.scope?.name || rule.scope?.email || 'Konto Cloudflare',
            })
          )
        }
      } catch (err) {
        console.warn(`[fetchFirstPageRules] Błąd reguł konta ${account.name}:`, err)
      }
    }
    return Array.from(rulesMap.values())
  }

  // All Zones
  const zonesRes = await cfFetch<CloudflareZone[]>('/zones?page=1&per_page=50')
  const zones = zonesRes.result || []

  // Jeśli brak domen, sprawdźmy reguły konta
  if (zones.length === 0) {
    const accountsRes = await cfFetch<CloudflareAccount[]>('/accounts?page=1&per_page=50')
    const accounts = accountsRes.result || []
    for (const account of accounts) {
      try {
        const res = await cfFetch<CloudflareAccessRule[]>(
          `/accounts/${account.id}/firewall/access_rules/rules?page=1&per_page=100&order=created_on&direction=desc`
        )
        const rules = res.result || []
        for (const rule of rules) {
          const key = `account-${account.id}-${rule.id}`
          rulesMap.set(
            key,
            normalizeAccessRule(rule, {
              accountId: account.id,
              accountName: account.name || rule.scope?.name || rule.scope?.email || 'Konto Cloudflare',
            })
          )
        }
      } catch (err) {
        console.warn(`[fetchFirstPageRules] Błąd reguł konta ${account.name}:`, err)
      }
    }
    return Array.from(rulesMap.values())
  }

  const tasks = zones.map((zone) =>
    limit(async () => {
      try {
        const res = await cfFetch<CloudflareAccessRule[]>(
          `/zones/${zone.id}/firewall/access_rules/rules?page=1&per_page=100&order=created_on&direction=desc`
        )
        const rules = res.result || []
        for (const rule of rules) {
          if (isAccountLevelScope(rule.scope?.type)) {
            const accountId = zone.account?.id || rule.scope?.id
            const key = `account-${accountId}-${rule.id}`
            if (!rulesMap.has(key)) {
              rulesMap.set(
                key,
                normalizeAccessRule(rule, {
                  accountId,
                  accountName:
                    zone.account?.name ||
                    rule.scope?.name ||
                    rule.scope?.email ||
                    'Konto Cloudflare',
                })
              )
            }
          } else {
            const key = `zone-${zone.id}-${rule.id}`
            rulesMap.set(
              key,
              normalizeAccessRule(rule, {
                zoneId: zone.id,
                zoneName: zone.name,
              })
            )
          }
        }
      } catch (err) {
        console.warn(`[fetchFirstPageRules] Błąd reguł strefy ${zone.name}:`, err)
      }
    })
  )

  await Promise.all(tasks)
  return Array.from(rulesMap.values())
}

/** Alias do szybkiego odświeżania różnicowego 1. strony */
export const fetchFirstPageDelta = fetchFirstPageRules

