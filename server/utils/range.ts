/**
 * A single-range `Range: bytes=…` header, parsed.
 *
 * Video seeking *is* this header: a browser asked to jump to 03:12 does not
 * re-download the file, it asks for the bytes around that point, and a server
 * that answers 200 with the whole body every time makes the scrubber unusable
 * on anything longer than a few seconds. So the media route implements it, and
 * the arithmetic lives here where it can be tested without a socket.
 *
 * Multi-range requests (`bytes=0-99,200-299`) are deliberately unsupported —
 * they require a `multipart/byteranges` body, no media element sends one, and
 * RFC 9110 §14.2 lets a server answer any range request with the full
 * representation. Returning `null` does exactly that.
 */
export interface ByteRange {
  start: number
  end: number
  /** Inclusive count — what goes in `Content-Length`. */
  length: number
}

/**
 * `null` means "serve the whole thing" (absent, malformed, or multi-range).
 * `'unsatisfiable'` means the client named a range outside the file and is
 * owed a 416 rather than a silent full body — that distinction is why this
 * doesn't just return `null` for everything it can't use.
 */
export function parseByteRange(header: string | undefined, size: number): ByteRange | null | 'unsatisfiable' {
  if (!header) return null

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match) return null

  const [, rawStart, rawEnd] = match
  if (!rawStart && !rawEnd) return null

  // `bytes=-500`: the *last* 500 bytes, not "from 0 to 500". Clamped to the
  // file so a suffix longer than the file is the whole file, per RFC 9110.
  if (!rawStart) {
    const suffix = Number(rawEnd)
    if (suffix === 0) return 'unsatisfiable'
    const start = Math.max(0, size - suffix)
    return { start, end: size - 1, length: size - start }
  }

  const start = Number(rawStart)
  if (start >= size) return 'unsatisfiable'

  // An open-ended or over-long range ends at the last byte — `bytes=0-` is what
  // every media element opens with.
  const end = rawEnd ? Math.min(Number(rawEnd), size - 1) : size - 1
  if (end < start) return 'unsatisfiable'

  return { start, end, length: end - start + 1 }
}
