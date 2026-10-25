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

export type AccessRuleTarget = 'ip' | 'ip_range' | 'asn' | 'country' | string

export type AccessRuleMode =
  | 'block'
  | 'challenge'
  | 'whitelist'
  | 'js_challenge'
  | 'managed_challenge'

export interface CloudflareAccessRuleScope {
  id: string
  name?: string
  type: 'zone' | 'account' | string
  email?: string
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
  scopeType: 'zone' | 'account'
  zoneId?: string
  zoneName?: string
  accountId?: string
}

export interface AccessRulesFetchProgress {
  stage: 'idle' | 'accounts' | 'zones' | 'rules' | 'complete'
  current: number
  total: number
  percentage: number
  message?: string
}
