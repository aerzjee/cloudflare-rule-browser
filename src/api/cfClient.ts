import { useAuthStore } from '../store/useAuthStore'
import { useRateLimitStore } from '../store/useRateLimitStore'
import type {
  CloudflareApiMessage,
  CloudflareApiResponse,
} from '../types/cloudflare'

export class CloudflareApiError extends Error {
  public status: number
  public errors: CloudflareApiMessage[]
  public responseData?: unknown

  constructor(
    message: string,
    status: number,
    errors: CloudflareApiMessage[] = [],
    responseData?: unknown
  ) {
    super(message)
    this.name = 'CloudflareApiError'
    this.status = status
    this.errors = errors
    this.responseData = responseData
  }
}

function normalizeEndpoint(endpoint: string, proxyUrl?: string): string {
  const rawProxy = (proxyUrl || useAuthStore.getState().proxyUrl || '/api/cf').trim()
  const baseProxy = rawProxy.replace(/\/+$/, '') || '/api/cf'

  let path = endpoint.trim()
  if (path.startsWith('/api/cf')) {
    path = path.slice('/api/cf'.length)
  }
  if (!path.startsWith('/')) {
    path = `/${path}`
  }

  return `${baseProxy}${path}`
}

export async function cfFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<CloudflareApiResponse<T>> {
  const { email, token, authType } = useAuthStore.getState()

  if (!token) {
    throw new CloudflareApiError(
      'Missing Cloudflare authentication credentials. Please log in again.',
      401
    )
  }

  const url = normalizeEndpoint(endpoint)

  const headers = new Headers(options.headers || {})
  headers.set('Accept', 'application/json')

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  // Set authentication headers based on authType
  if (authType === 'bearer') {
    headers.set('Authorization', `Bearer ${token}`)
  } else {
    // global_key
    if (email) {
      headers.set('X-Auth-Email', email)
    }
    headers.set('X-Auth-Key', token)
  }

  let response: Response
  try {
    response = await fetch(url, {
      ...options,
      headers,
    })
  } catch (networkError) {
    throw new CloudflareApiError(
      networkError instanceof Error
        ? `Network error: ${networkError.message}`
        : 'Failed to connect to Cloudflare proxy server.',
      0
    )
  }

  // Update rate limit store from response headers on EVERY response
  useRateLimitStore.getState().updateFromHeaders(response.headers)

  let data: CloudflareApiResponse<T> | null = null
  const contentType = response.headers.get('content-type')

  if (contentType && contentType.includes('application/json')) {
    try {
      data = (await response.json()) as CloudflareApiResponse<T>
    } catch {
      // JSON parse error
      data = null
    }
  }

  // Handle HTTP error codes
  if (!response.ok) {
    const errorMessages =
      data?.errors && data.errors.length > 0
        ? data.errors.map((e) => e.message || `Error code: ${e.code}`).join('; ')
        : `Request failed (${response.status}: ${response.statusText})`

    throw new CloudflareApiError(
      errorMessages,
      response.status,
      data?.errors || [],
      data
    )
  }

  // Handle Cloudflare-level failures where HTTP status is 200 but success is false
  if (data && data.success === false) {
    const errorMessages =
      data.errors && data.errors.length > 0
        ? data.errors.map((e) => e.message || `CF error ${e.code}`).join('; ')
        : 'Cloudflare operation failed.'

    throw new CloudflareApiError(errorMessages, response.status, data.errors, data)
  }

  if (!data) {
    throw new CloudflareApiError(
      'Server returned an invalid or empty JSON response.',
      response.status
    )
  }

  return data
}

/**
 * Lightweight ping to refresh Cloudflare API rate limit headers.
 * Sends a minimal request to /api/cf/accounts?page=1&per_page=1.
 */
export async function pingRateLimit(): Promise<void> {
  const { token } = useAuthStore.getState()
  if (!token) return

  try {
    await cfFetch('accounts?page=1&per_page=1', {
      method: 'GET',
    })
  } catch {
    // Silently ignore ping errors as this is a background diagnostic check
  }
}

export interface VerifyCredentialsParams {
  email: string
  token: string
  authType: 'bearer' | 'global_key'
  accountLevelOnly: boolean
  proxyUrl?: string
}

/**
 * Validates Cloudflare API credentials and permissions before granting access to Dashboard.
 * - For accountLevelOnly: verifies access to /accounts and checks that >= 1 account is accessible.
 * - For allZones: verifies access to /zones with Zone:Read permissions.
 */
export async function verifyCredentials(params: VerifyCredentialsParams): Promise<void> {
  const { email, token, authType, accountLevelOnly, proxyUrl } = params

  if (!token || token.trim().length === 0) {
    throw new Error('API Token or Global Key is required.')
  }

  const endpoint = accountLevelOnly ? '/accounts?page=1&per_page=1' : '/zones?page=1&per_page=1'
  const url = normalizeEndpoint(endpoint, proxyUrl)

  const headers = new Headers()
  headers.set('Accept', 'application/json')

  if (authType === 'bearer') {
    headers.set('Authorization', `Bearer ${token.trim()}`)
  } else {
    if (email) {
      headers.set('X-Auth-Email', email.trim())
    }
    headers.set('X-Auth-Key', token.trim())
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers,
    })
  } catch (networkError) {
    throw new Error(
      networkError instanceof Error
        ? `Proxy connection failed: ${networkError.message}`
        : 'Failed to connect to Cloudflare proxy endpoint.'
    )
  }

  // Update rate limit store from verification response headers
  useRateLimitStore.getState().updateFromHeaders(response.headers)

  let data: CloudflareApiResponse<unknown[]> | null = null
  const contentType = response.headers.get('content-type')

  if (contentType && contentType.includes('application/json')) {
    try {
      data = (await response.json()) as CloudflareApiResponse<unknown[]>
    } catch {
      data = null
    }
  }

  if (!response.ok || !data?.success) {
    const errorMessages =
      data?.errors && data.errors.length > 0
        ? data.errors.map((e) => e.message || `Error ${e.code}`).join('; ')
        : `Authentication failed (HTTP ${response.status}: ${response.statusText})`
    throw new Error(errorMessages)
  }

  // In account-level mode, check that at least one Cloudflare account was returned
  if (accountLevelOnly) {
    const accounts = data.result
    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new Error(
        'Token is valid, but no Cloudflare Accounts were found. Ensure your token has "Account: Read" or "Account Settings: Read" permissions.'
      )
    }
  }
}


