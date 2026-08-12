import type { MaybeRefOrGetter } from 'vue'
import { useAuthStore } from '@/stores/auth'

/**
 * How often a playing video writes its position back.
 *
 * Fifteen seconds is the trade between a resume point that's accurate enough
 * not to annoy (you never lose more than a quarter minute) and a write rate a
 * database can carry — one row per viewer per video per 15s, upserted in place,
 * with no history to grow.
 */
const SAVE_EVERY_SECONDS = 15

/**
 * Reports the playhead to `watch_progress`, which is what both "Continue
 * watching" and `/history` read.
 *
 * Those two want different things from the same rows, and that decides where
 * the thresholds live: **this composable records, the queries filter.** A clip
 * enters the table the moment it starts playing, because "what have I watched"
 * has to include the video you sampled for eight seconds. Keeping it out of the
 * resume rail is `selectContinueWatching`'s job — it applies the resumable
 * window (`RESUME_MIN_SECONDS`, `RESUME_MAX_FRACTION`) in SQL, so a barely
 * started clip is in your history without cluttering the rail.
 *
 * Enforcing the resume window *here* instead is what left `/history` empty for
 * viewers who had definitely watched things: nothing was written at all until
 * the playhead passed 15s, so a short visit, an abandoned HLS startup, or a
 * quick sample left no trace anywhere.
 *
 * Signed out this does nothing at all — the row is keyed to an account, so
 * there is nothing to write and no request worth making.
 *
 * Failures are swallowed, like the view counter's: a resume point is a
 * convenience, and a dead endpoint must never interrupt playback.
 */
export function useWatchProgress(slug: MaybeRefOrGetter<string>) {
  const auth = useAuthStore()
  const position = ref(0)
  /** Position at the last write — the throttle's reference point. */
  const savedAt = ref(0)
  /** Already in the table, so `start` doesn't re-post on every un-pause. */
  const recorded = ref(false)

  /**
   * The watch page keeps one `WatchView` across `/watch/a` → `/watch/b` (same
   * route, new param), so this state belongs to the slug rather than to the
   * mount — without the reset, clip B would inherit A's playhead and never be
   * recorded as started.
   */
  watch(
    () => toValue(slug),
    () => {
      position.value = 0
      savedAt.value = 0
      recorded.value = false
    }
  )

  async function send(completed: boolean) {
    const key = toValue(slug)
    if (!key) return

    savedAt.value = position.value
    recorded.value = true
    // Explicit response generic — an interpolated path left to Nuxt's typed
    // `$fetch` blows TypeScript's instantiation depth (see
    // `useContinueWatching`).
    await $fetch<{ saved: boolean }>(`/api/watch/${encodeURIComponent(key)}/progress`, {
      method: 'POST',
      body: { positionSeconds: Math.floor(position.value), completed }
    }).catch(() => {})
  }

  /**
   * Call from the player's `play`. Puts the clip in history as soon as it plays
   * instead of 15 seconds in, which is the difference between a history list
   * and a list of things you watched a while.
   *
   * `play` fires again on every un-pause, hence the `recorded` guard: the row
   * already exists by then and `track` owns keeping its position current.
   */
  function start() {
    if (!auth.isAuthenticated || recorded.value) return
    void send(false)
  }

  /**
   * Worth a write once the playhead has moved 15s from the last one. No
   * minimum-position gate — see the note above on where the resume window
   * belongs. `abs`, so scrubbing backwards saves too.
   */
  function due(): boolean {
    return Math.abs(position.value - savedAt.value) >= SAVE_EVERY_SECONDS
  }

  /** Call from the player's `time-update`. */
  function track(currentTime: number) {
    if (!auth.isAuthenticated || !Number.isFinite(currentTime)) return
    position.value = currentTime
    if (due()) void send(false)
  }

  /** Call from the player's `ended` — marks the clip finished, whatever the playhead says. */
  function finish() {
    if (!auth.isAuthenticated) return
    void send(true)
  }

  /**
   * Flush on the way out, so leaving mid-video keeps the last few seconds of
   * watching rather than the last throttled write. A same-tab route change
   * (the normal way you leave a video here) runs this reliably; a hard tab
   * close may not, and losing under 15s there is not worth a `sendBeacon`
   * path with its own serialisation rules.
   *
   * Gated on there being something new to save rather than on a minimum
   * position, so closing a page you never played writes nothing — opening a
   * video is not watching it.
   */
  tryOnScopeDispose(() => {
    if (auth.isAuthenticated && position.value > savedAt.value) void send(false)
  })

  return { start, track, finish }
}
