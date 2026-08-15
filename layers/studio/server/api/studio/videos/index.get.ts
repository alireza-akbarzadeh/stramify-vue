import { listStudioVideos } from '~~/server/utils/studio'
import { requireUser } from '~~/server/utils/session'
import type { StudioVideo } from '#shared/types/studio'

/**
 * Everything the signed-in account has uploaded.
 *
 * Unpaginated, and that is a considered limit rather than an oversight: the
 * content table filters and sorts client-side so the creator can flip between
 * views without a round trip, which only works while the whole list is in
 * hand. The seam when it stops working is a cursor here plus server-side
 * sorting — the same shape `/shorts` already uses.
 */
export default defineEventHandler(async (event): Promise<StudioVideo[]> => {
  const user = await requireUser(event)
  return listStudioVideos(user.id)
})
