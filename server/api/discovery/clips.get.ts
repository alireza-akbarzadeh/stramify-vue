import { and, desc } from 'drizzle-orm'
import { db } from '../../db/client'
import { clips } from '../../db/schema'
import { landscapeClips, publishedClips, toClip } from '../../utils/discovery'

export default defineEventHandler(async () => {
  const rows = await db
    .select()
    .from(clips)
    .where(and(publishedClips, landscapeClips))
    .orderBy(desc(clips.createdAt))

  const featuredRow = rows.find((row) => row.featured) ?? rows[0]
  if (!featuredRow) {
    throw createError({ statusCode: 404, statusMessage: 'No clips available' })
  }

  return {
    featured: toClip(featuredRow),
    clips: rows.filter((row) => row.id !== featuredRow.id).map(toClip)
  }
})
