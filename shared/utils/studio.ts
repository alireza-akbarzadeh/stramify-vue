import type { ClipCategory } from '../types/discovery'
import type { ClipVisibility, StudioMediaKind } from '../types/studio'

/**
 * What Creator Studio will accept, stated once for both sides of the wire.
 *
 * The browser checks these to fail a bad file in the dropzone instead of after
 * a 400MB upload; the server checks the same table again because a client-side
 * check is a courtesy, not a control (CLAUDE.md §5). Two copies of the rule
 * would drift, and the drift would show up as an upload that the picker
 * accepted and the API rejected.
 */

/**
 * MIME type → the extension we store the object under.
 *
 * A fixed map rather than trusting the filename: the extension we write is the
 * one the media route later serves as a `Content-Type`, so it has to come from
 * something we recognise. An unlisted type is a rejection, not a guess.
 */
export const VIDEO_TYPES: Readonly<Record<string, string>> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov'
}

export const AUDIO_TYPES: Readonly<Record<string, string>> = {
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'weba'
}

export const IMAGE_TYPES: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
}

/**
 * Ceilings, not targets. Generous enough that a real 4K clip or a lossless
 * master gets through, low enough that one request can't fill the disk — the
 * upload is buffered in memory before it is written (see
 * `server/utils/storage.ts`), so this doubles as the memory bound per request.
 */
export const MAX_VIDEO_BYTES = 512 * 1024 * 1024
export const MAX_AUDIO_BYTES = 64 * 1024 * 1024
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024

/** Longest duration we'll record, and the clamp on the browser's claim. 6 hours. */
export const MAX_DURATION_SECONDS = 6 * 60 * 60

export interface MediaRule {
  /** MIME → extension, for the kind being uploaded. */
  types: Readonly<Record<string, string>>
  maxBytes: number
  /** Ready for an `<input accept>`. */
  accept: string
  /** How the rule reads in the dropzone, e.g. `"MP4, WebM or MOV · up to 512 MB"`. */
  hint: string
}

export function mediaRuleFor(kind: StudioMediaKind): MediaRule {
  return kind === 'music'
    ? { types: AUDIO_TYPES, maxBytes: MAX_AUDIO_BYTES, accept: acceptFor(AUDIO_TYPES), hint: hint(AUDIO_TYPES, MAX_AUDIO_BYTES) }
    : { types: VIDEO_TYPES, maxBytes: MAX_VIDEO_BYTES, accept: acceptFor(VIDEO_TYPES), hint: hint(VIDEO_TYPES, MAX_VIDEO_BYTES) }
}

export const IMAGE_RULE: MediaRule = {
  types: IMAGE_TYPES,
  maxBytes: MAX_IMAGE_BYTES,
  accept: acceptFor(IMAGE_TYPES),
  hint: hint(IMAGE_TYPES, MAX_IMAGE_BYTES)
}

/**
 * Why this file can't be uploaded, or `null` if it can.
 *
 * Returns the sentence the UI shows rather than an error code, because there
 * is exactly one place it is displayed and the code would only ever be mapped
 * straight back to this string. Both failures name the limit and the file's
 * own numbers — "Too large" alone leaves the creator guessing by how much
 * (UX: `error-clarity`).
 */
export function rejectMediaFile(
  file: { type: string; size: number; name: string },
  rule: MediaRule
): string | null {
  if (!rule.types[file.type]) {
    // Falls back to the extension for the browsers that hand over an empty
    // `type` on a drag-and-drop (Safari does this for some containers).
    const guessed = extensionOf(file.name)
    const known = Object.values(rule.types).includes(guessed)
    if (!known) return `${describeType(file)} isn't a supported format. Use ${rule.hint.split(' · ')[0]}.`
  }
  if (file.size > rule.maxBytes) {
    return `That file is ${formatBytes(file.size)} — the limit is ${formatBytes(rule.maxBytes)}.`
  }
  if (file.size === 0) return 'That file is empty.'
  return null
}

/** `1536` → `"1.5 KB"`, `512 * 1024 ** 2` → `"512 MB"`. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  // One decimal below 10 (`1.5 MB` is useful), none above (`512 MB` is enough).
  return `${value < 10 ? value.toFixed(1).replace(/\.0$/, '') : Math.round(value)} ${units[unit]}`
}

/**
 * The category a kind implies, and the only one `music` can produce — a track
 * filed under Gaming would never reach `/music`, which is the whole reason the
 * creator picked "Music or podcast" on the first screen.
 */
export function categoryForKind(kind: StudioMediaKind, chosen: ClipCategory): ClipCategory {
  return kind === 'music' ? 'Music' : chosen
}

/** Label and one-line consequence for each visibility, used by the picker and the badges. */
export const VISIBILITY_COPY: Readonly<
  Record<ClipVisibility, { label: string; detail: string }>
> = {
  private: { label: 'Private', detail: 'Only you can see it. Nothing is published.' },
  unlisted: { label: 'Unlisted', detail: "Anyone with the link can watch. It won't appear in search or browse." },
  public: { label: 'Public', detail: 'Everyone can find it — search, your channel and the feeds.' }
}

/**
 * Title → the clip id, which is also the `/watch/<id>` URL segment.
 *
 * Readable rather than a bare UUID because this string is the shareable
 * address of the video, and `/watch/midnight-echo-a1b2c3` survives being
 * pasted into a chat window in a way `/watch/9f1c…` doesn't. The suffix is
 * what makes it unique — two videos called "Stream highlights" are ordinary,
 * and neither creator should get an error about it.
 *
 * Non-ASCII titles collapse to nothing, hence the fallback: a Persian or
 * Japanese title still gets a working URL instead of one starting with `-`.
 */
export function toClipSlug(title: string, suffix: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')

  return `${base || 'video'}-${suffix}`
}

function acceptFor(types: Readonly<Record<string, string>>): string {
  return Object.keys(types).join(',')
}

function hint(types: Readonly<Record<string, string>>, maxBytes: number): string {
  const names = Object.values(types).map((ext) => ext.toUpperCase())
  const last = names.pop()
  return `${names.join(', ')} or ${last} · up to ${formatBytes(maxBytes)}`
}

function extensionOf(name: string): string {
  return name.slice(name.lastIndexOf('.') + 1).toLowerCase()
}

function describeType(file: { type: string; name: string }): string {
  const ext = extensionOf(file.name)
  return ext && ext !== file.name.toLowerCase() ? `.${ext}` : file.type || 'That file'
}
