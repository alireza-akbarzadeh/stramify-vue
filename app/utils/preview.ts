/**
 * Which sources a bare `<video>` can preview, and where in one to start.
 *
 * Split out from `useHoverPreview` because these are the only two decisions in
 * the preview that are pure — everything else in that composable is timers and
 * element state, which is exactly the split that makes this half testable.
 */

/** How long a hover preview runs before it fades back to the still. */
export const PREVIEW_SECONDS = 9

/**
 * How far into a track a preview starts, as a fraction of its length.
 *
 * Not zero: a set opens on a title card, a dark stage, or a crowd shot, and a
 * preview that starts there shows nothing that distinguishes one track from
 * another — which is the entire job of a preview.
 */
const PREVIEW_START_FRACTION = 0.2

/** Never skip further in than this, however long the track is. */
const PREVIEW_MAX_START_SECONDS = 45

/**
 * Can a plain `<video>` play this, with no media-source shim?
 *
 * Progressive files (mp4/webm/ogv) always. HLS only where the browser has it
 * natively — Safari does, Chrome and Firefox do not, and there is no bundled
 * standalone `hls.js` in this project (Vidstack ships its own loader, but
 * pulling a full player into a hover affordance would cost more than the
 * affordance is worth). So on Chrome an HLS-sourced card simply doesn't
 * preview: it keeps its still and its hover lift, and nothing looks broken.
 *
 * `canPlayType` is injected rather than read off a fresh element so this stays
 * a pure function — the composable passes the real element's method.
 */
export function canPreviewSource(
  url: string,
  canPlayType: (type: string) => CanPlayTypeResult
): boolean {
  const path = stripQuery(url).toLowerCase()

  if (/\.(mp4|m4v|webm|ogv|ogg|mov)$/.test(path)) return true

  if (/\.m3u8$/.test(path)) {
    // Both spellings: `application/vnd.apple.mpegurl` is the registered type,
    // `application/x-mpegURL` is what older Safari answers to. Either
    // non-empty answer ("maybe"/"probably") means native HLS.
    return (
      canPlayType('application/vnd.apple.mpegurl') !== '' ||
      canPlayType('application/x-mpegURL') !== ''
    )
  }

  // An extensionless or unknown source might still play, but a hover preview is
  // the wrong place to find out — a failed load costs a request and a stalled
  // element for no visible gain.
  return false
}

/**
 * Where to seek before playing, given the loaded duration.
 *
 * Guards the short-clip case: on a 20s clip, 20% in is 4s and a 9s window
 * still fits, but on anything shorter than the window itself the only correct
 * answer is 0 — seeking would just play the tail and cut off.
 */
export function previewStartTime(durationSeconds: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= PREVIEW_SECONDS) return 0

  const target = Math.min(durationSeconds * PREVIEW_START_FRACTION, PREVIEW_MAX_START_SECONDS)

  // Never start so late that the window runs past the end.
  return Math.max(0, Math.min(target, durationSeconds - PREVIEW_SECONDS))
}

function stripQuery(url: string): string {
  const cut = url.search(/[?#]/)
  return cut === -1 ? url : url.slice(0, cut)
}
