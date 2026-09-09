import type { RelatedItem } from '#shared/types/watch'

/** Seconds the "Up next" card counts down before it navigates. */
export const AUTOPLAY_COUNTDOWN_SECONDS = 8

/**
 * The video autoplay should advance to, or `null` to stop.
 *
 * **Clips only, deliberately.** A live stream in the rail is a different
 * commitment: it has no end, it may have started hours ago, and dropping
 * someone into one because a three-minute clip finished is not the same
 * promise as "play the next video". YouTube does not auto-advance into a
 * livestream either.
 *
 * The current video is excluded by id rather than trusted to be absent —
 * `related.get.ts` filters it out today, but an autoplay loop that quietly
 * replays the same clip forever is a bad enough failure to be worth one check
 * here as well.
 */
export function pickAutoplayNext(items: RelatedItem[], currentId: string): RelatedItem | null {
  return items.find((item) => item.kind === 'clip' && item.id !== currentId) ?? null
}

/**
 * Whether the countdown should run at all.
 *
 * A playlist is not autoplay's business: `useWatchPlaylist` already advances
 * through an explicit queue the viewer opted into, and it should win — showing
 * a "play something related in 8s" card over a playlist would offer to leave a
 * queue the viewer deliberately started.
 */
export function shouldAutoplay(options: {
  enabled: boolean
  isLive: boolean
  hasPlaylistNext: boolean
  next: RelatedItem | null
}): boolean {
  const { enabled, isLive, hasPlaylistNext, next } = options
  return enabled && !isLive && !hasPlaylistNext && !!next
}
