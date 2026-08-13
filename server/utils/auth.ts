import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { twoFactor } from 'better-auth/plugins'
import { dash } from '@better-auth/infra'
import { db } from '../db/client'
import * as schema from '../db/schema'
import { sendMail } from './mailer'
import { billingPlugins } from './billing-plugin'

const appUrl = process.env.PUBLIC_APP_URL || 'http://localhost:3000'

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
