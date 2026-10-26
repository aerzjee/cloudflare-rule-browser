import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

const app = new Hono()

// 1. Content Security Policy & Security Headers
app.use(
  '*',
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  })
)

// 2. Healthcheck endpoint for Docker & orchestrators
app.get('/api/health', (c) => c.json({ status: 'ok' }, 200))

// 3. Reverse Proxy for Cloudflare API v4
const proxyHandler = async (c: import('hono').Context) => {
  const reqUrl = new URL(c.req.url)
  let targetPath = reqUrl.pathname.replace(/^\/api\/cf/, '')
  if (!targetPath.startsWith('/')) {
    targetPath = `/${targetPath}`
  }
  const searchParams = reqUrl.search
  const targetUrl = `https://api.cloudflare.com/client/v4${targetPath}${searchParams}`

  const method = c.req.method.toUpperCase()

  // Strict Allowlist of headers — never forward arbitrary or internal headers
  const forwardHeaders = new Headers()
  const allowedHeaders = ['authorization', 'x-auth-email', 'x-auth-key', 'content-type']

  for (const headerName of allowedHeaders) {
    const value = c.req.header(headerName)
    if (value) {
      forwardHeaders.set(headerName, value)
    }
  }

  // Forward body for mutating methods
  let body: string | undefined = undefined
  if (method !== 'GET' && method !== 'HEAD') {
    body = await c.req.raw.text()
  }

  try {
    const cfResponse = await fetch(targetUrl, {
      method,
      headers: forwardHeaders,
      body,
      signal: AbortSignal.timeout(15000),
    })

    const responseText = await cfResponse.text()
    const contentType = cfResponse.headers.get('content-type')
    const ratelimit = cfResponse.headers.get('ratelimit')
    const ratelimitPolicy = cfResponse.headers.get('ratelimit-policy')

    const responseHeaders = new Headers()
    if (contentType) {
      responseHeaders.set('content-type', contentType)
    }
    if (ratelimit) {
      responseHeaders.set('ratelimit', ratelimit)
    }
    if (ratelimitPolicy) {
      responseHeaders.set('ratelimit-policy', ratelimitPolicy)
    }
    responseHeaders.set('Access-Control-Expose-Headers', 'ratelimit, ratelimit-policy')

    return new Response(responseText, {
      status: cfResponse.status,
      headers: responseHeaders,
    })
  } catch (error) {
    // Log safe error without logging any authorization tokens or secrets
    console.error(
      `[Reverse Proxy Error] ${method} ${targetPath}:`,
      error instanceof Error ? error.message : 'Unknown network error'
    )

    return c.json(
      {
        success: false,
        errors: [
          {
            code: 502,
            message: 'Upstream Cloudflare API error',
          },
        ],
      },
      502
    )
  }
}

app.all('/api/cf/*', proxyHandler)
app.all('/api/cf', proxyHandler)

// 4. Serve static production assets from ./dist
app.use('/*', serveStatic({ root: './dist' }))

// 5. SPA fallback to index.html for client-side routing
app.get('*', serveStatic({ path: './dist/index.html' }))

// 6. Listen on PORT and handle graceful shutdown
const port = Number(process.env.PORT) || 3000

const server = serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Cloudflare Rule Browser server running on http://localhost:${info.port}`)
  }
)

const shutdown = (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`)
  server.close(() => {
    console.log('HTTP server closed.')
    process.exit(0)
  })

  // Force close if lingering requests take too long
  setTimeout(() => {
    console.error('Force closing server after timeout')
    process.exit(1)
  }, 10000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

export default app
