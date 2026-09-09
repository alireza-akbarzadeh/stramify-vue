/**
 * Pre-roll advertising for the watch page.
 *
 * The shape deliberately carries `skipAfterSeconds` rather than letting the
 * client pick one: skip timing is a commercial term, not a UI preference, and
 * different creatives are sold on different ones.
 */
export interface AdBreak {
  id: string
  /** Shown as "Ad · <advertiser>" over the video. */
  advertiser: string
  title: string
  videoUrl: string
  /** Where the "Learn more" affordance goes. Absolute, and opened in a new tab. */
  clickUrl: string
  /** Creative length in seconds, used only to render the remaining-time readout. */
  durationSeconds: number
  /**
   * Seconds of playback before the skip button unlocks. `null` means
   * unskippable — a short bumper where a skip control would be theatre.
   */
  skipAfterSeconds: number | null
}

/** What `/api/watch/[slug]/ad` answers. `ad: null` covers both "entitled" and "no inventory". */
export interface AdBreakResponse {
  ad: AdBreak | null
}

/**
 * Whether the skip control should be live yet.
 *
 * Pure and shared so the countdown, the button's disabled state and the tests
 * all read the same rule — three places that would otherwise each hold their
 * own copy of an off-by-one.
 *
 * An unskippable creative (`skipAfterSeconds === null`) never unlocks, which is
 * why this is not simply `elapsed >= (skipAfterSeconds ?? 0)`.
 */
export function canSkipAd(elapsedSeconds: number, skipAfterSeconds: number | null): boolean {
  if (skipAfterSeconds === null) return false
  return elapsedSeconds >= skipAfterSeconds
}

/**
 * Whole seconds still to wait before skipping, floored at 0.
 *
 * Rounded up so the readout matches what a viewer counts: at 4.2s elapsed of a
 * 5s gate there is still "1" second to go, and showing "0" while the button is
 * inert is the kind of small lie that reads as a broken control.
 */
export function secondsUntilSkip(elapsedSeconds: number, skipAfterSeconds: number | null): number {
  if (skipAfterSeconds === null) return 0
  return Math.max(0, Math.ceil(skipAfterSeconds - elapsedSeconds))
}
