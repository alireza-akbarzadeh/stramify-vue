import { parseAllowedOrigins, resolveAllowedOrigin } from '../utils/cors'

/**
 * CORS for `/api/**`, driven by the `CORS_ORIGINS` env var.
 *
 * Read once at module scope rather than per request: this is deployment
 * configuration, it cannot change while the server is up, and a `.split()` on
 * every request to every endpoint is waste.
 */
const allowedOrigins = parseAllowedOrigins(process.env.CORS_ORIGINS)

/**
 * Not safelisted by the CORS spec, so cross-origin JS gets `null` for these
 * unless they're named here. `Content-Range` and `Accept-Ranges` are what makes
 * seeking work for a player that fetches media itself instead of handing the
 * URL to a `<video>` element; `Retry-After` is what `server/utils/rate-limit.ts`
 * sets on a 429 and the only way a caller learns how long to wait.
 */
const EXPOSED_HEADERS = 'Content-Length, Content-Range, Accept-Ranges, Retry-After'

const ALLOWED_METHODS = 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS'

/** Fallback for a preflight that somehow omits `Access-Control-Request-Headers`. */
const DEFAULT_ALLOWED_HEADERS = 'Content-Type, Authorization, Range'

export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api/')) return

  // Appended even when the origin is rejected, and even when there is no
  // `Origin` at all. A shared cache in front of this (Vercel's, a browser's)
  // must not be able to hand an allowed origin's response — which carries
  // `Allow-Origin` naming *that* origin — to a request from somewhere else.
  // Getting this wrong produces failures that only reproduce on a warm cache.
  appendResponseHeader(event, 'Vary', 'Origin')

  const origin = getRequestHeader(event, 'origin')
  // No `Origin` header means same-origin navigation or a non-browser client
  // (curl, the SSR fetch). Neither needs — or is protected by — CORS.
  if (!origin) return

  const allowOrigin = resolveAllowedOrigin(origin, allowedOrigins)

  // Deliberately silent: an unlisted origin gets a normal response with no CORS
  // headers, which the browser then blocks. Answering a preflight with a 403
  // would be no more secure and harder to debug, since the browser reports it
  // as a generic network failure either way.
  if (!allowOrigin) return

  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': allowOrigin,
    // Safe only because `allowOrigin` came from the allowlist above — this
    // header is what lets the session cookie ride along.
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Expose-Headers': EXPOSED_HEADERS
  })

  const isPreflight
    = event.method === 'OPTIONS' && !!getRequestHeader(event, 'access-control-request-method')
  if (!isPreflight) return

  setResponseHeaders(event, {
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    // Echoing the requested headers is standard and adds no exposure: the
    // origin allowlist is the access decision, not this list.
    'Access-Control-Allow-Headers':
      getRequestHeader(event, 'access-control-request-headers') || DEFAULT_ALLOWED_HEADERS,
    // 24h — the spec's ceiling in Chrome. Without it every cross-origin POST
    // pays for two round trips.
    'Access-Control-Max-Age': '86400'
  })

  // Ends the request here: a preflight must never reach the route handler,
  // which would run the real mutation without the browser having approved it.
  return sendNoContent(event, 204)
})
