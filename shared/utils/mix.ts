import type { MixSeed, MixSummary } from '../types/mix'

/**
 * A mix id is `"<seed>:<key>"` and nothing else is stored about it.
 *
 * That's the whole design: a mix is a *query*, not a row. `/mix/channel:foo`
 * re-runs the same ranked selection that built the card you clicked, so a mix
 * can never show a video that was deleted or miss one uploaded a minute ago —
 * which is exactly what a frozen `mixes` table would do.
 */
const SEPARATOR = ':'

const SEEDS: MixSeed[] = ['channel', 'category']

export function mixId(seed: MixSeed, key: string): string {
  return `${seed}${SEPARATOR}${key.toLowerCase()}`
}

/**
 * Split a mix id back into its parts, or `null` if it isn't one.
 *
 * Returns `null` rather than throwing so the route can answer 404 for a
 * hand-typed id — an unparseable id and an id for a channel that no longer
 * exists should look the same to a viewer.
 */
export function parseMixId(id: string): { seed: MixSeed; key: string } | null {
  const index = id.indexOf(SEPARATOR)
  if (index <= 0) return null

  const seed = id.slice(0, index) as MixSeed
  const key = id.slice(index + 1)
  if (!SEEDS.includes(seed) || !key) return null

  return { seed, key }
}

/**
 * What a mix is called. The channel's own casing is used for a channel mix
 * (the id is lowercased for lookup, the label shouldn't be), and the category's
 * display name for a category mix.
 */
export function mixTitle(seed: MixSeed, label: string): string {
  return `${label} mix`
}

/**
 * The line under the title — why this mix is on your screen.
 *
 * `followed` distinguishes the two reasons a channel mix appears: because you
 * subscribe to it, or because you kept watching it. Saying "because you follow"
 * to someone who doesn't would be a small lie the UI has no need to tell.
 */
export function mixSubtitle(seed: MixSeed, label: string, followed: boolean): string {
  if (seed === 'category') return `Top in ${label} right now`
  return followed ? `Because you follow ${label}` : `Because you watched ${label}`
}

/** How many cover thumbnails a mix card stacks. */
export const MIX_COVER_COUNT = 3

/** Where a mix card points. */
export function mixHref(mix: MixSummary): string {
  return `/mix/${encodeURIComponent(mix.id)}`
}
