import { createReadStream } from 'node:fs'
import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

/**
 * Object storage for creator uploads — one seam, one implementation (ADR-029).
 *
 * The implementation writes to the local filesystem. That is a deliberate
 * choice and not a placeholder: Cloudflare R2 is the documented target
 * (ADR-010) but its credentials are optional config, and an uploader that only
 * works once someone has a paid bucket is an uploader nobody can run. Writing
 * to disk is a *real* store — the bytes survive a restart, the media route
 * streams them with range support, and playback is genuinely playback.
 *
 * What makes it swappable is that nothing outside this file and
 * `server/api/media/[...key].get.ts` knows where the bytes are. Callers get a
 * `key` and a `url`; the day R2 is configured, `putObject`/`deleteObject`
 * become S3 calls and `url` becomes the bucket's public URL, and the upload
 * endpoint, the database and every player are untouched.
 */

/** Where objects live. Override with `UPLOAD_DIR` to point at a mounted volume. */
const ROOT = resolve(process.env.UPLOAD_DIR || join(process.cwd(), '.data/uploads'))

/**
 * The only prefixes that exist. A closed set rather than a free-form path,
 * because it is half of what makes `resolveObject` safe — a key can't name a
 * directory we didn't create.
 */
export type ObjectPrefix = 'video' | 'audio' | 'thumb'

/**
 * `video/9f1c….mp4` and nothing else.
 *
 * Every key this module hands out is built from a UUID, so the pattern is
 * exact rather than defensive: no dots to climb with, no separators beyond the
 * single one, and a bounded extension. The media route hands it arbitrary user
 * input from the URL, and this is the check that stops `../../.env` from ever
 * becoming a path (the `resolve` guard below is the second).
 */
const KEY_PATTERN = /^(video|audio|thumb)\/[0-9a-f-]{36}\.[a-z0-9]{1,5}$/

export interface StoredObject {
  key: string
  /** Where a player or an `<img>` should point. */
  url: string
  bytes: number
}

/** `video/9f1c….mp4` → `/api/media/video/9f1c….mp4`. */
export function objectUrl(key: string): string {
  return `/api/media/${key}`
}

/**
 * Write bytes and return where they went.
 *
 * The extension comes from the caller's MIME allowlist
 * (`shared/utils/studio.ts`), never from the uploaded filename — the stored
 * extension is what the media route replies with as a `Content-Type`, so
 * letting the client name it would let the client choose how its bytes are
 * later interpreted.
 */
export async function putObject(
  prefix: ObjectPrefix,
  extension: string,
  data: Buffer
): Promise<StoredObject> {
  const key = `${prefix}/${crypto.randomUUID()}.${extension}`
  const path = join(ROOT, key)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, data)
  return { key, url: objectUrl(key), bytes: data.byteLength }
}

/**
 * Delete an object by the URL stored on the row.
 *
 * Takes a URL rather than a key because that is what the database holds, and
 * because it makes the no-op case free: a seeded clip's `videoUrl` is an
 * external address, `keyFromUrl` returns null, and deleting it is correctly
 * nothing. Missing files are also a no-op — a delete that fails because the
 * bytes are already gone has achieved what it was asked to.
 */
export async function deleteObjectByUrl(url: string | null | undefined): Promise<void> {
  const key = keyFromUrl(url)
  if (!key) return
  await rm(join(ROOT, key), { force: true })
}

/** `/api/media/video/9f1c….mp4` → `video/9f1c….mp4`, or null if it isn't ours. */
export function keyFromUrl(url: string | null | undefined): string | null {
  if (!url?.startsWith('/api/media/')) return null
  const key = url.slice('/api/media/'.length)
  return KEY_PATTERN.test(key) ? key : null
}

export interface ResolvedObject {
  path: string
  size: number
  contentType: string
  open: (start?: number, end?: number) => NodeJS.ReadableStream
}

/**
 * Locate an object for reading, or `null` if the key is malformed or the file
 * isn't there — the caller turns both into the same 404, since "you asked for
 * something that isn't here" is the honest answer to either.
 *
 * The `startsWith` re-check after `resolve` is belt-and-braces over
 * `KEY_PATTERN`: the pattern already makes traversal unrepresentable, and this
 * would catch it anyway if the pattern were ever loosened.
 */
export async function resolveObject(key: string): Promise<ResolvedObject | null> {
  if (!KEY_PATTERN.test(key)) return null

  const path = resolve(ROOT, key)
  if (!path.startsWith(ROOT + '/')) return null

  const info = await stat(path).catch(() => null)
  if (!info?.isFile()) return null

  return {
    path,
    size: info.size,
    contentType: contentTypeFor(key),
    open: (start, end) => createReadStream(path, { start, end })
  }
}

/**
 * Extension → `Content-Type`. The inverse of the upload allowlist, kept here
 * rather than derived from it because this map answers a different question:
 * the allowlist decides what may come in, this decides how what's already
 * stored is served. `application/octet-stream` is unreachable while the two
 * agree, and is the right answer if they ever stop.
 */
const CONTENT_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  weba: 'audio/webm',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp'
}

function contentTypeFor(key: string): string {
  return CONTENT_TYPES[key.slice(key.lastIndexOf('.') + 1)] || 'application/octet-stream'
}
