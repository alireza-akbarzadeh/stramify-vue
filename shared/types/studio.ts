import type { ClipCategory, ClipOrientation } from './discovery'

/**
 * Wire shapes for Creator Studio — the upload flow and the content manager
 * (ADR-028).
 *
 * Everything here describes a row of `clips` that has an `owner_id`. There is
 * no separate uploads table: a studio upload *is* a clip, so the moment it is
 * published it already has comments, reactions, watch history, playlists and
 * a `/watch/<id>` page behind it with no extra code. What the studio adds is
 * the two columns the catalogue never needed — who owns the row, and who may
 * see it.
 */

/** Mirrors `clipVisibilityEnum`. See the note there for what each value means. */
export type ClipVisibility = 'private' | 'unlisted' | 'public'

export const CLIP_VISIBILITIES: readonly ClipVisibility[] = ['private', 'unlisted', 'public']

/**
 * What the creator says they are uploading.
 *
 * Not a database column — it resolves to a category and an accepted file type
 * on the way in and is then forgotten. `music` exists as its own choice
 * because `/music` is assembled from `clips` where `category = 'Music'`
 * (`server/utils/music.ts`), so picking it here is what puts a track on that
 * page; and because the two accept different files, which is the first thing
 * the wizard has to know.
 */
export type StudioMediaKind = 'video' | 'music'

export const STUDIO_TITLE_MAX = 100
export const STUDIO_DESCRIPTION_MAX = 5000

/** One row of the content manager. Counts are raw so the table can sort on them. */
export interface StudioVideo {
  id: string
  title: string
  /** `''` rather than null — the edit form binds straight to it. */
  description: string
  category: ClipCategory
  visibility: ClipVisibility
  orientation: ClipOrientation
  thumbnailUrl: string
  videoUrl: string
  durationSeconds: number
  views: number
  comments: number
  likes: number
  /** ISO. Formatted client-side so the table can also sort on it. */
  createdAt: string
}

/** Everything the edit form can change. Every field optional — this is a patch. */
export interface StudioVideoPatch {
  title?: string
  description?: string
  category?: ClipCategory
  visibility?: ClipVisibility
}

/** The metadata half of a multipart upload; the files travel beside it. */
export interface StudioUploadFields {
  title: string
  description: string
  category: ClipCategory
  /** Required, with no default — see the note on `clips.visibility`. */
  visibility: ClipVisibility
  kind: StudioMediaKind
  /**
   * Read off a `<video>`/`<audio>` element in the browser, because the server
   * has no media probe (no ffmpeg in the deployment target). It is therefore
   * *claimed*, not measured — clamped server-side to something sane rather
   * than trusted, since the only thing it drives is a duration label.
   */
  durationSeconds: number
  /**
   * Also measured in the browser, from the video's intrinsic dimensions. A
   * tall upload becomes a short and lands in `/shorts`; the creator never has
   * to say which, and can't get it wrong.
   */
  orientation: ClipOrientation
}
