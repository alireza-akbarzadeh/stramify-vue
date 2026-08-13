import { selectMusicPage } from '../../utils/music'
import { getSessionUser } from '../../utils/session'
import type { MusicPage } from '#shared/types/music'

/**
 * Everything `/music` renders, in one request.
 *
 * One endpoint rather than one per shelf: every shelf is an ordering of the
 * same `Music` rows (see `selectMusicPage`), so splitting them would fan one
 * query out into four requests that each re-read the same slice — and the page
 * can't lay out its hero until the first of them lands anyway.
 *
 * Reads without a session, like `/api/home/mixes`: signed out you get the same
 * page minus the follows shelf, so `/music` opens for a first-time visitor
 * instead of gating a browse surface behind an account.
 */
export default defineEventHandler(async (event): Promise<MusicPage> => {
  const user = await getSessionUser(event)
  return await selectMusicPage(user?.id ?? null)
})
