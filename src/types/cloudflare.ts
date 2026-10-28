export interface CloudflareApiMessage {
  code?: number
  message: string
}

export interface CloudflareResultInfo {
  page: number
  per_page: number
  count: number
  total_count: number
  total_pages?: number
}

export interface CloudflareApiResponse<T> {
  success: boolean
  errors: CloudflareApiMessage[]
  messages?: CloudflareApiMessage[]
  result: T
  result_info?: CloudflareResultInfo
}

export interface CloudflareAccount {
  id: string
  name: string
  type?: string
  created_on?: string
  settings?: Record<string, unknown>
}

export interface CloudflareZone {
  id: string
  name: string
  status?: string
  paused?: boolean
  type?: string
  account: {
    id: string
    name: string
  }
}

export type AccessRuleTarget = 'ip' | 'ip6' | 'ip_range' | 'asn' | 'country' | string

export type AccessRuleMode =
  | 'block'
  | 'challenge'
  | 'whitelist'
  | 'js_challenge'
  | 'managed_challenge'

export type CloudflareAccessRuleMode = AccessRuleMode

export interface CloudflareAccessRuleScope {
  id?: string
  name?: string
  email?: string
  type?: 'user' | 'organization' | 'zone' | 'account' | string
}

export interface CloudflareAccessRuleConfiguration {
  target: AccessRuleTarget
  value: string
}

export interface CloudflareAccessRule {
  id: string
  notes?: string
  allowed_modes?: string[]
  mode: AccessRuleMode | string
  configuration: CloudflareAccessRuleConfiguration
  scope: CloudflareAccessRuleScope
  created_on?: string
  modified_on?: string
}

export interface NormalizedAccessRule {
  id: string
  target: string
  value: string
  mode: AccessRuleMode | string
  notes: string
  created_on: string
  scopeType: 'account' | 'zone'
  rawScopeType?: 'user' | 'organization' | 'zone' | 'account' | string
  accountId?: string
  accountName?: string
  zoneId?: string
  zoneName?: string
}

export interface FetchProgress {
  loaded: number
  total: number
  percentage: number
  label: string
}

export type AccessRulesFetchProgress = FetchProgress

export interface ScopeSyncMeta {
  scopeKey: string
  totalPages: number
  returnedRuleKeys: Set<string>
  oldestTimestampOnFirstPage: number | null
}

export interface FirstPageDeltaResult {
  rules: NormalizedAccessRule[]
  scopeMetaMap: Map<string, ScopeSyncMeta>
}

export interface CreateRuleInput {
  scopeType: 'account' | 'zone'
  accountId?: string
  accountName?: string
  zoneId?: string
  zoneName?: string
  mode: CloudflareAccessRuleMode
  target: 'ip' | 'ip6' | 'ip_range' | 'asn' | 'country'
  value: string
  notes?: string
}

export interface BulkCreateResult {
  createdRules: NormalizedAccessRule[]
  errors: Array<{ value: string; message: string }>
}

