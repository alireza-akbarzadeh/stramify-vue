import { parseByteRange } from '../../utils/range'
import { resolveObject } from '../../utils/storage'

/**
 * Serves creator uploads out of object storage (ADR-031).
 *
 * Public and unauthenticated, on purpose. The URL is a UUID with no
 * enumerable structure, and it is the same URL that ends up in a `<video>`
 * tag, an `<img>` and a shared link — gating it on a session would break the
 * unlisted-link case and buy nothing, since anyone who can see the page can
 * see the URL. Whether a *clip* is reachable is decided where clips are
 * queried, not here.
 *
 * Range support is the reason this is a handwritten route rather than a static
 * mount: without it a scrub to the middle of a 400MB video downloads the first
 * 400MB. See `server/utils/range.ts`.
 */
export default defineEventHandler(async (event) => {
  const key = (getRouterParam(event, 'key') || '').replace(/^\/+/, '')
  const object = await resolveObject(key)
  if (!object) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  setResponseHeaders(event, {
    'Content-Type': object.contentType,
    // Without this the browser never sends a `Range` at all and seeking is
    // dead regardless of what this handler can do.
    'Accept-Ranges': 'bytes',
    // The key is a UUID and the bytes behind it never change, so the object is
    // immutable by construction — an edit uploads a new key rather than
    // rewriting this one.
    'Cache-Control': 'public, max-age=31536000, immutable',
    // These are files a stranger uploaded. Telling the browser to honour the
    // declared type rather than sniff its way to something executable is the
    // whole defence against a disguised upload.
    'X-Content-Type-Options': 'nosniff'
  })

  const range = parseByteRange(getRequestHeader(event, 'range'), object.size)

  if (range === 'unsatisfiable') {
    setResponseHeader(event, 'Content-Range', `bytes */${object.size}`)
    throw createError({ statusCode: 416, statusMessage: 'Range not satisfiable' })
  }

  if (!range) {
    setResponseHeader(event, 'Content-Length', object.size)
    return sendStream(event, object.open())
  }

  setResponseStatus(event, 206)
  setResponseHeaders(event, {
    'Content-Range': `bytes ${range.start}-${range.end}/${object.size}`,
    'Content-Length': range.length
  })
  return sendStream(event, object.open(range.start, range.end))
})
