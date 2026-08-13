# CORS (cross-origin API access)

Lets a browser on another origin — a local dev server, a Vercel preview —
call this deployment's API **with the session cookie attached**. Off by
default: with nothing configured, the API is same-origin only, exactly as it
was before this existed.

## What it is

One env var, `CORS_ORIGINS`, feeding two places:

| File | Role |
| --- | --- |
| [`server/middleware/cors.ts`](../server/middleware/cors.ts) | Sets the response headers, answers preflights |
| [`server/utils/cors.ts`](../server/utils/cors.ts) | The origin-matching logic, unit-tested in `cors.spec.ts` |
| [`server/utils/auth.ts`](../server/utils/auth.ts) | better-auth `trustedOrigins` + cross-site cookie attributes |

```bash
# Comma-separated. Unset or empty = no CORS headers at all.
CORS_ORIGINS="http://localhost:3000,https://*.vercel.app"
```

Set it in the Vercel project's environment variables for the hosted app, and
in `.env` for local runs. It is read once at module scope — **changing it
requires a redeploy**, not just a new request.

## Why it's an allowlist and not `*`

This API carries a better-auth session cookie, and that forecloses the easy
options:

- `Access-Control-Allow-Origin: *` — the browser refuses to pair a wildcard
  with `Access-Control-Allow-Credentials: true`. A credentialed response must
  name one concrete origin.
- Echoing back whatever `Origin` arrived — works, and is a vulnerability. It
  lets any website on the internet make authenticated requests as whoever is
  logged in and read the responses.

So the origin is compared against a list a human wrote down. `resolveAllowedOrigin`
returns the *canonicalised request origin* rather than the pattern that
matched, because `https://*.vercel.app` is not a legal header value.

## How it works

- **Scope**: `/api/**` only. SSR page responses get nothing.
- **`Vary: Origin`** is appended to every `/api/**` response — allowed,
  rejected, and no-`Origin` alike. Without it a shared cache (Vercel's, the
  browser's) can serve one origin's response, carrying an `Allow-Origin`
  naming *that* origin, to a request from somewhere else. The resulting
  failures only reproduce on a warm cache.
- **Rejection is silent.** An unlisted origin gets a normal response with no
  CORS headers and the browser blocks it. A 403 would be no more secure and
  harder to debug — the browser reports both as a generic network error.
- **Preflight** (`OPTIONS` + `Access-Control-Request-Method`) returns 204 and
  never reaches the route handler, so a rejected preflight can't run the
  mutation it was asking about. `Access-Control-Request-Headers` is echoed
  back; the origin check is the access decision, not the header list.
- **`Access-Control-Expose-Headers`** names `Content-Range`, `Accept-Ranges`,
  `Retry-After` and `Content-Length`. The first two are what make seeking work
  against [`/api/media/**`](../server/api/media/) for a player that fetches
  the media itself instead of handing the URL to a `<video>` element;
  `Retry-After` is how a caller learns how long a 429 lasts.

## Cookies

A cookie set by this deployment is only sent on a cross-origin request if it
says `SameSite=None`, and browsers only accept `None` alongside `Secure`. So
when `CORS_ORIGINS` is non-empty, `auth.ts` sets
`advanced.defaultCookieAttributes = { sameSite: 'none', secure: true }`.

When it's empty, that block is omitted entirely and better-auth's default
`SameSite=Lax` stands — the safer setting, and the right one for a
same-origin production deployment. Verified against better-auth 1.6.26:

```
CORS_ORIGINS unset -> {"secure":true,"sameSite":"lax", ...}
CORS_ORIGINS set   -> {"secure":true,"sameSite":"none",...}
```

`trustedOrigins` gets the same list, because better-auth runs its own origin
check — allowing an origin through CORS while better-auth still refuses it
produces a request that passes preflight and then fails with a bare 403.

> **This widens OAuth redirect targets.** An entry in `trustedOrigins` becomes
> a legal `callbackURL`, i.e. it can send a user back to itself after login.
> That is precisely what "develop locally against the hosted API" needs, and
> precisely why the list must stay short and hand-written.

## Failure modes

| Symptom | Cause |
| --- | --- |
| `No 'Access-Control-Allow-Origin' header` | Origin not in `CORS_ORIGINS`, or the var isn't set on the deployment. Check the scheme and port — `http://localhost:3000` and `https://localhost:3000` are different origins. |
| Preflight passes, request 403s | `trustedOrigins` didn't get the origin. Both come from `CORS_ORIGINS`, so this means a stale deploy. |
| Requests work, but the user is logged out | Cookie is still `SameSite=Lax`, or the client didn't send `credentials: 'include'`. |
| Works locally, fails in production | `http://localhost` cookies over plain HTTP: browsers grant localhost a secure-context exemption, other hosts get none. Cross-origin credentialed requests need HTTPS on the API side. |

The client must opt in as well — `fetch(url, { credentials: 'include' })`.
Without it the browser sends no cookie no matter what the server allows.
