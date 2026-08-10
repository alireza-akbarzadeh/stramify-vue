import { and, count, desc, eq, gte, inArray, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { chatMessages, clips, comments, follows, liveStreams, reactions } from '../db/schema'
import { formatAge } from './format'
import type { ClipRow } from './discovery'
import type { SessionUser } from './session'
import type {
  AnalyticsRange,
  CategoryShare,
  ClipPerformance,
  CreatorOverview,
  DashboardAnalytics,
  DashboardMetric,
  DashboardOverview,
  PlatformPulse,
  ViewerActivity
} from '#shared/types/dashboard'
import type { ClipCategory } from '#shared/types/discovery'
import {
  addSeries,
  fillDailySeries,
  rangeToDays,
  toPercentShares,
  toSeries
} from '#shared/utils/trend'

/**
 * Dashboard aggregations.
 *
 * Channel ownership is the handle, not a foreign key: there is no `channels`
 * table and no `clips.user_id` (ADR-014), so a user's channel is
 * `user.name` matched case-insensitively against `clips.creator` /
 * `live_streams.streamer_name` — exactly how `readChannelSummary` and
 * `/api/discovery/live/[streamer]` already resolve identity. When nothing
 * matches, the endpoint says so (`exists: false`) rather than returning a
 * row of zeroes that looks like a channel with no traffic.
 */

/** The handle a signed-in user publishes under. Empty string when unnamed. */
export function channelHandle(user: SessionUser): string {
  return user.name?.trim() ?? ''
}

function metric(key: string, label: string, raw: number, hint: string): DashboardMetric {
  return { key, label, value: formatCount(raw), raw, hint }
}

/** Ids of every clip published under `handle`. Empty when the handle owns none. */
async function selectChannelClipIds(handle: string): Promise<string[]> {
  if (!handle) return []
  const rows = await db
    .select({ id: clips.id })
    .from(clips)
    .where(sql`lower(${clips.creator}) = lower(${handle})`)
  return rows.map((row) => row.id)
}

async function countLikesOnClips(clipIds: string[]): Promise<number> {
  if (clipIds.length === 0) return 0
  const [row] = await db
    .select({ total: count(reactions.id) })
    .from(reactions)
    .where(
      and(
        inArray(reactions.targetId, clipIds),
        eq(reactions.targetKind, 'clip'),
        eq(reactions.value, 'like')
      )
    )
  return row?.total ?? 0
}

async function countCommentsOnClips(clipIds: string[]): Promise<number> {
  if (clipIds.length === 0) return 0
  const [row] = await db
    .select({ total: count(comments.id) })
    .from(comments)
    .where(inArray(comments.clipId, clipIds))
  return row?.total ?? 0
}

/** The channel's current live session, if it has one running right now. */
async function selectLiveSession(handle: string) {
  if (!handle) return null
  const [row] = await db
    .select({ streamerName: liveStreams.streamerName })
    .from(liveStreams)
    .where(sql`lower(${liveStreams.streamerName}) = lower(${handle})`)
    .limit(1)
  return row ?? null
}

export async function readCreatorOverview(handle: string): Promise<CreatorOverview> {
  // Empty fallbacks are typed explicitly rather than left as `never[]`, so the
  // ternaries below don't hand TypeScript a union it has to narrow at each use.
  const noClips: Array<{ id: string; views: number }> = []
  const noCounts: Array<{ total: number }> = []

  const [clipRows, followerRows, live] = await Promise.all([
    handle
      ? db
          .select({ id: clips.id, views: clips.views })
          .from(clips)
          .where(sql`lower(${clips.creator}) = lower(${handle})`)
      : Promise.resolve(noClips),
    handle
      ? db
          .select({ total: count(follows.id) })
          .from(follows)
          .where(sql`lower(${follows.channel}) = lower(${handle})`)
      : Promise.resolve(noCounts),
    selectLiveSession(handle)
  ])

  const clipIds = clipRows.map((row) => row.id)
  const [likes, commentCount] = await Promise.all([
    countLikesOnClips(clipIds),
    countCommentsOnClips(clipIds)
  ])

  const totalViews = clipRows.reduce((sum, row) => sum + row.views, 0)
  const followers = followerRows[0]?.total ?? 0

  return {
    handle,
    // A handle with no clips and no live session isn't a channel yet. Followers
    // alone can't make one — you can't follow a channel that has never existed.
    exists: clipIds.length > 0 || live !== null,
    isLive: live !== null,
    liveSlug: live?.streamerName ?? null,
    metrics: [
      metric('followers', 'Followers', followers, 'Rows in `follows` pointing at your handle.'),
      metric('clips', 'Clips published', clipIds.length, 'Clips whose creator is your handle.'),
      metric('views', 'Total views', totalViews, 'Sum of `views` across your clips.'),
      metric('likes', 'Likes received', likes, 'Like reactions on your clips.'),
      metric('comments', 'Comments received', commentCount, 'Comments left on your clips.')
    ]
  }
}

export async function readViewerActivity(userId: string): Promise<ViewerActivity> {
  const [following, reactionsGiven, commentsPosted, chatSent] = await Promise.all([
    db.select({ total: count(follows.id) }).from(follows).where(eq(follows.userId, userId)),
    db.select({ total: count(reactions.id) }).from(reactions).where(eq(reactions.userId, userId)),
    db.select({ total: count(comments.id) }).from(comments).where(eq(comments.userId, userId)),
    db
      .select({ total: count(chatMessages.id) })
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
  ])

  return {
    metrics: [
      metric('following', 'Following', following[0]?.total ?? 0, 'Channels you follow.'),
      metric('reactions', 'Reactions given', reactionsGiven[0]?.total ?? 0, 'Your likes and dislikes.'),
      metric('comments', 'Comments posted', commentsPosted[0]?.total ?? 0, 'Comments you wrote.'),
      metric('chat', 'Chat messages', chatSent[0]?.total ?? 0, 'Live-chat lines you sent.')
    ]
  }
}

export async function readPlatformPulse(): Promise<PlatformPulse> {
  const [liveRows, clipRows, categoryRows] = await Promise.all([
    db
      .select({
        channels: count(liveStreams.id),
        viewers: sql<number>`coalesce(sum(${liveStreams.viewerCount}), 0)::int`
      })
      .from(liveStreams),
    db.select({ total: count(clips.id) }).from(clips),
    db
      .select({ category: clips.category, total: count(clips.id) })
      .from(clips)
      .groupBy(clips.category)
      .orderBy(desc(count(clips.id)))
      .limit(1)
  ])

  return {
    liveChannels: liveRows[0]?.channels ?? 0,
    viewersNow: formatCount(liveRows[0]?.viewers ?? 0),
    totalClips: clipRows[0]?.total ?? 0,
    busiestCategory: categoryRows[0]?.category ?? null
  }
}

export async function readDashboardOverview(user: SessionUser): Promise<DashboardOverview> {
  const handle = channelHandle(user)
  const [creator, viewer, platform] = await Promise.all([
    readCreatorOverview(handle),
    readViewerActivity(user.id),
    readPlatformPulse()
  ])
  return { creator, viewer, platform }
}

/** Start of the window, `days` back from now. */
function windowStart(days: number): Date {
  return new Date(Date.now() - (days - 1) * 86_400_000)
}

async function selectFollowerTrend(handle: string, days: number) {
  const day = sql<string>`date_trunc('day', ${follows.createdAt})::date::text`
  return db
    .select({ day, value: count(follows.id) })
    .from(follows)
    .where(
      and(
        sql`lower(${follows.channel}) = lower(${handle})`,
        gte(follows.createdAt, windowStart(days))
      )
    )
    .groupBy(day)
}

async function selectCommentTrend(clipIds: string[], days: number) {
  if (clipIds.length === 0) return []
  const day = sql<string>`date_trunc('day', ${comments.createdAt})::date::text`
  return db
    .select({ day, value: count(comments.id) })
    .from(comments)
    .where(and(inArray(comments.clipId, clipIds), gte(comments.createdAt, windowStart(days))))
    .groupBy(day)
}

async function selectReactionTrend(clipIds: string[], days: number) {
  if (clipIds.length === 0) return []
  const day = sql<string>`date_trunc('day', ${reactions.createdAt})::date::text`
  return db
    .select({ day, value: count(reactions.id) })
    .from(reactions)
    .where(
      and(
        inArray(reactions.targetId, clipIds),
        eq(reactions.targetKind, 'clip'),
        gte(reactions.createdAt, windowStart(days))
      )
    )
    .groupBy(day)
}

/** Per-clip like and comment totals, keyed by clip id. */
async function selectClipEngagement(clipIds: string[]) {
  if (clipIds.length === 0) return { likes: new Map<string, number>(), comments: new Map<string, number>() }

  const [likeRows, commentRows] = await Promise.all([
    db
      .select({ id: reactions.targetId, total: count(reactions.id) })
      .from(reactions)
      .where(
        and(
          inArray(reactions.targetId, clipIds),
          eq(reactions.targetKind, 'clip'),
          eq(reactions.value, 'like')
        )
      )
      .groupBy(reactions.targetId),
    db
      .select({ id: comments.clipId, total: count(comments.id) })
      .from(comments)
      .where(inArray(comments.clipId, clipIds))
      .groupBy(comments.clipId)
  ])

  return {
    likes: new Map(likeRows.map((row) => [row.id, row.total])),
    comments: new Map(commentRows.map((row) => [row.id, row.total]))
  }
}

function toClipPerformance(
  row: ClipRow,
  likes: Map<string, number>,
  commentTotals: Map<string, number>
): ClipPerformance {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    views: formatCount(row.views),
    rawViews: row.views,
    likes: likes.get(row.id) ?? 0,
    comments: commentTotals.get(row.id) ?? 0,
    publishedAt: formatAge(row.createdAt)
  }
}

function toCategoryMix(rows: Array<{ category: ClipCategory; total: number }>): CategoryShare[] {
  const percents = toPercentShares(rows.map((row) => row.total))
  return rows.map((row, i) => ({
    category: row.category,
    clips: row.total,
    percent: percents[i] ?? 0
  }))
}

const EMPTY_ANALYTICS = (handle: string, range: AnalyticsRange): DashboardAnalytics => ({
  handle,
  exists: false,
  range,
  followers: toSeries('followers', 'New followers', []),
  engagement: toSeries('engagement', 'Comments + reactions', []),
  topClips: [],
  categoryMix: []
})

export async function readDashboardAnalytics(
  handle: string,
  range: AnalyticsRange
): Promise<DashboardAnalytics> {
  const clipIds = await selectChannelClipIds(handle)
  const live = await selectLiveSession(handle)
  if (clipIds.length === 0 && live === null) return EMPTY_ANALYTICS(handle, range)

  const days = rangeToDays(range)
  const [followerRows, commentRows, reactionRows, topRows, categoryRows, engagement] =
    await Promise.all([
      selectFollowerTrend(handle, days),
      selectCommentTrend(clipIds, days),
      selectReactionTrend(clipIds, days),
      clipIds.length > 0
        ? db
            .select()
            .from(clips)
            .where(inArray(clips.id, clipIds))
            .orderBy(desc(clips.views))
            .limit(10)
        : Promise.resolve([]),
      clipIds.length > 0
        ? db
            .select({ category: clips.category, total: count(clips.id) })
            .from(clips)
            .where(inArray(clips.id, clipIds))
            .groupBy(clips.category)
            .orderBy(desc(count(clips.id)))
        : Promise.resolve([]),
      selectClipEngagement(clipIds)
    ])

  return {
    handle,
    exists: true,
    range,
    followers: toSeries('followers', 'New followers', fillDailySeries(followerRows, days)),
    engagement: toSeries(
      'engagement',
      'Comments + reactions',
      addSeries(fillDailySeries(commentRows, days), fillDailySeries(reactionRows, days))
    ),
    topClips: topRows.map((row) => toClipPerformance(row, engagement.likes, engagement.comments)),
    categoryMix: toCategoryMix(categoryRows)
  }
}
