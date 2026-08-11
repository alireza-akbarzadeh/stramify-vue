/**
 * A stable colour per channel, so the same person is the same colour
 * everywhere: avatar fallback, banner fallback, tab underline.
 *
 * Sum of char codes → hue. Cheap and deterministic; collisions are cosmetic
 * only. Lives here rather than inside `ChannelAvatar.vue` because the channel
 * page tints its fallback banner with the same hue as the avatar sitting on it.
 */
export function channelHue(name: string): number {
  let total = 0
  for (const char of name) total += char.charCodeAt(0)
  return total % 360
}

/** The avatar/banner fallback gradient for a channel, as a CSS value. */
export function channelGradient(name: string, lightness = 0.62): string {
  const hue = channelHue(name)
  return `linear-gradient(135deg, oklch(${lightness} 0.19 ${hue}), oklch(${lightness - 0.1} 0.21 ${(hue + 40) % 360}))`
}

/**
 * The story-circle ring for a channel with something new (`/following`).
 *
 * Conic rather than linear so it reads as a ring rather than a diagonal wash,
 * and built from the channel's own hue so the circle matches the avatar inside
 * it. The last stop repeats the first: the live variant rotates this shape, and
 * a mismatched wrap point would show as a hard seam sweeping round.
 */
export function channelRing(name: string): string {
  const hue = channelHue(name)
  const at = (offset: number) => `oklch(0.72 0.2 ${(hue + offset) % 360})`
  return `conic-gradient(from 0deg, ${at(0)}, ${at(110)}, ${at(230)}, ${at(360)})`
}

/**
 * The ring for a channel that is live. Deliberately *not* per-channel: live is
 * the one state that has to mean the same thing at a glance across the whole
 * rail, so it's one fixed gradient in the brand's accent family, in both
 * themes. Colour never carries it alone — the circle also gets a LIVE pill and
 * an accessible name saying so (`storyRingLabel`).
 */
export const LIVE_STORY_RING =
  'conic-gradient(from 0deg, oklch(0.65 0.24 15), oklch(0.78 0.18 45), oklch(0.68 0.23 350), oklch(0.65 0.24 15))'
