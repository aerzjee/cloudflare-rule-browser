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

function normalizeEndpoint(endpoint: string): string {
  if (endpoint.startsWith('/api/cf')) {
    return endpoint
  }
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `/api/cf${clean}`
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

