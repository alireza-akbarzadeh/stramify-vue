import { z } from 'zod'
import { db } from '../../db/client'
import { clips } from '../../db/schema'
import { channelHandle } from '../../utils/dashboard'
import { requireUser } from '../../utils/session'
import { putObject } from '../../utils/storage'
import { toStudioVideo } from '../../utils/studio'
import { CLIP_CATEGORIES } from '#shared/utils/category'
import {
  IMAGE_RULE,
  MAX_DURATION_SECONDS,
  categoryForKind,
  mediaRuleFor,
  toClipSlug
} from '#shared/utils/studio'
import { STUDIO_DESCRIPTION_MAX, STUDIO_TITLE_MAX } from '#shared/types/studio'
import type { MediaRule } from '#shared/utils/studio'
import type { StudioVideo } from '#shared/types/studio'

/**
 * Publish an upload: store the media and the thumbnail, then insert the clip
 * row that everything else in the app already knows how to render.
 *
 * `multipart/form-data` with the metadata in a single JSON part named
 * `fields`, rather than a text part per property. One part means one Zod parse
 * of one object, and no re-deriving numbers and enums from strings that
 * multipart hands over untyped anyway.
 *
 * Nothing here trusts the browser's copy of the rules in
 * `shared/utils/studio.ts`. The dropzone checks them so a bad file fails
 * before 400MB goes over the wire; this checks them again because that is the
 * check that counts (CLAUDE.md §5).
 */

const fieldsSchema = z.object({
  title: z.string().trim().min(1).max(STUDIO_TITLE_MAX),
  description: z.string().trim().max(STUDIO_DESCRIPTION_MAX).default(''),
  category: z.enum(CLIP_CATEGORIES),
  // No `.default()` — see the note on `clips.visibility`. A missing choice is
  // a 400, never a silent publish.
  visibility: z.enum(['private', 'unlisted', 'public']),
  kind: z.enum(['video', 'music']),
  // Clamped rather than trusted: it's read off a media element in the browser,
  // and all it drives is a duration label.
  durationSeconds: z.coerce.number().int().min(0).max(MAX_DURATION_SECONDS).catch(0),
  orientation: z.enum(['landscape', 'vertical'])
})

/**
 * The ceiling on the whole request, checked against `Content-Length` before a
 * byte is buffered.
 *
 * `readMultipartFormData` materialises the entire body in memory, so without
 * this a single request decides how much RAM the process uses. The slack is
 * the multipart framing plus the JSON part — a few kilobytes, rounded up.
 */
const MAX_REQUEST_BYTES =
  mediaRuleFor('video').maxBytes + IMAGE_RULE.maxBytes + 1024 * 1024

export default defineEventHandler(async (event): Promise<StudioVideo> => {
  const user = await requireUser(event)

  const declared = Number(getRequestHeader(event, 'content-length') || 0)
  if (declared > MAX_REQUEST_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'That upload is too large' })
  }

  const parts = await readMultipartFormData(event)
  if (!parts) {
    throw createError({ statusCode: 400, statusMessage: 'Expected a file upload' })
  }

  const json = parts.find((part) => part.name === 'fields' && !part.filename)
  const fields = fieldsSchema.safeParse(safeJson(json?.data?.toString('utf8')))
  if (!fields.success) {
    throw createError({ statusCode: 400, statusMessage: 'Check the video details and try again' })
  }

  const media = takeFile(parts, 'file', mediaRuleFor(fields.data.kind))
  const thumbnail = takeFile(parts, 'thumbnail', IMAGE_RULE)

  const [stored, poster] = await Promise.all([
    putObject(
      fields.data.kind === 'music' ? 'audio' : 'video',
      media.extension,
      media.data
    ),
    putObject('thumb', thumbnail.extension, thumbnail.data)
  ])

  const [row] = await db
    .insert(clips)
    .values({
      // `crypto.randomUUID()` sliced rather than a counter: unique enough for
      // a per-title suffix, and needs no round trip to find out.
      id: toClipSlug(fields.data.title, crypto.randomUUID().slice(0, 6)),
      title: fields.data.title,
      // The channel the account publishes as — the same handle the dashboard
      // and `/channel/<handle>` already resolve them to.
      creator: channelHandle(user),
      ownerId: user.id,
      category: categoryForKind(fields.data.kind, fields.data.category),
      description: fields.data.description || null,
      visibility: fields.data.visibility,
      orientation: fields.data.orientation,
      videoUrl: stored.url,
      thumbnailUrl: poster.url,
      durationSeconds: fields.data.durationSeconds
    })
    .returning()

  // A brand-new row has no comments and no reactions, so the counts are known
  // without asking — this is the one place `toStudioVideo` is handed literals.
  return toStudioVideo({ ...row!, comments: 0, likes: 0 })
})

interface UploadedFile {
  data: Buffer
  extension: string
}

/**
 * Pull one required file part out of the request and hold it to its rule.
 *
 * Both files are required. For a video the thumbnail is a frame the wizard
 * captured off the file itself, so the creator never has to supply one; for a
 * track it's the cover art they picked. Either way something reached this
 * point, and a clip row has nowhere to put "no thumbnail" — every surface in
 * the app draws one.
 */
function takeFile(
  parts: Awaited<ReturnType<typeof readMultipartFormData>> & object,
  name: string,
  rule: MediaRule
): UploadedFile {
  const part = parts.find((candidate) => candidate.name === name && candidate.filename)
  if (!part?.data?.byteLength) {
    throw createError({ statusCode: 400, statusMessage: `Missing the ${name}` })
  }

  const extension = rule.types[part.type || '']
  if (!extension) {
    throw createError({ statusCode: 415, statusMessage: `That ${name} format isn't supported` })
  }

  if (part.data.byteLength > rule.maxBytes) {
    throw createError({ statusCode: 413, statusMessage: `That ${name} is too large` })
  }

  return { data: part.data, extension }
}

/** Malformed JSON is a 400 from the schema, not a thrown parse error. */
function safeJson(raw: string | undefined): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
