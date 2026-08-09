import type { CategorySummary } from '../types/discovery'
import type { HomeChip, HomeReason } from '../types/home'

/** The chip that means "no filter". Its id is also the initial state of the bar. */
export const ALL_CHIP: HomeChip = { id: 'all', label: 'All', category: null, live: false }

/** Live sessions only, across every category. */
export const LIVE_CHIP: HomeChip = { id: 'live', label: 'Live', category: null, live: true }

/**
 * The filter bar above the home feed: All, Live, then one chip per category
 * that actually has something in it.
 *
 * The category chips come from `/api/discovery/categories`, which only returns
 * categories with clips — so the bar can't offer a filter that lands on an
 * empty grid. It's derived rather than hard-coded off the enum for that reason.
 */
export function buildHomeChips(categories: CategorySummary[]): HomeChip[] {
  return [
    ALL_CHIP,
    LIVE_CHIP,
    ...categories.map((category) => ({
      id: category.slug,
      label: category.name,
      category: category.slug,
      live: false
    }))
  ]
}

/** The chip with this id, falling back to "All" for an id that no longer exists. */
export function findHomeChip(chips: HomeChip[], id: string): HomeChip {
  return chips.find((chip) => chip.id === id) ?? ALL_CHIP
}

/**
 * DOM id of a chip's tab button.
 *
 * Shared so the two halves of the tab relationship agree without passing ids
 * around: the chip sets it, and the grid it filters points back at the active
 * one with `aria-labelledby`.
 */
export function chipDomId(chipId: string): string {
  return `home-chip-${chipId}`
}

/**
 * What the empty state calls the current filter. "All" is the label on a chip,
 * not a name for a place — "Nothing in All yet" reads like a bug.
 */
export function homeFilterLabel(chip: HomeChip): string {
  return chip.id === ALL_CHIP.id ? 'your feed' : chip.label
}

/**
 * The one-line explanation under a recommended card.
 *
 * Kept out of SQL and off the wire so the copy can change without a migration
 * or a version skew between a cached response and the client rendering it.
 */
export function homeReasonLabel(reason: HomeReason, channel: string): string {
  if (reason === 'following') return `Because you follow ${channel}`
  if (reason === 'live') return 'Live now'
  return 'New upload'
}
