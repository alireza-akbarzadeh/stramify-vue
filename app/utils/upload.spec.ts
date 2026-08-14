import { describe, expect, it } from 'vitest'
import { uploadPercent } from './upload'
import { titleFromFilename } from '@/composables/useUploadWizard'

describe('uploadPercent', () => {
  it('reports whole percentages', () => {
    expect(uploadPercent(250, 1000)).toBe(25)
  })

  it('starts at zero when the total is unknown', () => {
    // A chunked request has no computable length; the bar should sit empty
    // rather than render NaN%.
    expect(uploadPercent(500, 0)).toBe(0)
  })

  it('never exceeds 100 when the transport over-reports', () => {
    expect(uploadPercent(1200, 1000)).toBe(100)
  })

  it('rounds rather than truncating', () => {
    expect(uploadPercent(996, 1000)).toBe(100)
    expect(uploadPercent(1, 1000)).toBe(0)
  })
})

describe('titleFromFilename', () => {
  it('drops the extension', () => {
    expect(titleFromFilename('midnight-echo.mp4')).toBe('midnight echo')
  })

  it('turns separators into spaces', () => {
    expect(titleFromFilename('Midnight Echo_final-v2.mp4')).toBe('Midnight Echo final v2')
  })

  it('collapses repeated whitespace', () => {
    expect(titleFromFilename('a  b   c.mov')).toBe('a b c')
  })

  it('keeps a filename that has no extension', () => {
    expect(titleFromFilename('untitled')).toBe('untitled')
  })

  it('only strips the final extension', () => {
    expect(titleFromFilename('set.2024.03.mp4')).toBe('set.2024.03')
  })
})
