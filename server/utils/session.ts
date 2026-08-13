import type { H3Event } from 'h3'
import { auth } from './auth'
import { selectBillingState } from './subscriptions'
import { meetsPlan } from '#shared/types/billing'
import type { BillingState, PlanTier } from '#shared/types/billing'

export interface SessionUser {
  id: string
  name: string
  email: string
  image?: string | null
}

/** The signed-in user, or `null`. Never throws — use for optional personalization. */
export async function getSessionUser(event: H3Event): Promise<SessionUser | null> {
  const session = await auth.api
    .getSession({ headers: event.headers })
    .catch(() => null)
  return (session?.user as SessionUser | undefined) ?? null
}

/**
 * The signed-in user, or a 401. Every write endpoint goes through this — the
 * authorization check lives server-side, not in whether the UI rendered a
 * button (CLAUDE.md §5).
 */
export async function requireUser(event: H3Event): Promise<SessionUser> {
  const user = await getSessionUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'You need to be signed in' })
  }
  return user
}

/**
 * The signed-in user's billing state, or a 402 if their plan is below `required`
 * (ADR-026). The paid-feature counterpart to `requireUser`, and it lives beside
 * it because both answer the same question — may this request proceed.
 *
 * 402 Payment Required rather than 403: the caller is authenticated and the
 * request is well-formed, what's missing is a plan, and the client can tell
 * "sign in" from "upgrade" without parsing a message. Sign-in is still resolved
 * first, so a signed-out request gets its 401.
 *
 * This is the check that matters for paid features — a hidden upgrade button is
 * a courtesy, not a control (CLAUDE.md §5).
 */
export async function requirePlan(event: H3Event, required: PlanTier): Promise<BillingState> {
  const user = await requireUser(event)
  const state = await selectBillingState(user.id)

  if (!meetsPlan(state.tier, required)) {
    throw createError({
      statusCode: 402,
      statusMessage: `This feature needs the ${required} plan`
    })
  }

  return state
}
