import { describe, expect, it } from 'vitest'
import { parseByteRange } from './range'

const SIZE = 1000

describe('parseByteRange', () => {
  it('serves the whole file when there is no Range header', () => {
    expect(parseByteRange(undefined, SIZE)).toBeNull()
  })

  it('reads the open-ended range every media element opens with', () => {
    // `bytes=0-` is what Chrome, Safari and Firefox all send first.
    expect(parseByteRange('bytes=0-', SIZE)).toEqual({ start: 0, end: 999, length: 1000 })
  })

  it('reads a bounded range', () => {
    expect(parseByteRange('bytes=200-499', SIZE)).toEqual({ start: 200, end: 499, length: 300 })
  })

  it('clamps an end past the last byte instead of rejecting it', () => {
    expect(parseByteRange('bytes=900-5000', SIZE)).toEqual({ start: 900, end: 999, length: 100 })
  })

  it('reads a suffix range as the last N bytes', () => {
    expect(parseByteRange('bytes=-100', SIZE)).toEqual({ start: 900, end: 999, length: 100 })
  })

  it('clamps a suffix longer than the file to the whole file', () => {
    expect(parseByteRange('bytes=-5000', SIZE)).toEqual({ start: 0, end: 999, length: 1000 })
  })

  it('rejects a start past the end of the file', () => {
    // This is the case that owes a 416 rather than a silent full body.
    expect(parseByteRange('bytes=1000-', SIZE)).toBe('unsatisfiable')
  })

  it('rejects an inverted range', () => {
    expect(parseByteRange('bytes=500-200', SIZE)).toBe('unsatisfiable')
  })

  it('rejects a zero-length suffix', () => {
    expect(parseByteRange('bytes=-0', SIZE)).toBe('unsatisfiable')
  })

  it('falls back to the whole file for a multi-range request', () => {
    // Unsupported by design — RFC 9110 §14.2 permits answering with the full
    // representation, and no media element sends one.
    expect(parseByteRange('bytes=0-99,200-299', SIZE)).toBeNull()
  })

  it('falls back to the whole file for a unit we do not speak', () => {
    expect(parseByteRange('items=0-10', SIZE)).toBeNull()
  })

  it('ignores surrounding whitespace', () => {
    expect(parseByteRange('  bytes=0-9  ', SIZE)).toEqual({ start: 0, end: 9, length: 10 })
  })
})
