/**
 * Cloudflare Worker: Zero-Dependency CORS Proxy for Cloudflare API v4
 *
 * Designed for static deployments (such as GitHub Pages) where no backend Node.js
 * server is available to handle CORS and upstream request proxying.
 *
 * Deployment Options:
 * 1. Cloudflare Dashboard:
 *    - Go to Workers & Pages -> Create Application -> Create Worker.
 *    - Paste the contents of this file into the Quick Edit code editor and Deploy.
 *    - Copy your worker URL (e.g. https://cf-cors-proxy.<subdomain>.workers.dev).
 * 2. Wrangler CLI:
 *    - npx wrangler deploy workers/cf-cors-proxy.ts --name cf-cors-proxy --compatibility-date 2024-01-01
 *
 * Usage:
 * - Enter `https://<your-worker>.workers.dev/api/cf` in the "Advanced / Proxy Endpoint"
 *   field on the login screen, or set the repository variable `VITE_API_PROXY_URL`.
 */

export interface Env {
  // Optional environment variables or bindings can be defined here
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Authorization, X-Auth-Email, X-Auth-Key, Content-Type, Accept',
  'Access-Control-Max-Age': '86400',
}

const ALLOWED_FORWARD_HEADERS = [
  'authorization',
  'x-auth-email',
  'x-auth-key',
  'content-type',
  'accept',
] as const

export default {
  async fetch(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    // 1. Handle CORS Preflight (OPTIONS)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      })
    }

    // 2. Healthcheck & Diagnostic endpoint
    if (url.pathname === '/' || url.pathname === '/health' || url.pathname === '/api/health') {
      return new Response(
        JSON.stringify(
          {
            status: 'ok',
            service: 'cloudflare-rule-browser-cors-proxy',
            upstream: 'https://api.cloudflare.com/client/v4',
            timestamp: new Date().toISOString(),
          },
          null,
          2
        ),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            ...CORS_HEADERS,
          },
        }
      )
    }

    // 3. Extract and normalize target Cloudflare API path
    let targetPath = url.pathname
    if (targetPath.startsWith('/api/cf')) {
      targetPath = targetPath.slice('/api/cf'.length)
    }
    if (!targetPath.startsWith('/')) {
      targetPath = `/${targetPath}`
    }

    const upstreamUrl = `https://api.cloudflare.com/client/v4${targetPath}${url.search}`

    // 4. Filter headers to strict allowlist (prevent leak of internal or client headers)
    const forwardHeaders = new Headers()
    for (const name of ALLOWED_FORWARD_HEADERS) {
      const val = request.headers.get(name)
      if (val) {
        forwardHeaders.set(name, val)
      }
    }

    // 5. Forward request to Cloudflare API v4
    try {
      const hasBody = !['GET', 'HEAD'].includes(request.method.toUpperCase())
      const upstreamResponse = await fetch(upstreamUrl, {
        method: request.method,
        headers: forwardHeaders,
        body: hasBody ? request.body : undefined,
      })

      // 6. Construct response with CORS & exposed rate-limiting headers
      const responseHeaders = new Headers(CORS_HEADERS)

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

      responseHeaders.set(
        'Access-Control-Expose-Headers',
        'ratelimit, ratelimit-policy, content-type'
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
            ...CORS_HEADERS,
          },
        }
      )
    }
  },
}
