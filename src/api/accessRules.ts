import pLimit from 'p-limit'
import { cfFetch } from './cfClient'
import { useSettingsStore } from '../store/useSettingsStore'
import { getTranslations } from '../i18n/useTranslation'
import type {
  CloudflareAccessRule,
  CloudflareAccessRuleMode,
  CloudflareAccount,
  CloudflareZone,
  FetchProgress,
  FirstPageDeltaResult,
  NormalizedAccessRule,
  ScopeSyncMeta,
} from '../types/cloudflare'

/**
 * Multi-threaded fetching of all pages from Cloudflare API with p-limit(concurrency).
 * - Step A: Fetches page 1 first (page=1&per_page=100&order=created_on&direction=desc).
 * - Step B: Reads result_info.total_pages. If total_pages <= 1, returns page 1 immediately.
 * - Step C: If total_pages > 1, creates an array of remaining pages [2, 3, ..., total_pages].
 * - Step D: Uses pLimit(concurrency) to fetch remaining pages in parallel (Promise.all),
 *   atomically incrementing loadedPages and invoking onPageProgress.
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

  // Add chronological sorting (newest first) for access rules unless already specified
  if (endpoint.includes('access_rules') || endpoint.includes('rules')) {
    if (!urlObj.searchParams.has('order')) {
      urlObj.searchParams.set('order', 'created_on')
    }
    if (!urlObj.searchParams.has('direction')) {
      urlObj.searchParams.set('direction', 'desc')
    }
  }

  // Step A: Fetch page 1 first
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

  // Step B: If total_pages <= 1, return results from page 1 immediately
  if (totalPages <= 1) {
    return items
  }

  // Step C: If total_pages > 1, create array of remaining page numbers [2, 3, ..., total_pages]
  const remainingPages: number[] = []
  for (let p = 2; p <= totalPages; p++) {
    remainingPages.push(p)
  }

  // Step D: Use pLimit(concurrency) to fetch remaining pages in parallel (Promise.all)
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
 * Helper checking if a given Cloudflare scope type represents an account-level scope.
 * In Cloudflare API v4 IP Access Rules, scope types return 'user', 'organization', or 'account'.
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
  const tApi = getTranslations().api

  if (accountLevelOnly) {
    // 2a: Fetch accounts (GET /api/cf/accounts)
    onProgress?.({
      loaded: 0,
      total: 100,
      percentage: 10,
      label: tApi.initAccounts,
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
        label: tApi.noAccounts,
      })
      return []
    }

    onProgress?.({
      loaded: 25,
      total: 100,
      percentage: 25,
      label: tApi.fetchingAccountRules,
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
              label: tApi.fetchingAccountRulesPage(page, totalPages),
            })
          }
        )

        for (const rule of rules) {
          const key = `account-${account.id}-${rule.id}`
          rulesMap.set(
            key,
            normalizeAccessRule(rule, {
              accountId: account.id,
              accountName: account.name || rule.scope?.name || rule.scope?.email || 'Cloudflare Account',
            })
          )
        }
      } catch (err) {
        console.warn(`Error fetching account rules for ${account.name} (${account.id}):`, err)
      }
    }

    onProgress?.({
      loaded: 100,
      total: 100,
      percentage: 100,
      label: tApi.accountRulesFetched(rulesMap.size),
    })

    return Array.from(rulesMap.values())
  }

  // 2b: If accountLevelOnly === false:
  // Fetch all zones (GET /api/cf/zones?per_page=50)
  onProgress?.({
    loaded: 0,
    total: 100,
    percentage: 10,
    label: tApi.initZones,
  })

  const zones = await fetchAllPages<CloudflareZone>(
    '/zones?per_page=50',
    50,
    effectiveConcurrency
  )

  // If no zones found on account, fallback to checking account rules
  if (zones.length === 0) {
    onProgress?.({
      loaded: 50,
      total: 100,
      percentage: 50,
      label: tApi.noZonesAccountFallback,
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
              accountName: account.name || rule.scope?.name || rule.scope?.email || 'Cloudflare Account',
            })
          )
        }
      } catch (err) {
        console.warn(`Error fetching account rules for ${account.name}:`, err)
      }
    }

    onProgress?.({
      loaded: 100,
      total: 100,
      percentage: 100,
      label: tApi.zonesFetched(rulesMap.size),
    })

    return Array.from(rulesMap.values())
  }

  // Fetch rules in parallel for each zone with p-limit(effectiveConcurrency)
  const limit = pLimit(effectiveConcurrency)
  const totalZones = zones.length
  let completedZones = 0

  onProgress?.({
    loaded: 0,
    total: totalZones,
    percentage: 15,
    label: tApi.startingZonesFetch(totalZones, effectiveConcurrency),
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
            // Account-level rule – unique key by account and rule ID
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
                    'Cloudflare Account',
                })
              )
            }
          } else {
            // Zone-specific rule
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
        console.warn(`Error fetching rules for zone ${zone.name} (${zone.id}):`, err)
      } finally {
        completedZones++
        const percentage = Math.min(100, 15 + Math.round((completedZones / totalZones) * 85))
        onProgress?.({
          loaded: completedZones,
          total: totalZones,
          percentage,
          label: tApi.zoneRulesProgress(completedZones, totalZones, rulesMap.size),
        })
      }
    })
  )

  await Promise.all(tasks)

  onProgress?.({
    loaded: totalZones,
    total: totalZones,
    percentage: 100,
    label: tApi.allZonesCompleted(rulesMap.size),
  })

  return Array.from(rulesMap.values())
}

/**
 * Deletes a single access rule from Cloudflare.
 * - For 'account': DELETE /api/cf/accounts/{accountId}/firewall/access_rules/rules/{id}
 * - For 'zone': DELETE /api/cf/zones/{zoneId}/firewall/access_rules/rules/{id}
 */
export async function deleteAccessRule(
  rule: NormalizedAccessRule
): Promise<{ id: string }> {
  if (rule.scopeType === 'account' || isAccountLevelScope(rule.rawScopeType)) {
    if (!rule.accountId) {
      throw new Error(
        `Missing required accountId for account-level rule ${rule.id}`
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
      `Cannot delete rule ${rule.id}: missing required zoneId for zone rule.`
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
 * Updates an access rule (mode or notes) using the PATCH method.
 * According to official Cloudflare API v4 IP Access Rules documentation:
 * - For 'account': PATCH /api/cf/accounts/${rule.accountId}/firewall/access_rules/rules/${rule.id}
 * - For 'zone': PATCH /api/cf/zones/${rule.zoneId}/firewall/access_rules/rules/${rule.id}
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
    throw new Error(getTranslations().deleteModal.errorAccountMissing)
  }
  if (!isAccount && !rule.zoneId) {
    throw new Error(getTranslations().deleteModal.errorZoneMissing)
  }

  // Always pass the rule mode (existing or updated) as required by the Cloudflare PATCH endpoint
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
 * Deletes multiple rules concurrently with p-limit and Promise.allSettled,
 * ensuring individual failures do not interrupt the rest of the batch.
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
            err instanceof Error ? err.message : getTranslations().common.error,
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
            : getTranslations().common.error,
      })
    }
  }

  return {
    total,
    successful,
    failed,
  }
}

/** Unique key for access rule matching Cloudflare scope model */
export function getRuleUniqueKey(rule: NormalizedAccessRule): string {
  return rule.scopeType === 'account'
    ? `account-${rule.accountId}-${rule.id}`
    : `zone-${rule.zoneId}-${rule.id}`
}

/** Scope group identifier for rule reconciliation (account-{id} or zone-{id}) */
export function getRuleScopeKey(rule: NormalizedAccessRule): string {
  return rule.scopeType === 'account'
    ? `account-${rule.accountId}`
    : `zone-${rule.zoneId}`
}

export interface ReconcileDeltaResult {
  reconciledRules: NormalizedAccessRule[]
  newlyAddedKeys: string[]
  deletedKeys: string[]
}

/**
 * Windowed Delta Reconciliation algorithm:
 * - Updates existing rules present on page 1 with freshest API data.
 * - Detects and removes rules deleted from Cloudflare:
 *   - Condition A: scope totalPages <= 1 OR page 1 returned 0 rules (entire scope fits on page 1).
 *   - Condition B: scope totalPages > 1, and rule's created_on >= oldestTimestampOnFirstPage (was inside page 1 window).
 * - Preserves older rules living on pages 2..N (created_on < oldestTimestampOnFirstPage).
 * - Prepends brand-new rules not previously seen in currentRules.
 */
export function reconcileFirstPageDelta(
  currentRules: NormalizedAccessRule[],
  deltaResult: FirstPageDeltaResult
): ReconcileDeltaResult {
  const { rules: deltaRules, scopeMetaMap } = deltaResult

  // 1. Index delta rules by their unique key
  const deltaRulesMap = new Map<string, NormalizedAccessRule>()
  for (const delta of deltaRules) {
    deltaRulesMap.set(getRuleUniqueKey(delta), delta)
  }

  // 2. Index current existing rules
  const currentRulesKeySet = new Set<string>()
  for (const r of currentRules) {
    currentRulesKeySet.add(getRuleUniqueKey(r))
  }

  const keptRules: NormalizedAccessRule[] = []
  const deletedKeys: string[] = []

  // 3. Reconcile existing local rules
  for (const localRule of currentRules) {
    const ruleKey = getRuleUniqueKey(localRule)
    const scopeKey = getRuleScopeKey(localRule)
    const meta = scopeMetaMap.get(scopeKey)

    // If no sync metadata exists for this scope (e.g. zone fetch failure), retain safely
    if (!meta) {
      keptRules.push(localRule)
      continue
    }

    // Rule still exists on page 1 -> keep updated version
    if (meta.returnedRuleKeys.has(ruleKey)) {
      const updated = deltaRulesMap.get(ruleKey) ?? localRule
      keptRules.push(updated)
      continue
    }

    // Rule is missing from page 1 -> evaluate deletion conditions
    const localTs = localRule.created_on ? Date.parse(localRule.created_on) : null

    // Condition A: entire scope fits on 1 page (totalPages <= 1) OR page 1 is completely empty
    const conditionA = meta.totalPages <= 1 || meta.returnedRuleKeys.size === 0

    // Condition B: multiple pages, but local rule was created within or after page 1's time window
    const conditionB =
      meta.totalPages > 1 &&
      meta.oldestTimestampOnFirstPage !== null &&
      localTs !== null &&
      !Number.isNaN(localTs) &&
      localTs >= meta.oldestTimestampOnFirstPage

    if (conditionA || conditionB) {
      // Rule was deleted in Cloudflare -> purge from local list
      deletedKeys.push(ruleKey)
    } else {
      // Rule is older than page 1 window (lives on pages 2..N) -> retain
      keptRules.push(localRule)
    }
  }

  // 4. Collect brand new rules from delta that were not in currentRules
  const newRulesToPrepend: NormalizedAccessRule[] = []
  const newlyAddedKeys: string[] = []

  for (const delta of deltaRules) {
    const key = getRuleUniqueKey(delta)
    if (!currentRulesKeySet.has(key)) {
      newRulesToPrepend.push(delta)
      newlyAddedKeys.push(key)
    }
  }

  // 5. Final reconciled array: brand new rules prepended, followed by retained/updated rules
  const reconciledRules = [...newRulesToPrepend, ...keptRules]

  return {
    reconciledRules,
    newlyAddedKeys,
    deletedKeys,
  }
}

/**
 * Fast refresh of page 1 only with Windowed Reconciliation metadata:
 * - For accountLevelOnly === true: fetches page 1 for account(s) and records ScopeSyncMeta.
 * - For accountLevelOnly === false: fetches page 1 for zones and records ScopeSyncMeta.
 * - Returns FirstPageDeltaResult { rules, scopeMetaMap }.
 */
export async function fetchFirstPageRules(
  accountLevelOnlyOrOptions: boolean | { accountLevelOnly?: boolean; concurrency?: number } = false,
  concurrencyArg?: number
): Promise<FirstPageDeltaResult> {
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
  const scopeMetaMap = new Map<string, ScopeSyncMeta>()

  if (accountLevelOnly) {
    const accountsRes = await cfFetch<CloudflareAccount[]>('/accounts?page=1&per_page=50')
    const accounts = accountsRes.result || []
    for (const account of accounts) {
      try {
        const res = await cfFetch<CloudflareAccessRule[]>(
          `/accounts/${account.id}/firewall/access_rules/rules?page=1&per_page=100&order=created_on&direction=desc`
        )
        const totalPages =
          res.result_info?.total_pages ??
          (res.result_info?.total_count
            ? Math.ceil(res.result_info.total_count / (res.result_info.per_page || 100))
            : 1)

        const rules = res.result || []
        const returnedRuleKeys = new Set<string>()
        let oldestTimestampOnFirstPage: number | null = null

        for (const rule of rules) {
          const key = `account-${account.id}-${rule.id}`
          returnedRuleKeys.add(key)

          const ts = rule.created_on ? Date.parse(rule.created_on) : null
          if (ts !== null && !Number.isNaN(ts)) {
            if (oldestTimestampOnFirstPage === null || ts < oldestTimestampOnFirstPage) {
              oldestTimestampOnFirstPage = ts
            }
          }

          rulesMap.set(
            key,
            normalizeAccessRule(rule, {
              accountId: account.id,
              accountName: account.name || rule.scope?.name || rule.scope?.email || 'Cloudflare Account',
            })
          )
        }

        const scopeKey = `account-${account.id}`
        scopeMetaMap.set(scopeKey, {
          scopeKey,
          totalPages,
          returnedRuleKeys,
          oldestTimestampOnFirstPage,
        })
      } catch (err) {
        console.warn(`[fetchFirstPageRules] Error fetching account rules for ${account.name}:`, err)
      }
    }

    return {
      rules: Array.from(rulesMap.values()),
      scopeMetaMap,
    }
  }

  // All Zones mode
  const zonesRes = await cfFetch<CloudflareZone[]>('/zones?page=1&per_page=50')
  const zones = zonesRes.result || []

  // If no zones found, fallback to checking account rules
  if (zones.length === 0) {
    const accountsRes = await cfFetch<CloudflareAccount[]>('/accounts?page=1&per_page=50')
    const accounts = accountsRes.result || []
    for (const account of accounts) {
      try {
        const res = await cfFetch<CloudflareAccessRule[]>(
          `/accounts/${account.id}/firewall/access_rules/rules?page=1&per_page=100&order=created_on&direction=desc`
        )
        const totalPages =
          res.result_info?.total_pages ??
          (res.result_info?.total_count
            ? Math.ceil(res.result_info.total_count / (res.result_info.per_page || 100))
            : 1)

        const rules = res.result || []
        const returnedRuleKeys = new Set<string>()
        let oldestTimestampOnFirstPage: number | null = null

        for (const rule of rules) {
          const key = `account-${account.id}-${rule.id}`
          returnedRuleKeys.add(key)

          const ts = rule.created_on ? Date.parse(rule.created_on) : null
          if (ts !== null && !Number.isNaN(ts)) {
            if (oldestTimestampOnFirstPage === null || ts < oldestTimestampOnFirstPage) {
              oldestTimestampOnFirstPage = ts
            }
          }

          rulesMap.set(
            key,
            normalizeAccessRule(rule, {
              accountId: account.id,
              accountName: account.name || rule.scope?.name || rule.scope?.email || 'Cloudflare Account',
            })
          )
        }

        const scopeKey = `account-${account.id}`
        scopeMetaMap.set(scopeKey, {
          scopeKey,
          totalPages,
          returnedRuleKeys,
          oldestTimestampOnFirstPage,
        })
      } catch (err) {
        console.warn(`[fetchFirstPageRules] Error fetching account rules for ${account.name}:`, err)
      }
    }

    return {
      rules: Array.from(rulesMap.values()),
      scopeMetaMap,
    }
  }

  const tasks = zones.map((zone) =>
    limit(async () => {
      try {
        const res = await cfFetch<CloudflareAccessRule[]>(
          `/zones/${zone.id}/firewall/access_rules/rules?page=1&per_page=100&order=created_on&direction=desc`
        )
        const totalPages =
          res.result_info?.total_pages ??
          (res.result_info?.total_count
            ? Math.ceil(res.result_info.total_count / (res.result_info.per_page || 100))
            : 1)

        const rules = res.result || []
        const returnedRuleKeys = new Set<string>()
        let oldestTimestampOnFirstPage: number | null = null

        for (const rule of rules) {
          let key: string
          let normalized: NormalizedAccessRule

          if (isAccountLevelScope(rule.scope?.type)) {
            const accountId = zone.account?.id || rule.scope?.id
            key = `account-${accountId}-${rule.id}`
            normalized = normalizeAccessRule(rule, {
              accountId,
              accountName:
                zone.account?.name ||
                rule.scope?.name ||
                rule.scope?.email ||
                'Cloudflare Account',
            })
          } else {
            key = `zone-${zone.id}-${rule.id}`
            normalized = normalizeAccessRule(rule, {
              zoneId: zone.id,
              zoneName: zone.name,
            })
          }

          returnedRuleKeys.add(key)

          const ts = rule.created_on ? Date.parse(rule.created_on) : null
          if (ts !== null && !Number.isNaN(ts)) {
            if (oldestTimestampOnFirstPage === null || ts < oldestTimestampOnFirstPage) {
              oldestTimestampOnFirstPage = ts
            }
          }

          if (!rulesMap.has(key)) {
            rulesMap.set(key, normalized)
          }
        }

        const scopeKey = `zone-${zone.id}`
        scopeMetaMap.set(scopeKey, {
          scopeKey,
          totalPages,
          returnedRuleKeys,
          oldestTimestampOnFirstPage,
        })
      } catch (err) {
        console.warn(`[fetchFirstPageRules] Error fetching zone rules for ${zone.name}:`, err)
      }
    })
  )

  await Promise.all(tasks)

  return {
    rules: Array.from(rulesMap.values()),
    scopeMetaMap,
  }
}

/** Alias for fast differential page 1 refresh */
export const fetchFirstPageDelta = fetchFirstPageRules

