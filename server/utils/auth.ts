import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { twoFactor } from 'better-auth/plugins'
import { dash } from '@better-auth/infra'
import { db } from '../db/client'
import * as schema from '../db/schema'
import { sendMail } from './mailer'
import { billingPlugins } from './billing-plugin'
import { parseAllowedOrigins } from './cors'

const appUrl = process.env.PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * The same allowlist `server/middleware/cors.ts` uses. better-auth keeps its
 * own origin check — it rejects requests and redirect targets from anywhere it
 * doesn't trust — so letting an origin through CORS while better-auth still
 * refuses it produces a request that passes preflight and then fails with a
 * bare 403. One env var feeds both, which is the only way they stay in sync.
 */
const crossOrigins = parseAllowedOrigins(process.env.CORS_ORIGINS)

/** Providers offered in the UI, in display order. */
export const SOCIAL_PROVIDERS = ['google', 'apple', 'facebook', 'github'] as const
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number]

const ENV_KEYS: Record<SocialProvider, [string, string]> = {
  google: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  apple: ['APPLE_CLIENT_ID', 'APPLE_CLIENT_SECRET'],
  facebook: ['FACEBOOK_CLIENT_ID', 'FACEBOOK_CLIENT_SECRET'],
  github: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET']
}

/**
 * Only register a provider once its credentials exist — better-auth throws at
 * boot on a provider configured with empty strings. `configuredProviders` is
 * surfaced to the UI so unconfigured buttons can say so instead of failing
 * with a cryptic OAuth error.
 */
function socialProviders() {
  const providers: Record<string, { clientId: string; clientSecret: string }> = {}
  for (const provider of SOCIAL_PROVIDERS) {
    const [idKey, secretKey] = ENV_KEYS[provider]
    const clientId = process.env[idKey]
    const clientSecret = process.env[secretKey]
    if (clientId && clientSecret) providers[provider] = { clientId, clientSecret }
  }
  return providers
}

/**
 * Database-backed sessions (ADR-007) — a ban/role change takes effect on
 * the next request, not after a signed cookie expires.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: appUrl,
  // `baseURL` is trusted implicitly; these are the extra origins allowed to
  // sign in against this deployment. Note this also widens the set of legal
  // OAuth `callbackURL` targets — an entry here can send a user back to itself
  // after login, which is exactly what dev-against-prod needs and exactly why
  // the list must stay short and hand-written.
  trustedOrigins: crossOrigins,
  advanced: {
    // Cross-site cookies are opt-in for the same reason CORS is: `SameSite=Lax`
    // is the safer default and is what a same-origin production deployment
    // should keep. A cookie set by this deployment is only sent on a request
    // from another origin if it says `None`, and a browser only accepts `None`
    // together with `Secure` — so when the allowlist is empty, none of this
    // applies and the defaults stand.
    ...(crossOrigins.length > 0
      ? { defaultCookieAttributes: { sameSite: 'none' as const, secure: true } }
      : {})
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: 'Reset your Streamify password',
        text: `Reset your password: ${url}\n\nIf you didn't request this, you can ignore this email.`
      })
    }
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: 'Confirm your Streamify email',
        text: `Confirm your email address: ${url}`
      })
    }
  },
  socialProviders: socialProviders(),
  // `billingPlugins()` is empty when Polar isn't configured, for the same
  // reason `socialProviders()` skips a provider with no credentials — a clone
  // without billing credentials still boots (ADR-026).
  plugins: [twoFactor({ issuer: 'Streamify' }), dash(), ...billingPlugins()]
})

/** Which social providers have credentials — the UI marks the rest unavailable. */
export const configuredProviders = Object.keys(socialProviders())
