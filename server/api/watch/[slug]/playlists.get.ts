import { z } from 'zod'
import { selectMemberships } from '../../../utils/playlists'
import { getSessionUser } from '../../../utils/session'
import { resolveWatchTarget } from '../../../utils/watch'
import type { PlaylistMembership } from '#shared/types/library'

const paramsSchema = z.object({ slug: z.string().min(1).max(200) })

/**
 * "Which of my playlists is this video already in?" — the checkbox state
 * behind the watch page's Save-to-playlist menu.
 *
 * It hangs off the watch slug rather than living under `/api/playlists`
 * because that's the question being asked: the caller has a slug, not a clip
 * id, and resolving it here keeps the client from needing to know that a
 * `/watch` slug and a `clips.id` happen to coincide.
 *
 * `[]` for a live stream — playlists hold clips, not sessions (see
 * `playlist_items`) — and `[]` signed out, so the menu can render a sign-in
 * prompt without treating an empty list as an error.
 */
export default defineEventHandler(async (event): Promise<PlaylistMembership[]> => {
  const parsed = paramsSchema.safeParse({ slug: getRouterParam(event, 'slug') })
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid watch slug' })
  }

  const user = await getSessionUser(event)
  if (!user) return []

  const resolved = await resolveWatchTarget(parsed.data.slug)
  if (!resolved || resolved.kind !== 'clip') return []

  return await selectMemberships(user.id, resolved.row.id)
})
