import type { StudioUploadFields } from '#shared/types/studio'

/**
 * The upload transport, and the only place in the app that reaches for
 * `XMLHttpRequest`.
 *
 * `$fetch` is used everywhere else and would be used here too but for one
 * thing: `fetch` cannot report *upload* progress. It exposes a readable stream
 * for the response and nothing at all for the request body, so a 400MB POST is
 * a spinner that sits at "sending…" for two minutes. XHR's `upload.onprogress`
 * is still the only way to draw a real progress bar in a browser, and a real
 * one is the difference between a creator waiting and a creator reloading the
 * page halfway through.
 */

export interface UploadRequest {
  file: File
  /** A captured video frame or a chosen cover image. Always present — see the upload endpoint. */
  thumbnail: Blob
  fields: StudioUploadFields
}

/**
 * The metadata rides as one JSON part rather than a text part per property, so
 * the server does one Zod parse of one object instead of coercing six strings.
 */
export function buildUploadForm(request: UploadRequest): FormData {
  const form = new FormData()
  form.append('fields', JSON.stringify(request.fields))
  form.append('file', request.file, request.file.name)
  // Named so the extension the server stores comes from the blob's MIME type,
  // not from whatever the source file happened to be called.
  form.append('thumbnail', request.thumbnail, 'thumbnail')
  return form
}

/** `0` when the total is unknown, so the bar starts empty rather than at NaN%. */
export function uploadPercent(loaded: number, total: number): number {
  if (!total || total < 0) return 0
  return Math.min(100, Math.round((loaded / total) * 100))
}

export interface UploadOptions {
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

/**
 * POST a form and resolve with the parsed JSON body.
 *
 * Rejects with the server's own `statusMessage` where there is one — those
 * strings are written to be read by a creator ("That file is 620 MB — the
 * limit is 512 MB"), and replacing them with "Request failed" throws away the
 * only part of the response that tells them what to do next.
 */
export function postWithProgress<T>(
  url: string,
  form: FormData,
  options: UploadOptions = {}
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.responseType = 'json'

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) options.onProgress?.(uploadPercent(event.loaded, event.total))
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as T)
        return
      }
      reject(new Error(messageFrom(xhr) || `Upload failed (${xhr.status})`))
    })

    xhr.addEventListener('error', () =>
      reject(new Error('The upload was interrupted. Check your connection and try again.'))
    )
    xhr.addEventListener('abort', () => reject(new DOMException('Upload cancelled', 'AbortError')))

    // `once` because an aborted request is finished — leaving the listener
    // attached would keep the signal holding a reference to this XHR.
    options.signal?.addEventListener('abort', () => xhr.abort(), { once: true })

    xhr.send(form)
  })
}

/**
 * Nitro serialises thrown `createError`s as `{ statusMessage, message, ... }`.
 * `responseType = 'json'` means that's already an object, except when the body
 * wasn't JSON at all — a proxy timing out, say — in which case it's null.
 */
function messageFrom(xhr: XMLHttpRequest): string {
  const body = xhr.response as { statusMessage?: string; message?: string } | null
  return body?.statusMessage || body?.message || ''
}
