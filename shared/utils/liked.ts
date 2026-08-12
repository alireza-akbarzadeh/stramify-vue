/**
 * Pure helpers behind `/liked`, with no database or component in sight so both
 * sides of the wire can use them and a spec can pin them down. Sibling of
 * `shared/utils/history.ts`.
 */

import type { LikedSort } from '../types/library'

/**
 * What each order is called on screen.
 *
 * Here rather than in `LikedToolbar` because the sort button, the menu items
 * and the empty state all name the same three orders — one mapping, so a
 * rename can't leave the button saying something the menu doesn't.
 *
 * "First liked" rather than "Oldest": the page is a record of *your* likes, and
 * the useful question at that end of the list is "what did I like first", not
 * "which of these videos is old".
 */
export const LIKED_SORT_LABELS: Record<LikedSort, string> = {
  recent: 'Recently liked',
  oldest: 'First liked',
  popular: 'Most viewed'
}
