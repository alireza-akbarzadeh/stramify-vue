import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { CLIP_CATEGORIES } from '#shared/utils/category'
import { STUDIO_DESCRIPTION_MAX, STUDIO_TITLE_MAX } from '#shared/types/studio'

/**
 * The one description of a valid video, for both forms that edit one — the
 * upload wizard's details step and the edit page.
 *
 * It mirrors the server's schemas in `server/api/studio/uploads.post.ts` and
 * `[id].patch.ts` rather than replacing them: this one exists to tell the
 * creator what's wrong *while they type*, and the server's exists because the
 * browser's opinion is not a control (CLAUDE.md §5). The limits both read from
 * the same constants, so the two can't drift on the numbers — which is the
 * part that would actually confuse someone.
 *
 * The messages are deliberately full sentences that say how to fix the
 * problem, not "Invalid" (UX: `error-clarity`).
 */
export const studioDetailsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Give your video a title.')
    .max(STUDIO_TITLE_MAX, `Keep the title under ${STUDIO_TITLE_MAX} characters.`),
  /**
   * Deliberately **not** `.default('')`, however natural that reads here.
   *
   * `@vee-validate/zod@4.15.1` walks the schema for defaults and calls
   * `_def.defaultValue()` as a function; in zod 4 (which this project pins,
   * ADR-025's lockfile) that property is a plain value, so a single `.default()`
   * anywhere in this object throws `value._def.defaultValue is not a function`
   * from inside `useForm` — taking down the upload wizard and the edit page on
   * mount, before either renders. Empty is supplied through `initialValues` at
   * both call sites instead, which is where the rest of the starting state
   * already lives.
   */
  description: z
    .string()
    .trim()
    .max(STUDIO_DESCRIPTION_MAX, `Descriptions are limited to ${STUDIO_DESCRIPTION_MAX} characters.`),
  category: z.enum(CLIP_CATEGORIES),
  visibility: z.enum(['private', 'unlisted', 'public'])
})

export type StudioDetails = z.infer<typeof studioDetailsSchema>

/** The `validationSchema` both forms hand to `useForm`. */
export const studioDetailsValidation = toTypedSchema(studioDetailsSchema)
