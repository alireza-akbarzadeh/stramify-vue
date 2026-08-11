import { z } from 'zod'
import { createPlaylist } from '../../utils/playlists'
import { requireUser } from '../../utils/session'
import { PLAYLIST_DESCRIPTION_MAX, PLAYLIST_TITLE_MAX } from '#shared/types/library'
import type { PlaylistSummary } from '#shared/types/library'

const bodySchema = z.object({
  // Trimmed before the length check, so a title of spaces is empty, not 40 chars.
  title: z.string().trim().min(1).max(PLAYLIST_TITLE_MAX),
  description: z.string().trim().max(PLAYLIST_DESCRIPTION_MAX).optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).optional()
})

/**
 * Create a playlist.
 *
 * Defaults to `private` (in the schema, not here) — a collection someone is
 * still building shouldn't become public because a form field was missing.
 */
export default defineEventHandler(async (event): Promise<PlaylistSummary> => {
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Give the playlist a title' })
  }

  const user = await requireUser(event)
  return await createPlaylist(user.id, parsed.data)
})
