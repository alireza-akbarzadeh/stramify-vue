/**
 * Cross-origin access is opt-in and allowlisted — never reflected blindly.
 *
 * This API carries a better-auth session cookie, which rules out the usual
 * `Access-Control-Allow-Origin: *`: the browser refuses to pair a wildcard with
 * `Allow-Credentials: true`, so a credentialed API has to name a single
 * concrete origin per response. The tempting shortcut — echo back whatever
 * `Origin` arrived — is what turns that into a vulnerability, because it hands
 * every site on the internet the ability to make authenticated requests as the
 * logged-in user and read the answers. So the origin is checked against a list
 * the operator wrote down, and that check lives here where it can be tested
 * without a socket.
 *
 * Unset or empty `CORS_ORIGINS` means no CORS headers at all, i.e. today's
 * behaviour: same-origin only. Opting in is a deliberate act.
 */

/**
 * Reduces a string to `scheme://host[:port]` — the exact shape a browser puts
 * in `Origin`. Default ports are dropped and the whole thing is lowercased, so
 * `https://Example.com:443/` and `https://example.com` compare equal instead of
 * failing over a trailing slash someone typed into an env var.
 *
 * Anything that isn't http(s) — `file://`, `null`, a bare hostname — returns
 * `null` and can never match.
 */
export function canonicalOrigin(value: string): string | null {
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  return url.origin.toLowerCase()
}

/** Split the comma-separated `CORS_ORIGINS` env var, dropping blanks. */
export function parseAllowedOrigins(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

/**
 * `*` matches any run of characters that isn't a `/`, which keeps a wildcard
 * confined to the host/port part — `https://*.vercel.app` can match a preview
 * subdomain but can't be tricked into matching a path on some other host.
 * Every other regex metacharacter is escaped, so a `.` in a pattern means a
 * literal dot rather than "any character" (without this, `https://*.vercel.app`
 * would also match `https://xvercelaapp`).
 */
function patternToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .toLowerCase()
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '[^/]*')
  return new RegExp(`^${escaped}$`)
}

/**
 * The value to put in `Access-Control-Allow-Origin`, or `null` to send no CORS
 * headers at all.
 *
 * Returns the *canonicalised request origin* rather than the pattern that
 * matched it, because a wildcard pattern is not a legal header value — the
 * response has to name one concrete origin.
 */
export function resolveAllowedOrigin(
  requestOrigin: string | undefined,
  patterns: string[]
): string | null {
  if (!requestOrigin || patterns.length === 0) return null

  const origin = canonicalOrigin(requestOrigin)
  if (!origin) return null

  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      if (patternToRegExp(pattern).test(origin)) return origin
      continue
    }
    // Exact entries go through the same canonicaliser as the request so the
    // two sides are compared in the same shape.
    if (canonicalOrigin(pattern) === origin) return origin
  }

  return null
}
