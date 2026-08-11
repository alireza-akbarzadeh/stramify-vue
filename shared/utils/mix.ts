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
export function mixTitle(label: string): string {
  return `${label} mix`
}

/**
 * Why a channel mix was seeded — which is also what its subtitle claims.
 *
 * `popular` is the one that matters: a signed-out viewer, or a signed-in one
 * with no history, still gets channel mixes (seeded by reach), and telling them
 * "because you watched" would be a claim about them that isn't true.
 */
export type MixReason = 'followed' | 'watched' | 'popular'

/** Which claim a channel's numbers actually support. */
export function mixReason(followed: boolean, watched: number): MixReason {
  if (followed) return 'followed'
  return watched > 0 ? 'watched' : 'popular'
}

/**
 * The line under the title — why this mix is on your screen.
 *
 * Each branch states only what the data behind it supports (CLAUDE.md rule 2).
 * A category mix never personalises: the ordering of category seeds leans on
 * your history, but any given category's *contents* are ranked by reach, and
 * "top in Gaming" is the honest description of that.
 */
export function mixSubtitle(seed: MixSeed, label: string, reason: MixReason): string {
  if (seed === 'category') return `Top in ${label} right now`
  if (reason === 'followed') return `Because you follow ${label}`
  if (reason === 'watched') return `Because you watched ${label}`
  return `Popular from ${label}`
}

/** How many cover thumbnails a mix card stacks. */
export const MIX_COVER_COUNT = 3

/** Where a mix card points. */
export function mixHref(mix: MixSummary): string {
  return `/mix/${encodeURIComponent(mix.id)}`
}
