import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/useAuthStore'
import { fetchAccountsList, fetchZonesList } from '../api/accessRules'
import type { NormalizedAccessRule } from '../types/cloudflare'

export interface AvailableScope {
  id: string
  type: 'account' | 'zone'
  name: string
  accountId?: string
  accountName?: string
  zoneId?: string
  zoneName?: string
}

export function useAvailableScopes(rules: NormalizedAccessRule[] = []) {
  const accountLevelOnly = useAuthStore((s) => s.accountLevelOnly)
  const email = useAuthStore((s) => s.email)
  const token = useAuthStore((s) => s.token)

  // 1. Extract known accounts from existing rules in memory
  const accountsFromRules = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    for (const r of rules) {
      if (r.accountId) {
        map.set(r.accountId, {
          id: r.accountId,
          name: r.accountName || 'Cloudflare Account',
        })
      }
    }
    return Array.from(map.values())
  }, [rules])

  // 2. Extract known zones from existing rules in memory
  const zonesFromRules = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; accountId?: string; accountName?: string }
    >()
    for (const r of rules) {
      if (r.zoneId) {
        map.set(r.zoneId, {
          id: r.zoneId,
          name: r.zoneName || 'Zone',
          accountId: r.accountId,
          accountName: r.accountName,
        })
      }
    }
    return Array.from(map.values())
  }, [rules])

  // Query accounts if account-level only and not found in rules
  const accountsQuery = useQuery({
    queryKey: ['cloudflare', 'accounts_list', { email }],
    queryFn: fetchAccountsList,
    enabled: Boolean(email && token && accountLevelOnly && accountsFromRules.length === 0),
    staleTime: 10 * 60 * 1000,
  })

  // Query zones if in all-zones mode
  const zonesQuery = useQuery({
    queryKey: ['cloudflare', 'zones_list', { email }],
    queryFn: fetchZonesList,
    enabled: Boolean(email && token && !accountLevelOnly),
    staleTime: 10 * 60 * 1000,
  })

  // Build unified scope options list
  const scopes = useMemo<AvailableScope[]>(() => {
    if (accountLevelOnly) {
      const accounts =
        accountsFromRules.length > 0
          ? accountsFromRules
          : (accountsQuery.data || []).map((a) => ({ id: a.id, name: a.name }))

      return accounts.map((acc) => ({
        id: `account-${acc.id}`,
        type: 'account',
        name: acc.name,
        accountId: acc.id,
        accountName: acc.name,
      }))
    }

    // All Zones mode: Merge account options + individual zone options
    const result: AvailableScope[] = []
    const accountMap = new Map<string, string>()

    // First, collect account info from zones query or rules
    for (const acc of accountsFromRules) {
      accountMap.set(acc.id, acc.name)
    }

    const zonesData = zonesQuery.data || []
    for (const zone of zonesData) {
      if (zone.account?.id) {
        accountMap.set(zone.account.id, zone.account.name || 'Cloudflare Account')
      }
    }

    // Add Account Level scope(s)
    for (const [accId, accName] of accountMap.entries()) {
      result.push({
        id: `account-${accId}`,
        type: 'account',
        name: accName,
        accountId: accId,
        accountName: accName,
      })
    }

    // Add Zone scopes
    const zoneMap = new Map<string, AvailableScope>()
    for (const z of zonesFromRules) {
      zoneMap.set(z.id, {
        id: `zone-${z.id}`,
        type: 'zone',
        name: z.name,
        zoneId: z.id,
        zoneName: z.name,
        accountId: z.accountId,
        accountName: z.accountName,
      })
    }

    for (const zone of zonesData) {
      zoneMap.set(zone.id, {
        id: `zone-${zone.id}`,
        type: 'zone',
        name: zone.name,
        zoneId: zone.id,
        zoneName: zone.name,
        accountId: zone.account?.id,
        accountName: zone.account?.name,
      })
    }

    result.push(...Array.from(zoneMap.values()))
    return result
  }, [
    accountLevelOnly,
    accountsFromRules,
    accountsQuery.data,
    zonesFromRules,
    zonesQuery.data,
  ])

  const isLoading = accountLevelOnly
    ? accountsQuery.isLoading && accountsFromRules.length === 0
    : zonesQuery.isLoading && zonesFromRules.length === 0

  return {
    scopes,
    isLoading,
    accountLevelOnly,
  }
}
