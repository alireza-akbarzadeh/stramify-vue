import { and, eq, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { feedFeedback } from '../db/schema'
import { toChannelHandle } from '#shared/utils/channel'
import type { HomeFeedback } from '#shared/types/home'

/**
 * Negative feed feedback: recording it, undoing it, and the predicate that
 * makes it mean something.
 *
 * All three live together because they have to agree on one thing — the exact
 * text stored in `feed_feedback.target`. A channel is stored as its lowercase
 * handle and a video as its raw id, so the write, the delete and the SQL match
 * below are written against the same rule instead of three near-copies of it.
 */

/** The canonical stored form of a target: raw id for a video, handle for a channel. */
export function toFeedbackTarget(feedback: HomeFeedback): HomeFeedback {
  const target = feedback.target.trim()
  return {
    kind: feedback.kind,
    target: feedback.kind === 'channel' ? toChannelHandle(target) : target
  }
}

/**
 * Hide something from this viewer's feed. Idempotent — pressing the same menu
 * item twice (two tabs, a double click) leaves one row, not two, which is what
 * the unique constraint is there for.
 *
 * Returns the canonical row so the caller can hand the client back exactly what
 * was stored; its undo then targets the same row regardless of what casing the
 * card happened to render.
 */
export async function addFeedFeedback(
  userId: string,
  feedback: HomeFeedback
): Promise<HomeFeedback> {
  const stored = toFeedbackTarget(feedback)
  await db
    .insert(feedFeedback)
    .values({ id: `feedback-${crypto.randomUUID()}`, userId, ...stored })
    .onConflictDoNothing({
      target: [feedFeedback.userId, feedFeedback.kind, feedFeedback.target]
    })
  return stored
}

/** Undo. Deleting a row that isn't there is a no-op, so this is safe to repeat. */
export async function removeFeedFeedback(
  userId: string,
  feedback: HomeFeedback
): Promise<HomeFeedback> {
  const stored = toFeedbackTarget(feedback)
  await db
    .delete(feedFeedback)
    .where(
      and(
        eq(feedFeedback.userId, userId),
        eq(feedFeedback.kind, stored.kind),
        eq(feedFeedback.target, stored.target)
      )
    )
  return stored
}

/**
 * "This row survived the viewer's feedback" — for a candidate relation aliased
 * `cand` with `id` and `channel` columns (see `CANDIDATES` in `home.ts`).
 *
 * A correlated `not exists` rather than an anti-join, so the exclusion composes
 * into an existing `where` without changing the row count of any join above it.
 * Signed out there is nothing to suppress, and the whole clause folds to `true`
 * so the feed still plans as it did before this table existed.
 */
export function notSuppressed(userId: string | null) {
  if (!userId) return sql`true`
  return sql`
    not exists (
      select 1
      from feed_feedback fb
      where fb.user_id = ${userId}
        and ((fb.kind = 'video' and fb.target = cand.id)
          or (fb.kind = 'channel' and fb.target = lower(cand.channel)))
    )
  `
}
