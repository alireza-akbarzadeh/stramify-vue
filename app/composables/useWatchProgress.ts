import type { MaybeRefOrGetter } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { RESUME_MIN_SECONDS } from '#shared/utils/library'

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
 * Reports the playhead to `watch_progress` so "Continue watching" has something
 * to offer.
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
  /** Position at the last successful write — the throttle's reference point. */
  const savedAt = ref(0)

  async function send(completed: boolean) {
    const key = toValue(slug)
    if (!key) return

    savedAt.value = position.value
    // Explicit response generic — an interpolated path left to Nuxt's typed
    // `$fetch` blows TypeScript's instantiation depth (see
    // `useContinueWatching`).
    await $fetch<{ saved: boolean }>(`/api/watch/${encodeURIComponent(key)}/progress`, {
      method: 'POST',
      body: { positionSeconds: Math.floor(position.value), completed }
    }).catch(() => {})
  }

  /** Worth a write once you're far enough in to be resumable and 15s have passed. */
  function due(): boolean {
    return (
      position.value >= RESUME_MIN_SECONDS &&
      Math.abs(position.value - savedAt.value) >= SAVE_EVERY_SECONDS
    )
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
   */
  tryOnScopeDispose(() => {
    if (auth.isAuthenticated && position.value >= RESUME_MIN_SECONDS) void send(false)
  })

  return { track, finish }
}
