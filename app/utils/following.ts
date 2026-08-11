import { toChannelPath } from '#shared/utils/channel'
import type { ChannelNotifyMode } from '#shared/types/channel'
import type { FollowedChannel, FollowingShelf } from '#shared/types/following'

/**
 * Cache keys and the pure cache edits `/following` makes.
 *
 * They live in a plain module rather than in `composables/useFollowing.ts`
 * because `composables/useChannel.ts` has to patch these same caches — the
 * follow toggle is shared by the watch page, the directory and this page — and
 * importing them from the composable would close an import cycle between the
 * two files.
 */

/** Prefix for both `/following` queries, so one invalidate covers the page. */
export const FOLLOWING_ROOT_KEY = ['following'] as const
export const FOLLOWED_CHANNELS_KEY = ['following', 'channels'] as const
export const FOLLOWING_SHELVES_KEY = ['following', 'shelves'] as const

/**
 * Remove a channel from the followed list.
 *
 * `/following` shows exactly the channels you follow, so unfollowing one is a
 * removal rather than a button changing state — leaving the row behind with a
 * "Follow" button on it would be a list that contradicts its own heading.
 */
export function dropFollowedChannel(
  list: FollowedChannel[] | undefined,
  handle: string
): FollowedChannel[] | undefined {
  return list?.filter((channel) => channel.handle !== handle)
}

/** The same removal, applied to that channel's shelf of videos. */
export function dropFollowingShelf(
  shelves: FollowingShelf[] | undefined,
  handle: string
): FollowingShelf[] | undefined {
  return shelves?.filter((shelf) => shelf.channel.handle !== handle)
}

/** Set one channel's bell without touching the rest of the list. */
export function setFollowedNotify(
  list: FollowedChannel[] | undefined,
  handle: string,
  notify: ChannelNotifyMode
): FollowedChannel[] | undefined {
  return list?.map((channel) => (channel.handle === handle ? { ...channel, notify } : channel))
}

/**
 * What a story circle's ring is saying.
 *
 * Three states, because a ring that lights for everyone says nothing. `live` is
 * the only one that's time-critical and gets the moving ring; `new` is a static
 * coloured ring; `quiet` is a flat border. Never colour alone — the caller
 * pairs each state with a pill or an accessible label (see `storyRingLabel`).
 */
export type StoryRing = 'live' | 'new' | 'quiet'

export function storyRing(channel: FollowedChannel): StoryRing {
  if (channel.isLive) return 'live'
  return channel.hasNew ? 'new' : 'quiet'
}

/**
 * The circle's accessible name. It has to carry the ring's meaning in words —
 * the ring is decorative to a screen reader, and "new this week" is deliberately
 * not phrased as "unwatched": nothing tracks what you've already seen.
 */
export function storyRingLabel(channel: FollowedChannel): string {
  switch (storyRing(channel)) {
    case 'live':
      return `${channel.name} is live now${channel.liveTitle ? `: ${channel.liveTitle}` : ''}`
    case 'new':
      return `${channel.name}, new this week`
    default:
      return channel.name
  }
}

/**
 * Where a circle goes: straight into the broadcast when the channel is on air,
 * otherwise to their page. Tapping a live ring and landing on a profile is the
 * one thing that would make the ring feel like decoration.
 */
export function storyTarget(channel: FollowedChannel): string {
  return channel.isLive && channel.liveSlug
    ? `/watch/${encodeURIComponent(channel.liveSlug)}`
    : toChannelPath(channel.handle)
}

/** `3` → `"3 videos"`, `1` → `"1 video"`. */
export function videoCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'video' : 'videos'}`
}

/**
 * The line under the page title: `"12 channels · 2 live"`.
 *
 * The live count is only appended when it's non-zero — "· 0 live" is a fact
 * nobody came here for, and it makes the one case that matters harder to spot.
 */
export function followingSummary(channels: FollowedChannel[]): string {
  const total = `${channels.length} ${channels.length === 1 ? 'channel' : 'channels'}`
  const live = channels.filter((channel) => channel.isLive).length
  return live > 0 ? `${total} · ${live} live` : total
}
