import type { HomeVideo } from './home'

/**
 * What a mix is seeded from. The id on the wire is `"<seed>:<key>"` — e.g.
 * `channel:viper_squadron` or `category:gaming` — which makes a mix
 * *addressable without being stored*: `/mix/channel:viper_squadron` rebuilds
 * the same list from the same query, so there is no table of frozen mixes to
 * go stale the moment a channel uploads something.
 */
export type MixSeed = 'channel' | 'category'

/** One mix card on the home page. */
export interface MixSummary {
  /** `"<seed>:<key>"`. Opaque to the client — it round-trips to `/mix/[id]`. */
  id: string
  seed: MixSeed
  /** e.g. `"Viper_Squadron mix"` or `"Gaming mix"`. */
  title: string
  /** e.g. `"Because you follow Viper_Squadron"` or `"Top in Gaming right now"`. */
  subtitle: string
  /** Up to three thumbnails, highest-ranked first — the card's stacked cover. */
  covers: string[]
  /** How many videos the mix currently holds. It's a live query, so this moves. */
  count: number
}

/** A mix opened at `/mix/[id]`: its own header plus its ranked contents. */
export interface MixDetail {
  mix: MixSummary
  items: HomeVideo[]
}

/** How many mixes the home rail asks for. Three fills a row, six fills two. */
export const MIX_RAIL_LIMIT = 6

/** Cap on one mix's contents. A mix is a session's worth of watching, not a catalogue. */
export const MIX_ITEM_LIMIT = 30
