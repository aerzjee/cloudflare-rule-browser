/**
 * Cloudflare Worker: Zero-Dependency CORS Proxy with Strict Origin Protection
 *
 * Designed for static deployments (such as GitHub Pages) where no backend Node.js
 * server is available to handle CORS and upstream request proxying.
 *
 * Security Features:
 * - Strict Origin Protection: Blocks unauthorized origins, third-party domains, and open abuse.
 * - Granular CORS headers (Access-Control-Allow-Origin reflects verified origin, avoiding wildcard '*').
 * - Whitelists only required Cloudflare authentication headers.
 * - Propagates Cloudflare API rate-limiting headers (ratelimit, ratelimit-policy, retry-after).
 *
 * Configuration:
 * - Default allowed origins include:
 *   - https://aerzjee.github.io (Repository Owner GitHub Pages)
 *   - http://localhost:5173 (Vite development server)
 *   - http://localhost:3000 (Local Docker/Hono test container)
 * - For forks or custom domains: configure the `ALLOWED_ORIGINS` environment variable
 *   in Cloudflare Dashboard (Workers & Pages -> Service -> Settings -> Variables and Secrets)
 *   as a comma-separated list (e.g. "https://my-user.github.io,https://my-domain.com").
 *
 * Deployment Options:
 * 1. Cloudflare Dashboard:
 *    - Go to Workers & Pages -> Create Application -> Create Worker.
 *    - Paste the contents of this file into the Quick Edit code editor and Deploy.
 *    - Copy your worker URL (e.g. https://cf-cors-proxy.<subdomain>.workers.dev).
 * 2. Wrangler CLI:
 *    - npx wrangler deploy workers/cf-cors-proxy.ts --name cf-cors-proxy --compatibility-date 2024-01-01
 */

export interface Env {
  /** Optional comma-separated list of allowed origins (e.g. "https://user.github.io,http://localhost:5173") */
  ALLOWED_ORIGINS?: string
}

/** Default production and local origins */
export const DEFAULT_ALLOWED_ORIGINS: readonly string[] = [
  'https://aerzjee.github.io',
  'http://localhost:5173',
  'http://localhost:3000',
]

const ALLOWED_FORWARD_HEADERS = [
  'authorization',
  'x-auth-email',
  'x-auth-key',
  'content-type',
  'accept',
] as const

/** Parse and normalize allowed origins list */
function getAllowedOrigins(env?: Env): string[] {
  if (env?.ALLOWED_ORIGINS) {
    return env.ALLOWED_ORIGINS.split(',')
      .map((s) => s.trim().replace(/\/+$/, '').toLowerCase())
      .filter(Boolean)
  }
  return [...DEFAULT_ALLOWED_ORIGINS]
}

/** Validate whether a request Origin header is permitted */
function isOriginAllowed(rawOrigin: string | null, allowedOrigins: string[]): boolean {
  if (!rawOrigin) return false
  const normalized = rawOrigin.trim().replace(/\/+$/, '').toLowerCase()
  return allowedOrigins.includes(normalized)
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const allowedOrigins = getAllowedOrigins(env)
    const rawOrigin = request.headers.get('Origin')
    const originAllowed = isOriginAllowed(rawOrigin, allowedOrigins)

    // Base security headers present on all responses
    const securityHeaders: Record<string, string> = {
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    }

    // 1. Handle CORS Preflight (OPTIONS)
    if (request.method === 'OPTIONS') {
      if (!originAllowed) {
        return new Response(
          JSON.stringify({
            success: false,
            errors: [
              {
                code: 403,
                message: 'Origin not allowed by CORS proxy',
              },
            ],
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              ...securityHeaders,
            },
          }
        )
      }

      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': rawOrigin!,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers':
            'Authorization, X-Auth-Email, X-Auth-Key, Content-Type, Accept',
          'Access-Control-Max-Age': '86400',
          Vary: 'Origin',
          ...securityHeaders,
        },
      })
    }

    // 2. Healthcheck & Diagnostic endpoint
    if (url.pathname === '/' || url.pathname === '/health' || url.pathname === '/api/health') {
      const responseHeaders: Record<string, string> = {
        'Content-Type': 'application/json; charset=utf-8',
        ...securityHeaders,
      }
      if (rawOrigin && originAllowed) {
        responseHeaders['Access-Control-Allow-Origin'] = rawOrigin
        responseHeaders['Vary'] = 'Origin'
      }

      return new Response(
        JSON.stringify(
          {
            status: 'ok',
            service: 'cloudflare-rule-browser-cors-proxy',
            upstream: 'https://api.cloudflare.com/client/v4',
            allowedOriginsConfigured: allowedOrigins.length,
            originVerified: originAllowed,
            timestamp: new Date().toISOString(),
          },
          null,
          2
        ),
        {
          status: 200,
          headers: responseHeaders,
        }
      )
    }

    // 3. Enforce Origin Protection on all API requests
    if (!originAllowed) {
      return new Response(
        JSON.stringify({
          success: false,
          errors: [
            {
              code: 403,
              message: 'Origin not allowed by CORS proxy',
            },
          ],
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            ...securityHeaders,
          },
        }
      )
    }

    // 4. Extract and normalize target Cloudflare API path
    let targetPath = url.pathname
    if (targetPath.startsWith('/api/cf')) {
      targetPath = targetPath.slice('/api/cf'.length)
    }
    if (!targetPath.startsWith('/')) {
      targetPath = `/${targetPath}`
    }

    const upstreamUrl = `https://api.cloudflare.com/client/v4${targetPath}${url.search}`

    // 5. Filter headers to strict allowlist (prevent leak of internal or client headers)
    const forwardHeaders = new Headers()
    for (const name of ALLOWED_FORWARD_HEADERS) {
      const val = request.headers.get(name)
      if (val) {
        forwardHeaders.set(name, val)
      }
    }

    // 6. Forward request to Cloudflare API v4
    try {
      const hasBody = !['GET', 'HEAD'].includes(request.method.toUpperCase())
      const upstreamResponse = await fetch(upstreamUrl, {
        method: request.method,
        headers: forwardHeaders,
        body: hasBody ? request.body : undefined,
      })

      // 7. Construct response with CORS, rate-limiting & security headers
      const responseHeaders = new Headers(securityHeaders)

      // Explicit origin reflection (avoid wildcard '*')
      responseHeaders.set('Access-Control-Allow-Origin', rawOrigin!)
      responseHeaders.set('Vary', 'Origin')

      const contentType = upstreamResponse.headers.get('content-type')
      if (contentType) {
        responseHeaders.set('content-type', contentType)
      }

      // Propagate rate-limiting headers from Cloudflare
      const ratelimit = upstreamResponse.headers.get('ratelimit')
      if (ratelimit) {
        responseHeaders.set('ratelimit', ratelimit)
      }

      const ratelimitPolicy = upstreamResponse.headers.get('ratelimit-policy')
      if (ratelimitPolicy) {
        responseHeaders.set('ratelimit-policy', ratelimitPolicy)
      }

      const retryAfter = upstreamResponse.headers.get('retry-after')
      if (retryAfter) {
        responseHeaders.set('retry-after', retryAfter)
      }

      responseHeaders.set(
        'Access-Control-Expose-Headers',
        'ratelimit, ratelimit-policy, retry-after, content-type'
      )

      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
      })
    } catch (err) {
      return new Response(
        JSON.stringify({
          success: false,
          errors: [
            {
              code: 10001,
              message:
                err instanceof Error
                  ? `Proxy upstream error: ${err.message}`
                  : 'Failed to contact Cloudflare API v4 upstream.',
            },
          ],
        }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': rawOrigin!,
            Vary: 'Origin',
            ...securityHeaders,
          },
        }
      )
    }
  },
}
