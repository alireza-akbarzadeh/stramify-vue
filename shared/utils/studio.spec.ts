import { describe, expect, it } from 'vitest'
import {
  IMAGE_RULE,
  MAX_VIDEO_BYTES,
  categoryForKind,
  formatBytes,
  mediaRuleFor,
  rejectMediaFile,
  toClipSlug
} from './studio'

const file = (overrides: Partial<{ type: string; size: number; name: string }> = {}) => ({
  type: 'video/mp4',
  size: 1024,
  name: 'clip.mp4',
  ...overrides
})

describe('formatBytes', () => {
  it('leaves sub-kilobyte sizes in bytes', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('keeps one decimal below ten', () => {
    expect(formatBytes(1536)).toBe('1.5 KB')
  })

  it('drops a trailing .0', () => {
    expect(formatBytes(2048)).toBe('2 KB')
  })

  it('rounds to whole units above ten', () => {
    expect(formatBytes(512 * 1024 * 1024)).toBe('512 MB')
  })

  it('stops at gigabytes rather than inventing a unit', () => {
    expect(formatBytes(3 * 1024 ** 3)).toBe('3 GB')
  })
})

describe('rejectMediaFile', () => {
  const videoRule = mediaRuleFor('video')

  it('accepts a file inside the rules', () => {
    expect(rejectMediaFile(file(), videoRule)).toBeNull()
  })

  it('rejects a format the rule does not list', () => {
    const message = rejectMediaFile(file({ type: 'video/x-msvideo', name: 'clip.avi' }), videoRule)
    expect(message).toContain('.avi')
    // Says what *is* accepted, not just that this isn't.
    expect(message).toContain('MP4')
  })

  it('falls back to the extension when the browser reports no MIME type', () => {
    // Safari hands over an empty `type` for some containers on drag-and-drop.
    expect(rejectMediaFile(file({ type: '' }), videoRule)).toBeNull()
  })

  it('names both the file size and the limit when it is too large', () => {
    const message = rejectMediaFile(file({ size: MAX_VIDEO_BYTES + 1 }), videoRule)
    expect(message).toContain('512 MB')
  })

  it('rejects an empty file', () => {
    expect(rejectMediaFile(file({ size: 0 }), videoRule)).toBe('That file is empty.')
  })

  it('holds audio to the audio rule, not the video one', () => {
    const audioRule = mediaRuleFor('music')
    expect(rejectMediaFile(file({ type: 'audio/mpeg', name: 'track.mp3' }), audioRule)).toBeNull()
    expect(rejectMediaFile(file({ type: 'video/mp4' }), audioRule)).toContain('supported')
  })

  it('rejects a video handed to the image rule', () => {
    expect(rejectMediaFile(file(), IMAGE_RULE)).toContain('supported')
  })
})

describe('categoryForKind', () => {
  it('forces music uploads into the Music category', () => {
    // `/music` is assembled from `category = 'Music'`, so anything else would
    // silently undo the choice the creator already made.
    expect(categoryForKind('music', 'Gaming')).toBe('Music')
  })

  it('leaves a video upload on the chosen category', () => {
    expect(categoryForKind('video', 'Gaming')).toBe('Gaming')
  })
})

describe('toClipSlug', () => {
  it('builds a readable url segment from the title', () => {
    expect(toClipSlug('Midnight Echo', 'a1b2c3')).toBe('midnight-echo-a1b2c3')
  })

  it('collapses punctuation and repeated separators', () => {
    expect(toClipSlug('Stream  highlights!! (part 2)', 'x1')).toBe('stream-highlights-part-2-x1')
  })

  it('never leaves a trailing separator before the suffix', () => {
    expect(toClipSlug('Ready?', 'x1')).toBe('ready-x1')
  })

  it('falls back for a title with no ascii in it', () => {
    // A Persian or Japanese title still has to produce a working URL.
    expect(toClipSlug('میان‌بر', 'x1')).toBe('video-x1')
  })

  it('caps the readable part so the url stays a url', () => {
    const slug = toClipSlug('a'.repeat(200), 'x1')
    expect(slug).toBe(`${'a'.repeat(60)}-x1`)
  })
})
