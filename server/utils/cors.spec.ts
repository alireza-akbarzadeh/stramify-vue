import { describe, expect, it } from 'vitest'
import { canonicalOrigin, parseAllowedOrigins, resolveAllowedOrigin } from './cors'

/**
 * These tests are mostly about what must *not* match. An origin check that is
 * merely "usually right" is the whole vulnerability, so the interesting cases
 * are the near-misses: a lookalike host, a wildcard that reaches too far, a
 * scheme that isn't http(s).
 */
describe('canonicalOrigin', () => {
  it('strips paths, trailing slashes and default ports', () => {
    expect(canonicalOrigin('https://example.com/')).toBe('https://example.com')
    expect(canonicalOrigin('https://example.com:443')).toBe('https://example.com')
    expect(canonicalOrigin('http://example.com:80/some/path')).toBe('http://example.com')
  })

  it('keeps a non-default port, which is what distinguishes dev servers', () => {
    expect(canonicalOrigin('http://localhost:3000')).toBe('http://localhost:3000')
    expect(canonicalOrigin('http://localhost:5173')).toBe('http://localhost:5173')
  })

  it('lowercases and tolerates surrounding whitespace from an env var', () => {
    expect(canonicalOrigin('  HTTPS://Example.COM  ')).toBe('https://example.com')
  })

  it('rejects anything that is not http(s)', () => {
    expect(canonicalOrigin('file:///etc/passwd')).toBeNull()
    expect(canonicalOrigin('null')).toBeNull()
    expect(canonicalOrigin('example.com')).toBeNull()
    expect(canonicalOrigin('')).toBeNull()
  })
})

describe('parseAllowedOrigins', () => {
  it('is empty when unset — the closed default', () => {
    expect(parseAllowedOrigins(undefined)).toEqual([])
    expect(parseAllowedOrigins('')).toEqual([])
  })

  it('splits on commas and drops blanks left by a trailing separator', () => {
    expect(parseAllowedOrigins('http://localhost:3000, https://a.com,')).toEqual([
      'http://localhost:3000',
      'https://a.com'
    ])
  })
})

describe('resolveAllowedOrigin', () => {
  const allowed = ['http://localhost:3000', 'https://stramify.vercel.app']

  it('echoes back an allowlisted origin', () => {
    expect(resolveAllowedOrigin('http://localhost:3000', allowed)).toBe('http://localhost:3000')
  })

  it('matches regardless of trailing slash or case on either side', () => {
    expect(resolveAllowedOrigin('HTTP://localhost:3000', ['http://localhost:3000/'])).toBe(
      'http://localhost:3000'
    )
  })

  it('refuses everything when the allowlist is empty', () => {
    expect(resolveAllowedOrigin('http://localhost:3000', [])).toBeNull()
  })

  it('refuses a request with no Origin header', () => {
    expect(resolveAllowedOrigin(undefined, allowed)).toBeNull()
  })

  it('treats a different port and a different scheme as different origins', () => {
    expect(resolveAllowedOrigin('http://localhost:3001', allowed)).toBeNull()
    expect(resolveAllowedOrigin('https://localhost:3000', allowed)).toBeNull()
  })

  it('does not match a lookalike host', () => {
    expect(resolveAllowedOrigin('https://stramify.vercel.app.evil.com', allowed)).toBeNull()
    expect(resolveAllowedOrigin('https://evil-stramify.vercel.app', allowed)).toBeNull()
  })

  describe('wildcards', () => {
    const previews = ['https://*.vercel.app']

    it('matches a subdomain', () => {
      expect(resolveAllowedOrigin('https://stramify-abc123.vercel.app', previews)).toBe(
        'https://stramify-abc123.vercel.app'
      )
    })

    it('returns the concrete origin, never the pattern', () => {
      // `Access-Control-Allow-Origin: https://*.vercel.app` is not a legal
      // header value — the browser would reject the response.
      expect(resolveAllowedOrigin('https://x.vercel.app', previews)).not.toContain('*')
    })

    it('does not let the wildcard escape the host', () => {
      expect(resolveAllowedOrigin('https://evil.com/x.vercel.app', previews)).toBeNull()
      expect(resolveAllowedOrigin('https://x.vercel.app.evil.com', previews)).toBeNull()
    })

    it('treats dots in the pattern as literal, not as "any character"', () => {
      expect(resolveAllowedOrigin('https://xxvercelxapp', previews)).toBeNull()
    })

    it('does not match the bare apex, only subdomains', () => {
      expect(resolveAllowedOrigin('https://vercel.app', previews)).toBeNull()
    })

    it('still honours the scheme', () => {
      expect(resolveAllowedOrigin('http://x.vercel.app', previews)).toBeNull()
    })
  })
})
