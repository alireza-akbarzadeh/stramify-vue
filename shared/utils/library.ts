/**
 * Pure helpers behind "Continue watching" and playlists — the arithmetic and
 * the copy, with no database or component in sight so both sides of the wire
 * can use them and a spec can pin them down.
 */

/**
 * Below this many seconds in, a clip isn't "started" — it's a misclick or an
 * autoplay you scrolled past. Offering it back would fill the rail with videos
 * you never chose to watch.
 */
export const RESUME_MIN_SECONDS = 15

/**
 * Within this fraction of the end, a clip counts as finished even if the
 * player never fired its `ended` event — a viewer who leaves at 97% is done,
 * and "continue watching" a video with twelve seconds left is noise.
 */
export const RESUME_MAX_FRACTION = 0.95

/** How far through, 0–100. Clamped, and `0` for a clip with no known runtime. */
export function progressPercent(positionSeconds: number, durationSeconds: number): number {
  if (durationSeconds <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((positionSeconds / durationSeconds) * 100)))
}

/**
 * Whether a saved position belongs in the rail: far enough in to be deliberate,
 * far enough from the end to be worth resuming.
 */
export function isResumable(
  positionSeconds: number,
  durationSeconds: number,
  completed: boolean
): boolean {
  if (completed || durationSeconds <= 0) return false
  return (
    positionSeconds >= RESUME_MIN_SECONDS &&
    positionSeconds < durationSeconds * RESUME_MAX_FRACTION
  )
}

/**
 * What's left, in words: `"under a minute left"`, `"4 min left"`,
 * `"1h 12m left"`.
 *
 * Rounded up rather than down, because "1 min left" on a clip with 90 seconds
 * to run reads as a broken timer once you're still watching a minute later.
 */
export function formatRemaining(positionSeconds: number, durationSeconds: number): string {
  const seconds = Math.max(0, durationSeconds - positionSeconds)
  if (seconds < 60) return 'under a minute left'

  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) return `${minutes} min left`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m left`
}

/**
 * Where the "Continue watching" card points.
 *
 * The resume position rides in the URL rather than being fetched by the watch
 * page on load. That keeps the player's start-up to zero extra round trips,
 * and it makes the behaviour inspectable and shareable — `?t=` is the same
 * deep-link convention viewers already know from YouTube.
 */
export function resumeHref(slug: string, positionSeconds: number): string {
  const path = `/watch/${encodeURIComponent(slug)}`
  return positionSeconds > 0 ? `${path}?t=${Math.floor(positionSeconds)}` : path
}

/** `"12 videos"` / `"1 video"` / `"No videos yet"` — one playlist's size, in words. */
export function playlistCountLabel(itemCount: number): string {
  if (itemCount === 0) return 'No videos yet'
  return itemCount === 1 ? '1 video' : `${itemCount} videos`
}

/**
 * Where a clip opens when it's being played *as part of* a playlist.
 *
 * `?list=` is the same deep-link convention as `?t=` above: the queue lives in
 * the URL, so it survives a refresh and a shared link puts the recipient in the
 * playlist too, rather than on one loose video.
 */
export function playlistWatchHref(slug: string, playlistId: string): string {
  const path = `/watch/${encodeURIComponent(slug)}`
  return playlistId ? `${path}?list=${encodeURIComponent(playlistId)}` : path
}

/**
 * One playlist item swapped with its neighbour — the optimistic half of a
 * reorder, and the same operation the server performs.
 *
 * Returns the array unchanged (the identical reference) when the move can't
 * happen: an unknown id, or an item already at the end it's moving towards.
 * Callers write the result straight into the query cache, so "no move" has to
 * mean "no re-render", not "a new array of the same items".
 */
export function movedPlaylistItems<T extends { id: string }>(
  items: T[],
  clipId: string,
  direction: 'up' | 'down'
): T[] {
  const from = items.findIndex((item) => item.id === clipId)
  const to = direction === 'up' ? from - 1 : from + 1
  if (from === -1 || to < 0 || to >= items.length) return items

  const next = [...items]
  next[from] = items[to]!
  next[to] = items[from]!
  return next
}
