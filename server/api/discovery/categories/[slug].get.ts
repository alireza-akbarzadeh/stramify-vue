import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../db/client'
import { clips } from '../../../db/schema'
import {
  emptyCategorySummary,
  landscapeClips,
  publishedClips,
  selectCategorySummaries,
  toClip
} from '../../../utils/discovery'
import { fromCategorySlug } from '#shared/utils/category'

const paramsSchema = z.object({
  slug: z.string().refine((value) => fromCategorySlug(value) !== null, 'Unknown category')
})

export default defineEventHandler(async (event) => {
  const parsed = paramsSchema.safeParse({ slug: getRouterParam(event, 'slug') })
  const category = parsed.success ? fromCategorySlug(parsed.data.slug) : null
  if (!category) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  }

  const [rows, [summary]] = await Promise.all([
    db
      .select()
      .from(clips)
      .where(and(publishedClips, eq(clips.category, category), landscapeClips))
      .orderBy(desc(clips.createdAt)),
    selectCategorySummaries(category)
  ])

  return {
    category: summary ?? emptyCategorySummary(category),
    clips: rows.map(toClip)
  }
})
