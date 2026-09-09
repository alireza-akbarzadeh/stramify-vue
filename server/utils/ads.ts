import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { ads } from '../db/schema'
import { meetsPlan } from '#shared/types/billing'
import type { PlanTier } from '#shared/types/billing'
import type { AdBreak } from '#shared/types/ads'

/**
 * Ad selection and the entitlement gate.
 *
 * The gate is here, on the server, and it works by *not producing a payload*
 * rather than by flagging one — an entitled viewer's response contains no ad
 * id, no creative URL and no advertiser. Deciding this in the client, or
 * sending the ad with a `hidden: true` alongside it, would put the paid benefit
 * behind a CSS class: anyone could read the ad out of the network tab, and more
 * to the point anyone could stop it being applied.
 *
 * Worth being precise about what this does and does not enforce. It guarantees
 * **entitled users are never served an ad**, which is the promise Creator and
 * Studio are actually sold on. It does not guarantee a free viewer *watches*
 * one — playback happens on their machine, so a determined user can always skip
 * ahead. Enforcing that needs server-verified impressions, which is a different
 * feature and is not pretended at here.
 */

/** The lowest paid tier. Anything at or above this sees no advertising. */
const AD_FREE_FROM: PlanTier = 'creator'

export function isAdFree(tier: PlanTier): boolean {
  return meetsPlan(tier, AD_FREE_FROM)
}

/**
 * Pick one creative from the live inventory, weighted.
 *
 * Pure and exported so the distribution is testable without a database: given
 * the same `roll` it always returns the same row, which is the only way to
 * assert that weight actually biases the outcome rather than merely being read.
 *
 * `roll` is a 0–1 fraction of the total weight. Rows with weight 0 are on the
 * books but never selected, which is how a campaign is paused without losing
 * its row.
 */
export function pickWeighted<T extends { weight: number }>(rows: T[], roll: number): T | null {
  const total = rows.reduce((sum, row) => sum + Math.max(0, row.weight), 0)
  if (total <= 0) return null

  let cursor = roll * total
  for (const row of rows) {
    cursor -= Math.max(0, row.weight)
    if (cursor < 0) return row
  }
  // Only reachable when `roll` is exactly 1; the last weighted row is correct.
  return rows.findLast((row) => row.weight > 0) ?? null
}

/**
 * The pre-roll for one viewer, or `null`.
 *
 * `null` covers three different situations on purpose — entitled, no inventory,
 * and advertising not set up on this deployment — because the client's
 * behaviour is identical in all three: play the video. Distinguishing them in
 * the response would only invite a caller to branch on something it should not.
 */
export async function selectPreRoll(tier: PlanTier): Promise<AdBreak | null> {
  if (isAdFree(tier)) return null

  const rows = await db
    .select({
      id: ads.id,
      advertiser: ads.advertiser,
      title: ads.title,
      videoUrl: ads.videoUrl,
      clickUrl: ads.clickUrl,
      durationSeconds: ads.durationSeconds,
      skipAfterSeconds: ads.skipAfterSeconds,
      weight: ads.weight
    })
    .from(ads)
    .where(eq(ads.active, true))

  const picked = pickWeighted(rows, Math.random())
  if (!picked) return null

  const { weight: _weight, ...ad } = picked
  return ad
}
