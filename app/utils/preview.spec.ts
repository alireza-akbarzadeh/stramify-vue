import { describe, expect, it } from 'vitest'
import { canPreviewSource, previewStartTime, PREVIEW_SECONDS } from './preview'

// Return types are annotated rather than inferred: a ternary over two string
// literals widens to `string`, which isn't assignable to `CanPlayTypeResult`.

/** Stands in for a browser with no native HLS (Chrome, Firefox). */
const noHls = (): CanPlayTypeResult => ''
/** Stands in for Safari, which answers `maybe` for HLS. */
const nativeHls = (type: string): CanPlayTypeResult =>
  type.toLowerCase().includes('mpegurl') ? 'maybe' : ''

describe('canPreviewSource', () => {
  it.each(['clip.mp4', 'clip.webm', 'clip.ogv', 'clip.mov', 'clip.m4v'])(
    'previews progressive source %s anywhere',
    (file) => {
      expect(canPreviewSource(`https://cdn.test/${file}`, noHls)).toBe(true)
    }
  )

  it('is case-insensitive about the extension', () => {
    expect(canPreviewSource('https://cdn.test/CLIP.MP4', noHls)).toBe(true)
  })

  it('ignores a query string when reading the extension', () => {
    expect(canPreviewSource('https://cdn.test/clip.mp4?token=abc&t=12', noHls)).toBe(true)
    expect(canPreviewSource('https://cdn.test/clip.mp4#t=5', noHls)).toBe(true)
  })

  // The seeded catalogue mixes mp4 and HLS, so this branch is live, not theoretical.
  it('previews HLS only where the browser plays it natively', () => {
    const url = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'

    expect(canPreviewSource(url, nativeHls)).toBe(true)
    expect(canPreviewSource(url, noHls)).toBe(false)
  })

  it('accepts the legacy x-mpegURL spelling', () => {
    const onlyLegacy = (type: string): CanPlayTypeResult =>
      type === 'application/x-mpegURL' ? 'maybe' : ''
    expect(canPreviewSource('https://cdn.test/a.m3u8', onlyLegacy)).toBe(true)
  })

  it('declines sources it cannot identify rather than guessing', () => {
    expect(canPreviewSource('https://cdn.test/stream', noHls)).toBe(false)
    expect(canPreviewSource('https://cdn.test/manifest.mpd', nativeHls)).toBe(false)
  })
})

describe('previewStartTime', () => {
  it('skips the intro rather than starting on the title card', () => {
    // 20% of 180s = 36s, inside the 45s cap.
    expect(previewStartTime(180)).toBe(36)
  })

  it('caps how far in it will skip on a long set', () => {
    // 20% of an hour would be 12 minutes — nobody wants the preview there.
    expect(previewStartTime(3600)).toBe(45)
  })

  it('starts at zero when the track is shorter than the preview window', () => {
    expect(previewStartTime(PREVIEW_SECONDS)).toBe(0)
    expect(previewStartTime(4)).toBe(0)
  })

  it('never starts so late that the window would run past the end', () => {
    const duration = 12
    const start = previewStartTime(duration)

    expect(start + PREVIEW_SECONDS).toBeLessThanOrEqual(duration)
  })

  it('treats an unknown duration as start-from-zero', () => {
    // `video.duration` is NaN until metadata loads, and Infinity on a live stream.
    expect(previewStartTime(Number.NaN)).toBe(0)
    expect(previewStartTime(Number.POSITIVE_INFINITY)).toBe(0)
    expect(previewStartTime(0)).toBe(0)
  })
})
